// Authentication API functions
import request, { setToken, removeToken, getToken } from './request';

export interface LoginParams {
  userName: string;
  password: string;
}

export interface LoginResponse {
  code: number | string;
  message: string;
  result?: {
    token: string;
  };
}

export interface UserInfo {
  id: string;
  username: string;
  name: string;
  email?: string;
  role?: string;
  department?: string;
}

// Login - uses /user/login endpoint
export async function login(params: LoginParams): Promise<LoginResponse> {
  // Try primary endpoint
  let response = await request<LoginResponse>('/user/login', {
    method: 'POST',
    data: params,
  });

  // If not found, retry with /api/user/login (some deployments use /api prefix)
  if ((response.code === 404 || response.code === '404') && response.message?.includes('Not Found')) {
    response = await request<LoginResponse>('/api/user/login', {
      method: 'POST',
      data: params,
    });
  }
  
  if (response.code === 200 && response.result?.token) {
    setToken(response.result.token);
  }
  
  return response;
}

// Logout
export async function logout(): Promise<void> {
  try {
    await request('/api/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeToken();
  }
}

// Get user info
export async function getUserInfo(): Promise<{ code: number; result: UserInfo }> {
  return request('/api/getInfo', {
    method: 'GET',
  });
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  return !!getToken();
}

// Export token functions
export { getToken, setToken, removeToken };
