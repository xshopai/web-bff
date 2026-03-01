import { BaseServiceClient } from '../core/baseServiceClient';
import logger from '@/core/logger';

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  selectedColor?: string;
  selectedSize?: string;
}

interface Cart {
  userId: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  updatedAt: string;
}

interface AddItemRequest {
  productId: string;
  productName: string;
  sku?: string; // Variant SKU (e.g., WOM-CLO-TOP-001-BLACK-M) - avoids extra product-service call
  price: number;
  quantity: number;
  imageUrl?: string;
  selectedColor?: string;
  selectedSize?: string;
}

/**
 * Client for cart service operations
 * Last updated: 2025-11-19 17:15 - Force recompile
 */
class CartClient extends BaseServiceClient {
  constructor() {
    super('cart-service', 'cart-service');
  }

  /**
   * Get authenticated user's cart
   */
  async getCart(headers: Record<string, string>): Promise<Cart> {
    return this.get<Cart>('/api/v1/cart', headers);
  }

  /**
   * Add item to authenticated user's cart
   */
  async addItem(item: AddItemRequest, headers: Record<string, string>): Promise<Cart> {
    return this.post<Cart>('/api/v1/cart/items', item, headers);
  }

  /**
   * Update item quantity in authenticated user's cart
   */
  async updateItem(
    productId: string,
    quantity: number,
    headers: Record<string, string>
  ): Promise<Cart> {
    return this.put<Cart>(
      `/api/v1/cart/items/${encodeURIComponent(productId)}`,
      { quantity },
      headers
    );
  }

  /**
   * Remove item from authenticated user's cart
   */
  async removeItem(productId: string, headers: Record<string, string>): Promise<Cart> {
    return this.delete<Cart>(`/api/v1/cart/items/${encodeURIComponent(productId)}`, headers);
  }

  /**
   * Clear authenticated user's cart
   */
  async clearCart(headers: Record<string, string>): Promise<void> {
    return this.delete<void>('/api/v1/cart', headers);
  }

  /**
   * Transfer guest cart to authenticated user
   */
  async transferCart(guestId: string, headers: Record<string, string>): Promise<Cart> {
    logger.debug('[CartClient] transferCart called', { guestId, headers });
    const result = await this.post<Cart>('/api/v1/cart/transfer', { guestId }, headers);
    logger.debug('[CartClient] Transfer result', { result });
    return result;
  }

  /**
   * Get guest cart
   */
  async getGuestCart(guestId: string): Promise<Cart> {
    return this.get<Cart>(`/api/v1/guest/cart/${guestId}`);
  }

  /**
   * Add item to guest cart
   */
  async addGuestItem(guestId: string, item: AddItemRequest): Promise<Cart> {
    return this.post<Cart>(`/api/v1/guest/cart/${guestId}/items`, item);
  }

  /**
   * Update item quantity in guest cart
   */
  async updateGuestItem(guestId: string, productId: string, quantity: number): Promise<Cart> {
    return this.put<Cart>(`/api/v1/guest/cart/${guestId}/items/${encodeURIComponent(productId)}`, {
      quantity,
    });
  }

  /**
   * Remove item from guest cart
   */
  async removeGuestItem(guestId: string, productId: string): Promise<Cart> {
    return this.delete<Cart>(
      `/api/v1/guest/cart/${guestId}/items/${encodeURIComponent(productId)}`
    );
  }

  /**
   * Clear guest cart
   */
  async clearGuestCart(guestId: string): Promise<void> {
    return this.delete<void>(`/api/v1/guest/cart/${guestId}`);
  }
}

export const cartClient = new CartClient();
