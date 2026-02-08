import { DaprBaseClient } from '../core/daprBaseClient';
import config from '@/core/config';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

export interface Address {
  id: string;
  userId: string;
  type: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressRequest {
  type: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: string;
  cardLast4?: string;
  cardBrand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodRequest {
  type: string;
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  isDefault?: boolean;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: string;
}

export class UserClient extends DaprBaseClient {
  constructor() {
    super(config.services.user, 'user-service');
  }

  // Profile methods
  async getProfile(token: string): Promise<UserProfile> {
    return this.get<UserProfile>('/api/users', { Authorization: `Bearer ${token}` });
  }

  async updateProfile(data: UpdateProfileRequest, token: string): Promise<UserProfile> {
    return this.patch<UserProfile>('/api/users', data, { Authorization: `Bearer ${token}` });
  }

  async deleteAccount(token: string): Promise<void> {
    return this.delete<void>('/api/users', { Authorization: `Bearer ${token}` });
  }

  // Address methods
  async getAddresses(token: string): Promise<Address[]> {
    const response = await this.get<{ addresses: Address[] }>('/api/users/addresses', {
      Authorization: `Bearer ${token}`,
    });
    return response.addresses || [];
  }

  async createAddress(data: CreateAddressRequest, token: string): Promise<Address> {
    return this.post<Address>('/api/users/addresses', data, { Authorization: `Bearer ${token}` });
  }

  async updateAddress(
    addressId: string,
    data: Partial<CreateAddressRequest>,
    token: string
  ): Promise<Address> {
    return this.patch<Address>(`/api/users/addresses/${addressId}`, data, {
      Authorization: `Bearer ${token}`,
    });
  }

  async deleteAddress(addressId: string, token: string): Promise<void> {
    return this.delete<void>(`/api/users/addresses/${addressId}`, {
      Authorization: `Bearer ${token}`,
    });
  }

  async setDefaultAddress(addressId: string, token: string): Promise<Address> {
    return this.patch<Address>(
      `/api/users/addresses/${addressId}/default`,
      {},
      {
        Authorization: `Bearer ${token}`,
      }
    );
  }

  // Payment method methods
  async getPaymentMethods(token: string): Promise<PaymentMethod[]> {
    const response = await this.get<{ paymentMethods: PaymentMethod[] }>(
      '/api/users/paymentmethods',
      { Authorization: `Bearer ${token}` }
    );
    return response.paymentMethods || [];
  }

  async createPaymentMethod(
    data: CreatePaymentMethodRequest,
    token: string
  ): Promise<PaymentMethod> {
    return this.post<PaymentMethod>('/api/users/paymentmethods', data, {
      Authorization: `Bearer ${token}`,
    });
  }

  async updatePaymentMethod(
    paymentId: string,
    data: Partial<CreatePaymentMethodRequest>,
    token: string
  ): Promise<PaymentMethod> {
    return this.patch<PaymentMethod>(`/api/users/paymentmethods/${paymentId}`, data, {
      Authorization: `Bearer ${token}`,
    });
  }

  async deletePaymentMethod(paymentId: string, token: string): Promise<void> {
    return this.delete<void>(`/api/users/paymentmethods/${paymentId}`, {
      Authorization: `Bearer ${token}`,
    });
  }

  async setDefaultPaymentMethod(paymentId: string, token: string): Promise<PaymentMethod> {
    return this.patch<PaymentMethod>(
      `/api/users/paymentmethods/${paymentId}/default`,
      {},
      {
        Authorization: `Bearer ${token}`,
      }
    );
  }

  // Wishlist methods
  async getWishlist(token: string): Promise<WishlistItem[]> {
    const response = await this.get<{ wishlist: WishlistItem[] }>('/api/users/wishlist', {
      Authorization: `Bearer ${token}`,
    });
    return response.wishlist || [];
  }

  async addToWishlist(productId: string, token: string): Promise<WishlistItem> {
    return this.post<WishlistItem>(
      '/api/users/wishlist',
      { productId },
      {
        Authorization: `Bearer ${token}`,
      }
    );
  }

  async removeFromWishlist(wishlistId: string, token: string): Promise<void> {
    return this.delete<void>(`/api/users/wishlist/${wishlistId}`, {
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Batch get users by IDs
   * Used for enriching reviews, orders, etc. with user information
   */
  async batchGetUsers(
    userIds: string[],
    headers?: Record<string, string>
  ): Promise<{ success: boolean; data: Record<string, any> }> {
    return this.post<{ success: boolean; data: Record<string, any> }>(
      '/api/users/batch',
      { userIds },
      headers || {}
    );
  }

  /**
   * Get comprehensive dashboard statistics for users
   * This replaces multiple endpoints (getStats, getRecentUsers, getAnalytics)
   * with a single optimized call to reduce network overhead
   */
  async getDashboardStats(
    headers: Record<string, string>,
    options?: {
      includeRecent?: boolean;
      recentLimit?: number;
      analyticsPeriod?: string;
    }
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (options?.includeRecent) params.append('includeRecent', 'true');
    if (options?.recentLimit) params.append('recentLimit', options.recentLimit.toString());
    if (options?.analyticsPeriod) params.append('period', options.analyticsPeriod);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/admin/users/stats?${queryString}`
      : '/api/admin/users/stats';

    return this.get<unknown>(endpoint, headers);
  }
}

export const userClient = new UserClient();
