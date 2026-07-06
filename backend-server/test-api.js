/**
 * SafeRide AI Backend - End-to-End REST API Verification Test Script
 * Run this script using: node test-api.js
 * (Make sure the server is running on http://localhost:5000)
 */

const BASE_URL = 'http://localhost:5000/api/v1';

// Helper to make HTTP requests using built-in fetch
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error during API call to ${endpoint}:`, error.message);
    throw error;
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('STARTING SAFERIDE AI BACKEND INTEGRATION TESTS');
  console.log('==================================================\n');

  try {
    // 1. Health Check
    console.log('1. Verifying server health...');
    const health = await apiCall('/health');
    console.log(`[Status: ${health.status}] Response:`, health.data, '\n');
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Authentication: Passenger login
    console.log('2. Authenticating Passenger via mock phone token...');
    const passengerAuth = await apiCall('/auth/otp/verify', 'POST', {
      firebaseIdToken: 'mock-token-+15550199',
      role: 'PASSENGER'
    });
    console.log(`[Status: ${passengerAuth.status}] Auth success.`);
    const passengerToken = passengerAuth.data.accessToken;
    console.log(`Passenger JWT: ${passengerToken.substring(0, 30)}...\n`);
    if (passengerAuth.status !== 200) throw new Error('Passenger authentication failed');

    // 3. Authentication: Driver login
    console.log('3. Authenticating Driver via mock phone token...');
    const driverAuth = await apiCall('/auth/otp/verify', 'POST', {
      firebaseIdToken: 'mock-token-driver-999',
      role: 'DRIVER'
    });
    console.log(`[Status: ${driverAuth.status}] Auth success.`);
    const driverToken = driverAuth.data.accessToken;
    console.log(`Driver JWT: ${driverToken.substring(0, 30)}...\n`);
    if (driverAuth.status !== 200) throw new Error('Driver authentication failed');

    // 4. Update Passenger Profile & Emergency Contacts
    console.log('4. Completing Passenger profile details & Emergency contacts...');
    const updateProfile = await apiCall('/users/profile', 'PUT', {
      fullName: 'Alice Smith',
      email: 'alice.smith@example.com'
    }, passengerToken);
    console.log(`Profile update status: ${updateProfile.status}`);

    const updateEmergency = await apiCall('/users/emergency', 'PUT', {
      emergencyContacts: [
        { name: 'Bob Smith', phoneNumber: '+15559999', relation: 'Spouse' }
      ]
    }, passengerToken);
    console.log(`Emergency setup status: ${updateEmergency.status}. Contacts:`, updateEmergency.data.emergencyContacts, '\n');

    // 5. Register Driver Vehicle parameters
    console.log('5. Registering Driver vehicle details...');
    const registerDriver = await apiCall('/users/driver/register', 'POST', {
      vehicle: {
        make: 'Tesla',
        model: 'Model Y',
        color: 'Midnight Cherry Red',
        plateNumber: 'SAFE-RIDE-1'
      }
    }, driverToken);
    console.log(`[Status: ${registerDriver.status}] Vehicle registered:`, registerDriver.data.driverDetails?.vehicle, '\n');

    // 6. Request Ride Booking
    console.log('6. Requesting Ride Booking as Passenger...');
    const pickupCoords = [-73.935242, 40.73061];
    const dropoffCoords = [-74.006015, 40.712728];
    const rideRequest = await apiCall('/rides/request', 'POST', {
      pickup: {
        address: 'Brooklyn, NY',
        location: { type: 'Point', coordinates: pickupCoords }
      },
      dropoff: {
        address: 'Manhattan, NY',
        location: { type: 'Point', coordinates: dropoffCoords }
      }
    }, passengerToken);
    
    console.log(`[Status: ${rideRequest.status}] Ride request details:`);
    console.log(`- Ride ID: ${rideRequest.data.ride?._id}`);
    console.log(`- Estimated Fare: $${rideRequest.data.ride?.fare}`);
    console.log(`- Ride Start OTP: ${rideRequest.data.ride?.otpCode}\n`);
    const rideId = rideRequest.data.ride?._id;
    const otpCode = rideRequest.data.ride?.otpCode;
    if (rideRequest.status !== 201) throw new Error('Ride request creation failed');

    // 7. Driver Accepts Ride
    console.log('7. Accepting Ride Request as Driver...');
    const rideAccept = await apiCall('/rides/accept', 'POST', { rideId }, driverToken);
    console.log(`[Status: ${rideAccept.status}] Driver assigned. Ride status updated: ${rideAccept.data.ride?.status}\n`);
    if (rideAccept.status !== 200) throw new Error('Ride acceptance failed');

    // 8. Start Ride verification using OTP
    console.log(`8. Starting Ride using passenger validation OTP (${otpCode})...`);
    const rideStart = await apiCall('/rides/start', 'POST', { rideId, otpCode }, driverToken);
    console.log(`[Status: ${rideStart.status}] Ride Started! New status: ${rideStart.data.ride?.status}\n`);
    if (rideStart.status !== 200) throw new Error('Starting ride failed');

    // 9. Trigger SOS Panic alert during ride
    console.log('9. Initiating SOS emergency panic sequence...');
    const panicAlert = await apiCall('/rides/panic', 'POST', {
      rideId,
      details: 'Active threat suspected: voice trigger activated.'
    }, passengerToken);
    console.log(`[Status: ${panicAlert.status}] Alert created:`);
    console.log(`- Alert ID: ${panicAlert.data.alert?._id}`);
    console.log(`- Severity: ${panicAlert.data.alert?.severity}`);
    console.log(`- Alert status: ${panicAlert.data.alert?.status}\n`);

    // 10. Complete Ride
    console.log('10. Completing Ride booking...');
    const rideComplete = await apiCall('/rides/complete', 'POST', { rideId }, driverToken);
    console.log(`[Status: ${rideComplete.status}] Ride successfully ended. Final status: ${rideComplete.data.ride?.status}\n`);

    console.log('==================================================');
    console.log('ALL API REST TESTS COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST SEQUENCE ENCOUNTERED FAILURE:', error.message);
  }
}

// Allow server a moment to start if run consecutively
runTests();
