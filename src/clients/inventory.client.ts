import { BaseServiceClient } from '../core/baseServiceClient';
import config from '@/core/config';

export interface InventoryItem {
  sku: string;
  quantityAvailable: number;
  quantityReserved: number;
  reorderPoint: number;
  reorderQuantity: number;
  status: string;
}

export interface InventoryStats {
  productsWithStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  totalUnits: number;
  totalItems: number;
  service: string;
}

export class InventoryClient extends BaseServiceClient {
  constructor() {
    super(config.services.inventory, 'inventory-service');
  }

  async getInventory(sku: string): Promise<InventoryItem> {
    return this.get<InventoryItem>(`/api/inventory/${sku}`);
  }

  async getInventoryBatch(skus: string[]): Promise<InventoryItem[]> {
    return this.post<InventoryItem[]>('/api/inventory/batch', { skus });
  }

  async getDashboardStats(headers?: Record<string, string>): Promise<InventoryStats> {
    return this.get<InventoryStats>('/api/stats', headers);
  }
}

export const inventoryClient = new InventoryClient();
