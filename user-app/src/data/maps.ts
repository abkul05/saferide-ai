const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
}

export interface RouteInfo {
  coordinates: { latitude: number; longitude: number }[];
  encodedPolyline: string;
  distanceText: string;
  distanceValue: number; // meters
  durationText: string;
  durationValue: number; // seconds
}

/**
 * Decodes an encoded Google Maps polyline string into coordinates array
 */
export const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }

  return points;
};

/**
 * Fetches place suggestions from Google Places Autocomplete API
 */
export const getPlacesAutocomplete = async (query: string): Promise<PlacePrediction[]> => {
  if (!query.trim()) return [];
  
  if (!GOOGLE_API_KEY) {
    console.warn("Google Maps API Key is missing. Returning mock predictions.");
    // Return mock places predictions for testing
    return [
      { placeId: "mock_1", description: "Times Square, Manhattan, NY, USA", mainText: "Times Square" },
      { placeId: "mock_2", description: "Central Park, New York, NY, USA", mainText: "Central Park" },
      { placeId: "mock_3", description: "Empire State Building, New York, NY, USA", mainText: "Empire State Building" }
    ].filter(p => p.description.toLowerCase().includes(query.toLowerCase()));
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&types=geocode`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== "OK") {
      throw new Error(`Google Places Autocomplete failed: ${data.error_message || data.status}`);
    }

    return data.predictions.map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description
    }));
  } catch (error) {
    console.error("Error in getPlacesAutocomplete:", error);
    return [];
  }
};

/**
 * Resolves a Place ID into coordinates (lat/lng) via Google Place Details API
 */
export const getPlaceDetails = async (placeId: string): Promise<{ latitude: number; longitude: number; address: string } | null> => {
  if (!GOOGLE_API_KEY || placeId.startsWith("mock_")) {
    console.warn("Google Maps API Key is missing or mock triggered. Resolving mock coordinates.");
    // Resolve mock locations
    if (placeId === "mock_1") return { latitude: 40.7580, longitude: -73.9855, address: "Times Square, Manhattan, NY, USA" };
    if (placeId === "mock_2") return { latitude: 40.7850, longitude: -73.9683, address: "Central Park, New York, NY, USA" };
    if (placeId === "mock_3") return { latitude: 40.7484, longitude: -73.9857, address: "Empire State Building, New York, NY, USA" };
    return { latitude: 40.7306, longitude: -73.9352, address: "New York, NY, USA" };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Google Place Details failed: ${data.error_message || data.status}`);
    }

    const { lat, lng } = data.result.geometry.location;
    return {
      latitude: lat,
      longitude: lng,
      address: data.result.formatted_address
    };
  } catch (error) {
    console.error("Error in getPlaceDetails:", error);
    return null;
  }
};

/**
 * Calculates direction routes from Google Directions API
 */
export const getDirections = async (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<RouteInfo | null> => {
  if (!GOOGLE_API_KEY) {
    console.warn("Google Maps API Key is missing. Returning mock route.");
    
    // Create mock polyline coords (simple line with small curve)
    const coordinates: { latitude: number; longitude: number }[] = [];
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const lat = origin.latitude + (destination.latitude - origin.latitude) * fraction;
      const lng = origin.longitude + (destination.longitude - origin.longitude) * fraction;
      coordinates.push({ latitude: lat, longitude: lng });
    }

    return {
      coordinates,
      encodedPolyline: "encoded_mock_polyline_string",
      distanceText: "4.8 km",
      distanceValue: 4800,
      durationText: "12 mins",
      durationValue: 720
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Google Directions failed: ${data.error_message || data.status}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const encodedPolyline = route.overview_polyline.points;
    const coordinates = decodePolyline(encodedPolyline);

    return {
      coordinates,
      encodedPolyline,
      distanceText: leg.distance.text,
      distanceValue: leg.distance.value,
      durationText: leg.duration.text,
      durationValue: leg.duration.value
    };
  } catch (error) {
    console.error("Error in getDirections:", error);
    return null;
  }
};
