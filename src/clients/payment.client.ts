import { BaseServiceClient } from '../core/baseServiceClient';
import config from '@/core/config';

export interface Payment {
  id: string;
  paymentId: string;
  orderId: string;
  correlationId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  paymentMethod: string;
  status: string;
  providerTransactionId?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  refunds?: Refund[];
}

export interface Refund {
  id: string;
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason?: string;
  status: string;
  providerRefundId?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PaymentResult {
  isSuccess: boolean;
  paymentId?: string;
  transactionId?: string;
  status?: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface RefundResult {
  isSuccess: boolean;
  refundId?: string;
  status?: string;
  errorMessage?: string;
}

export class PaymentClient extends BaseServiceClient {
  constructor() {
    super(config.services.payment, 'payment-service');
  }

  /**
   * Get all payments with optional filtering
   */
  async getPayments(
    headers: Record<string, string>,
    params?: { customerId?: string; orderId?: string; skip?: number; take?: number }
  ): Promise<Payment[]> {
    const queryParams = new URLSearchParams();
    if (params?.customerId) queryParams.append('customerId', params.customerId);
    if (params?.orderId) queryParams.append('orderId', params.orderId);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.take !== undefined) queryParams.append('take', params.take.toString());

    const queryString = queryParams.toString();
    return this.get<Payment[]>(`/api/payments${queryString ? `?${queryString}` : ''}`, headers);
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string, headers: Record<string, string>): Promise<Payment> {
    return this.get<Payment>(`/api/payments/${paymentId}`, headers);
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string, headers: Record<string, string>): Promise<Payment> {
    return this.get<Payment>(`/api/payments/order/${orderId}`, headers);
  }

  /**
   * Process a refund
   */
  async processRefund(
    paymentId: string,
    data: { amount: number; reason?: string },
    headers: Record<string, string>
  ): Promise<RefundResult> {
    return this.post<RefundResult>(`/api/payments/${paymentId}/refund`, data, headers);
  }
}

export const paymentClient = new PaymentClient();
