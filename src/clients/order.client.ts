import { BaseServiceClient } from '../core/baseServiceClient';
import config from '@/core/config';

export interface Order {
  id: string;
  customerId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CreateOrderRequest {
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
  }[];
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class OrderClient extends BaseServiceClient {
  constructor() {
    super(config.services.order, 'order-service');
  }

  // Admin methods (call order-service admin endpoints)
  async getAllOrders(headers: Record<string, string>): Promise<Order[]> {
    return this.get<Order[]>('/api/admin/orders', headers);
  }

  async getOrdersPaged(
    headers: Record<string, string>,
    params?: Record<string, string>
  ): Promise<PagedResponse<Order>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<PagedResponse<Order>>(`/api/admin/orders/paged${queryString}`, headers);
  }

  async getAdminOrderById(orderId: string, headers: Record<string, string>): Promise<Order> {
    return this.get<Order>(`/api/admin/orders/${orderId}`, headers);
  }

  async updateOrderStatus(
    orderId: string,
    data: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<Order> {
    return this.put<Order>(`/api/admin/orders/${orderId}/status`, data, headers);
  }

  async deleteOrder(orderId: string, headers: Record<string, string>): Promise<void> {
    return this.delete<void>(`/api/admin/orders/${orderId}`, headers);
  }

  async getDashboardStats(
    headers: Record<string, string>,
    options?: { includeRecent?: boolean; recentLimit?: number }
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

  // Customer methods
  async getOrderById(orderId: string, headers: Record<string, string>): Promise<Order> {
    // Customer endpoint - customers can view their own orders
    return this.get<Order>(`/api/orders/${orderId}`, headers);
  }
  async createOrder(
    orderData: CreateOrderRequest,
    headers: Record<string, string>
  ): Promise<Order> {
    return this.post<Order>('/api/orders', orderData, headers);
  }

  async getMyOrders(customerId: string, headers: Record<string, string>): Promise<Order[]> {
    return this.get<Order[]>(`/api/orders/customer/${customerId}`, headers);
  }

  async getMyOrdersPaged(
    customerId: string,
    headers: Record<string, string>,
    params?: Record<string, string>
  ): Promise<PagedResponse<Order>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<PagedResponse<Order>>(
      `/api/orders/customer/${customerId}/paged${queryString}`,
      headers
    );
  }

  async cancelOrder(
    orderId: string,
    data: { cancellationReason: string },
    headers: Record<string, string>
  ): Promise<Order> {
    return this.post<Order>(`/api/orders/${orderId}/cancel`, data, headers);
  }

  async getOrderTracking(orderId: string, headers: Record<string, string>): Promise<TrackingInfo> {
    return this.get<TrackingInfo>(`/api/orders/${orderId}/tracking`, headers);
  }

  // Return methods (customer)
  async createReturn(
    returnData: CreateReturnRequest,
    headers: Record<string, string>
  ): Promise<ReturnResponse> {
    return this.post<ReturnResponse>('/api/returns', returnData, headers);
  }

  async getMyReturns(headers: Record<string, string>): Promise<ReturnResponse[]> {
    return this.get<ReturnResponse[]>('/api/returns/my', headers);
  }

  async getReturnById(returnId: string, headers: Record<string, string>): Promise<ReturnResponse> {
    return this.get<ReturnResponse>(`/api/returns/${returnId}`, headers);
  }

  async getReturnsByOrder(
    orderId: string,
    headers: Record<string, string>
  ): Promise<ReturnResponse[]> {
    return this.get<ReturnResponse[]>(`/api/returns/order/${orderId}`, headers);
  }

  async checkReturnEligibility(
    orderId: string,
    headers: Record<string, string>
  ): Promise<ReturnEligibility> {
    return this.get<ReturnEligibility>(`/api/returns/eligibility/${orderId}`, headers);
  }

  // Return methods (admin)
  async getAllReturns(headers: Record<string, string>): Promise<ReturnResponse[]> {
    return this.get<ReturnResponse[]>('/api/admin/returns', headers);
  }

  async getReturnsPaged(
    headers: Record<string, string>,
    params?: Record<string, string>
  ): Promise<PagedResponse<ReturnResponse>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get<PagedResponse<ReturnResponse>>(
      `/api/admin/returns/paged${queryString}`,
      headers
    );
  }

  async updateReturnStatus(
    returnId: string,
    data: UpdateReturnStatusRequest,
    headers: Record<string, string>
  ): Promise<ReturnResponse> {
    return this.put<ReturnResponse>(`/api/admin/returns/${returnId}/status`, data, headers);
  }

  async getReturnStatistics(headers: Record<string, string>): Promise<Record<string, number>> {
    return this.get<Record<string, number>>('/api/admin/returns/stats', headers);
  }
}

export interface TrackingInfo {
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedDate?: string;
  estimatedDeliveryDate?: string;
  deliveredDate?: string;
  shippingStatus: string;
  timeline: TrackingEvent[];
}

export interface TrackingEvent {
  status: string;
  description: string;
  timestamp: string;
  location?: string;
  isCompleted: boolean;
}

export interface CreateReturnRequest {
  orderId: string;
  reason: string; // ReturnReason enum value
  description: string;
  items: ReturnItemRequest[];
}

export interface ReturnItemRequest {
  orderItemId: string;
  quantityToReturn: number;
  itemCondition?: string;
}

export interface ReturnResponse {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  returnNumber: string;
  status: string; // ReturnStatus enum value
  reason: string;
  description: string;
  items: ReturnItemResponse[];
  refundAmount: number;
  shippingRefund: number;
  totalRefund: number;
  currency: string;
  returnShippingCarrier?: string;
  returnTrackingNumber?: string;
  itemsReceivedDate?: string;
  rejectionReason?: string;
  inspectionNotes?: string;
  approvedDate?: string;
  approvedBy?: string;
  completedDate?: string;
  refundProcessedDate?: string;
  processedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnItemResponse {
  id: string;
  productId: string;
  productName: string;
  quantityToReturn: number;
  unitPrice: number;
  refundAmount: number;
  productImageUrl?: string;
  itemCondition?: string;
}

export interface UpdateReturnStatusRequest {
  status: string; // ReturnStatus enum value
  notes?: string;
  rejectionReason?: string;
}

export interface ReturnEligibility {
  orderId: string;
  isEligible: boolean;
  reason: string;
}

export const orderClient = new OrderClient();
