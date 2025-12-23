// API Request utility for UI2
const BASE_URL = '/dev-api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
}

// Get token from localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// Set token to localStorage
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

// Remove token from localStorage
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

// Transform params to query string
const tansParams = (params: Record<string, any>): string => {
  let result = '';
  for (const propName of Object.keys(params)) {
    const value = params[propName];
    const part = encodeURIComponent(propName) + '=';
    if (value !== null && value !== '' && typeof value !== 'undefined') {
      if (typeof value === 'object') {
        for (const key of Object.keys(value)) {
          if (value[key] !== null && value[key] !== '' && typeof value[key] !== 'undefined') {
            const params = propName + '[' + key + ']';
            const subPart = encodeURIComponent(params) + '=';
            result += subPart + encodeURIComponent(value[key]) + '&';
          }
        }
      } else {
        result += part + encodeURIComponent(value) + '&';
      }
    }
  }
  return result;
};

// Main request function
export async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, data, headers = {} } = options;
  
  let fullUrl = `${BASE_URL}${url}`;
  
  // Add params to URL for GET requests
  if (params && method === 'GET') {
    const queryString = tansParams(params);
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString.slice(0, -1);
    }
  }
  
  // Set default headers
  const requestHeaders: Record<string, string> = {
    ...headers,
  };
  
  // Add auth token
  const token = getToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // Add content type for POST/PUT
  if (data && !(data instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json;charset=utf-8';
  }
  
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };
  
  if (data) {
    fetchOptions.body = data instanceof FormData ? data : JSON.stringify(data);
  }
  
  try {
    const response = await fetch(fullUrl, fetchOptions);

    // Try to parse JSON, but fallback to text for non-JSON responses
    let result: any;
    try {
      result = await response.json();
    } catch (e) {
      const text = await response.text();
      // Normalize Not Found to a JSON error shape
      result = {
        code: response.status,
        message: text || response.statusText || 'Request failed',
      };
    }

    // Handle HTTP errors
    if (!response.ok) {
      // Return normalized error
      return {
        code: result.code || response.status,
        message: result.message || response.statusText || 'Request failed',
      } as any;
    }

    // Handle 401 unauthorized
    if (result.code === '401' || result.code === 401) {
      removeToken();
      window.location.href = '/';
      throw new Error('Session expired, please login again');
    }

    return result;
  } catch (error) {
    console.error('Request error:', error);
    // Surface a consistent error shape
    return {
      code: 500,
      message: (error as Error).message || 'Request error',
    } as any;
  }
}

export default request;
