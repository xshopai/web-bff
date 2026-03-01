import { BaseServiceClient } from '../core/baseServiceClient';

/**
 * AdminClient handles all admin-specific operations
 * Routes all requests through admin-service, which acts as an admin gateway
 * admin-service then forwards requests to appropriate domain services
 */
export class AdminClient extends BaseServiceClient {
  constructor() {
    super('admin-service', 'admin-service');
  }

  // ============================================================================
  // User Admin Operations (admin-service → user-service)
  // ============================================================================

  async getAllUsers(headers: Record<string, string>): Promise<unknown[]> {
    return this.get<unknown[]>('/api/admin/users', headers);
  }

  async getUserById(userId: string, headers: Record<string, string>): Promise<unknown> {
    return this.get<unknown>(`/api/admin/users/${userId}`, headers);
  }

  async createUser(
    data: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<unknown> {
    return this.post<unknown>('/api/admin/users', data, headers);
  }

  async updateUser(
    userId: string,
    data: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<unknown> {
    return this.patch<unknown>(`/api/admin/users/${userId}`, data, headers);
  }

  async deleteUser(userId: string, headers: Record<string, string>): Promise<void> {
    return this.delete<void>(`/api/admin/users/${userId}`, headers);
  }

  // ============================================================================
  // Order Admin Operations (admin-service → order-service)
  // ============================================================================

  async getAllOrders(headers: Record<string, string>): Promise<unknown[]> {
    return this.get<unknown[]>('/api/admin/orders', headers);
  }

  async getOrdersPaged(
    headers: Record<string, string>,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const queryString = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.get<unknown>(`/api/admin/orders/paged${queryString}`, headers);
  }

  async getOrderById(orderId: string, headers: Record<string, string>): Promise<unknown> {
    return this.get<unknown>(`/api/admin/orders/${orderId}`, headers);
  }

  async getOrderTracking(orderId: string, headers: Record<string, string>): Promise<unknown> {
    return this.get<unknown>(`/api/admin/orders/${orderId}/tracking`, headers);
  }

  async updateOrderStatus(
    orderId: string,
    data: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<unknown> {
    return this.put<unknown>(`/api/admin/orders/${orderId}/status`, data, headers);
  }

  async deleteOrder(orderId: string, headers: Record<string, string>): Promise<void> {
    return this.delete<void>(`/api/admin/orders/${orderId}`, headers);
  }

  async getDashboardStats(
    headers: Record<string, string>,
    options?: {
      includeRecent?: boolean;
      recentLimit?: number;
    }
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (options?.includeRecent) params.append('includeRecent', 'true');
    if (options?.recentLimit) params.append('recentLimit', options.recentLimit.toString());

    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/admin/orders/stats?${queryString}`
      : '/api/admin/orders/stats';

    return this.get<unknown>(endpoint, headers);
  }

  // ============================================================================
  // Payment Admin Operations (admin-service → payment-service)
  // ============================================================================

  async getOrderPayment(orderId: string, headers: Record<string, string>): Promise<unknown> {
    return this.get<unknown>(`/api/admin/orders/${orderId}/payment`, headers);
  }

  async confirmOrderPayment(orderId: string, headers: Record<string, string>): Promise<unknown> {
    return this.post<unknown>(`/api/admin/orders/${orderId}/confirm-payment`, {}, headers);
  }

  async rejectOrderPayment(
    orderId: string,
    reason: string,
    headers: Record<string, string>
  ): Promise<unknown> {
    return this.post<unknown>(`/api/admin/orders/${orderId}/fail-payment`, { reason }, headers);
  }

  // TODO: Add more admin operations as needed:
  // - Product admin operations (admin-service → product-service)
  // - Review admin operations (admin-service → review-service)
}

export const adminClient = new AdminClient();
