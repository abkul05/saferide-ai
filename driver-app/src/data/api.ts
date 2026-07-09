import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5000/api/v1'; // Default development server endpoint

let cachedToken: string | null = null;

export const setAuthTokenInCache = async (token: string | null): Promise<void> => {
  cachedToken = token;
  if (token) {
    await AsyncStorage.setItem('driver_accessToken', token);
  } else {
    await AsyncStorage.removeItem('driver_accessToken');
  }
};

export const loadAuthTokenFromStorage = async (): Promise<string | null> => {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem('driver_accessToken');
  return cachedToken;
};

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export const apiCall = async <T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body: any = null,
  customHeaders: Record<string, string> = {}
): Promise<APIResponse<T>> => {
  const token = await loadAuthTokenFromStorage();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    config.signal = controller.signal;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    clearTimeout(timeoutId);

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'API request failed',
        status: response.status
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Request timeout' : error.message || 'Network connection failed'
    };
  }
};
