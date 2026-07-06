import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import { UserRole, RideStatus, DriverStatus } from '../constants/status';
import { Driver } from '../models/Driver';
import { Ride } from '../models/Ride';
import { safetyService } from '../services/safety.service';

interface SocketUser {
  id: string;
  phoneNumber: string;
  role: UserRole;
}

export class SocketManager {
  private io: Server | null = null;
  // Map of userId -> Set of socket IDs (to support multiple devices/connections)
  private userConnections = new Map<string, Set<string>>();

  public initialize(server: HTTPServer): void {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Authenticate socket connection via query JWT token
    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      try {
        const jwtSecret = process.env.JWT_SECRET || 'saferide_secret_jwt_access_token_sign_key_987654321';
        const decoded = jwt.verify(token, jwtSecret) as SocketUser;
        socket.data.user = decoded;
        next();
      } catch (err) {
        logger.warn(`Socket authentication failed: ${err}`);
        return next(new Error('Authentication error: Token invalid'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as SocketUser;
      logger.info(`Socket connected: User ${user.id} (${user.role}) connected on socket ${socket.id}`);

      // Register connection mapping
      if (!this.userConnections.has(user.id)) {
        this.userConnections.set(user.id, new Set());
      }
      this.userConnections.get(user.id)?.add(socket.id);

      // Join standard rooms based on role
      if (user.role === UserRole.DRIVER) {
        socket.join('drivers');
        logger.debug(`Driver ${user.id} joined 'drivers' socket room.`);
      }

      // Handle driver live location telemetry streams
      socket.on('driver:update_location', async (data: { lat: number; lng: number; rideId?: string }) => {
        try {
          const { lat, lng, rideId } = data;
          
          if (typeof lat !== 'number' || typeof lng !== 'number') {
            logger.warn(`Driver ${user.id} sent invalid location payload`);
            return;
          }

          // 1. Update live coordinates index in database
          await Driver.findOneAndUpdate(
            { userId: user.id },
            { 
              isOnline: true,
              liveLocation: {
                type: 'Point',
                coordinates: [lng, lat]
              }
            }
          );

          // 2. If actively servicing a ride, emit telemetry updates to passenger
          if (rideId) {
            // Join this socket to the ride room just in case
            socket.join(`ride_${rideId}`);

            // Broadcast location coordinate updates to the passenger room
            socket.to(`ride_${rideId}`).emit('ride:location_stream', {
              rideId,
              coordinates: [lng, lat],
            });

            // 3. AI Safety Evaluation: Check if status is IN_PROGRESS to monitor route deviation
            const ride = await Ride.findById(rideId);
            if (ride && ride.status === RideStatus.IN_PROGRESS) {
              const checkResult = await safetyService.evaluateRouteDeviation(rideId, [lng, lat]);
              
              if (checkResult.deviated && checkResult.alert) {
                // Route deviation triggered! Broadcast immediate safety alert
                this.io?.to(`ride_${rideId}`).emit('safety:route_deviation_alert', {
                  rideId,
                  alertId: checkResult.alert._id,
                  distance: checkResult.distance,
                  message: `Warning: Vehicle has deviated ${checkResult.distance.toFixed(0)}m from the planned route. Please verify your safety.`,
                });
              }
            }
          }
        } catch (error: any) {
          logger.error(`Error handling driver:update_location: ${error.message}`);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: Socket ${socket.id} closed`);
        const connections = this.userConnections.get(user.id);
        if (connections) {
          connections.delete(socket.id);
          if (connections.size === 0) {
            this.userConnections.delete(user.id);
            // If user is a driver, set availability status off or keep online. 
            // In a production app, we would wait a minute for reconnection before taking them offline.
          }
        }
      });
    });
  }

  /**
   * Sends real-time event to all sockets associated with a given userId
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const socketIds = this.userConnections.get(userId);
    if (socketIds && this.io) {
      socketIds.forEach((sid) => {
        this.io?.to(sid).emit(event, data);
      });
    }
  }

  /**
   * Broadcasts real-time events to all online drivers
   */
  public broadcastToDrivers(event: string, data: any): void {
    if (this.io) {
      this.io.to('drivers').emit(event, data);
    }
  }
}

export const socketManager = new SocketManager();
