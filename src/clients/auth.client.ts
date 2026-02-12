import { BaseServiceClient } from '../core/baseServiceClient';
import config from '@/core/config';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export class AuthClient extends BaseServiceClient {
  constructor() {
    super(config.services.auth, 'auth-service');
  }

  async login(data: LoginRequest, headers?: Record<string, string>): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/auth/login', data, headers);
  }

  async register(data: RegisterRequest, headers?: Record<string, string>): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/auth/register', data, headers);
  }

  async logout(refreshToken: string, headers?: Record<string, string>): Promise<void> {
    await this.post<void>('/api/auth/logout', { refreshToken }, headers);
  }

  async refreshToken(
    data: RefreshTokenRequest,
    headers?: Record<string, string>
  ): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/auth/token/refresh', data, headers);
  }

  async getCurrentUser(token: string, headers?: Record<string, string>): Promise<unknown> {
    const authHeaders = {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
    return this.get<unknown>('/api/auth/me', authHeaders);
  }

  async verifyToken(token: string, headers?: Record<string, string>): Promise<unknown> {
    const authHeaders = {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
    return this.get<unknown>('/api/auth/verify', authHeaders);
  }

  async verifyEmail(token: string, headers?: Record<string, string>): Promise<unknown> {
    return this.get<unknown>(`/api/auth/email/verify?token=${token}`, headers);
  }

  async resendVerificationEmail(email: string, headers?: Record<string, string>): Promise<unknown> {
    return this.post<unknown>('/api/auth/email/resend', { email }, headers);
  }

  async forgotPassword(
    data: PasswordResetRequest,
    headers?: Record<string, string>
  ): Promise<unknown> {
    return this.post<unknown>('/api/auth/password/forgot', data, headers);
  }

  async resetPassword(
    data: PasswordResetConfirmRequest,
    headers?: Record<string, string>
  ): Promise<unknown> {
    return this.post<unknown>('/api/auth/password/reset', data, headers);
  }

  async changePassword(
    data: ChangePasswordRequest,
    token: string,
    headers?: Record<string, string>
  ): Promise<unknown> {
    const authHeaders = {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
    return this.post<unknown>('/api/auth/password/change', data, authHeaders);
  }
}

export const authClient = new AuthClient();
