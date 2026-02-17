/**
 * Admin Dashboard Data Aggregator
 * Handles aggregation of data from multiple microservices for admin dashboard
 */

import logger from '../core/logger';
import { userClient } from '../clients/user.client';
import { adminClient } from '../clients/admin.client';
import { productClient } from '../clients/product.client';
import { reviewClient } from '../clients/review.client';
import { inventoryClient } from '../clients/inventory.client';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
    // Customer-specific stats (excluding admins)
    customers: number;
    newCustomersThisMonth: number;
    customerGrowth: number;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    revenue: number;
    growth: number;
  };
  products: {
    total: number;
    active: number;
  };
  inventory: {
    productsWithStock: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalInventoryValue: number;
    totalUnits: number;
    totalItems: number;
  };
  reviews: {
    total: number;
    pending: number;
    averageRating: number;
    growth: number;
  };
}

export interface RecentOrder {
  id: string;
  customer: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

// Interfaces for service response data
interface UserStatsResponse {
  total?: number;
  active?: number;
  newThisMonth?: number;
  growth?: number;
  // Customer-specific stats (excluding admins)
  customers?: number;
  newCustomersThisMonth?: number;
  customerGrowth?: number;
  recentUsers?: RecentUser[];
}

interface OrderStatsResponse {
  total?: number;
  pending?: number;
  processing?: number;
  completed?: number;
  revenue?: number;
  growth?: number;
  recentOrders?: Array<{
    id: string;
    orderNumber: string;
    customerName?: string;
    customerId?: string;
    totalAmount: number;
    status: string;
    itemCount?: number;
    createdAt: string;
  }>;
}

interface ProductStatsResponse {
  total?: number;
  active?: number;
}

interface InventoryStatsResponse {
  productsWithStock?: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  totalInventoryValue?: number;
  totalUnits?: number;
  totalItems?: number;
}

interface ReviewStatsResponse {
  data?: {
    total?: number;
    pending?: number;
    averageRating?: number;
    growth?: number;
  };
  total?: number;
  pending?: number;
  averageRating?: number;
  growth?: number;
}

export class AdminDashboardAggregator {
  /**
   * Aggregates dashboard statistics from multiple microservices
   * Now uses optimized getDashboardStats() endpoints - reduces from 10+ calls to 4 parallel calls
   * @param includeRecent - if true, fetches recent orders/users in same call (no duplicate requests)
   * @param recentLimit - number of recent items to fetch
   */
  async getDashboardStats(
    traceId: string,
    spanId: string,
    authHeaders: Record<string, string>,
    options?: { includeRecent?: boolean; recentLimit?: number }
  ): Promise<DashboardStats & { recentOrders?: RecentOrder[]; recentUsers?: RecentUser[] }> {
    // logger.info('Aggregating dashboard stats from microservices', { traceId, spanId, options });

    const headers = {
      traceparent: `00-${traceId}-${spanId}-01`,
      ...authHeaders,
    };

    const includeRecent = options?.includeRecent || false;
    const recentLimit = options?.recentLimit || 10;

    // Single optimized call per service - each returns comprehensive dashboard data
    // If includeRecent=true, this will get stats + recent data in ONE call (no duplicates)
    const [userStats, orderStats, productStats, inventoryStats, reviewStats] =
      await Promise.allSettled([
        userClient.getDashboardStats(headers, { includeRecent, recentLimit }),
        adminClient.getDashboardStats(headers, { includeRecent, recentLimit }),
        productClient.getDashboardStats(headers, { includeRecent: false }),
        inventoryClient.getDashboardStats(headers),
        reviewClient.getDashboardStats(headers, { includeRecent: false }),
      ]);

    // Log any rejected promises for debugging
    if (userStats.status === 'rejected') {
      logger.error('User stats fetch failed', {
        error: userStats.reason?.message || userStats.reason,
        stack: userStats.reason?.stack,
        traceId,
        spanId,
      });
    }
    if (orderStats.status === 'rejected') {
      logger.error('Order stats fetch failed', {
        error: orderStats.reason?.message || orderStats.reason,
        stack: orderStats.reason?.stack,
        traceId,
        spanId,
      });
    }
    if (productStats.status === 'rejected') {
      logger.error('Product stats fetch failed', {
        error: productStats.reason?.message || productStats.reason,
        stack: productStats.reason?.stack,
        traceId,
        spanId,
      });
    }
    if (inventoryStats.status === 'rejected') {
      logger.error('Inventory stats fetch failed', {
        error: inventoryStats.reason?.message || inventoryStats.reason,
        stack: inventoryStats.reason?.stack,
        traceId,
        spanId,
      });
    }
    if (reviewStats.status === 'rejected') {
      logger.error('Review stats fetch failed', {
        error: reviewStats.reason?.message || reviewStats.reason,
        stack: reviewStats.reason?.stack,
        traceId,
        spanId,
      });
    }

    try {
      // Process user stats
      const userStatsData: UserStatsResponse =
        userStats.status === 'fulfilled'
          ? (userStats.value as UserStatsResponse)
          : { total: 0, active: 0, newThisMonth: 0, growth: 0 };

      // Process order stats
      const orderStatsData: OrderStatsResponse =
        orderStats.status === 'fulfilled'
          ? (orderStats.value as OrderStatsResponse)
          : { total: 0, pending: 0, processing: 0, completed: 0, revenue: 0, growth: 0 };

      // Process product stats
      const productStatsData: ProductStatsResponse =
        productStats.status === 'fulfilled'
          ? (productStats.value as ProductStatsResponse)
          : { total: 0, active: 0 };

      // Process inventory stats
      const inventoryStatsData: InventoryStatsResponse =
        inventoryStats.status === 'fulfilled'
          ? (inventoryStats.value as InventoryStatsResponse)
          : {
              productsWithStock: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
              totalInventoryValue: 0,
              totalUnits: 0,
              totalItems: 0,
            };

      // Process review stats
      const reviewStatsRaw =
        reviewStats.status === 'fulfilled' ? (reviewStats.value as ReviewStatsResponse) : null;
      const reviewStatsData = reviewStatsRaw?.data ||
        reviewStatsRaw || {
          total: 0,
          pending: 0,
          averageRating: 0,
          growth: 0,
        };

      // Aggregate the stats from different services
      const aggregatedStats: DashboardStats & {
        recentOrders?: RecentOrder[];
        recentUsers?: RecentUser[];
      } = {
        users: {
          total: userStatsData.total || 0,
          active: userStatsData.active || 0,
          newThisMonth: userStatsData.newThisMonth || 0,
          growth: userStatsData.growth || 0,
          // Customer-specific stats (excluding admins)
          customers: userStatsData.customers || 0,
          newCustomersThisMonth: userStatsData.newCustomersThisMonth || 0,
          customerGrowth: userStatsData.customerGrowth || 0,
        },
        orders: {
          total: orderStatsData.total || 0,
          pending: orderStatsData.pending || 0,
          processing: orderStatsData.processing || 0,
          completed: orderStatsData.completed || 0,
          revenue: orderStatsData.revenue || 0,
          growth: orderStatsData.growth || 0,
        },
        products: {
          total: productStatsData.total || 0,
          active: productStatsData.active || 0,
        },
        inventory: {
          productsWithStock: inventoryStatsData.productsWithStock || 0,
          lowStockCount: inventoryStatsData.lowStockCount || 0,
          outOfStockCount: inventoryStatsData.outOfStockCount || 0,
          totalInventoryValue: inventoryStatsData.totalInventoryValue || 0,
          totalUnits: inventoryStatsData.totalUnits || 0,
          totalItems: inventoryStatsData.totalItems || 0,
        },
        reviews: {
          total: reviewStatsData.total || 0,
          pending: reviewStatsData.pending || 0,
          averageRating: reviewStatsData.averageRating || 0,
          growth: reviewStatsData.growth || 0,
        },
      };

      // Add recent data if it was requested (already fetched in the same calls above)
      if (includeRecent) {
        // Map recent orders from order service response
        if (orderStatsData.recentOrders && Array.isArray(orderStatsData.recentOrders)) {
          aggregatedStats.recentOrders = orderStatsData.recentOrders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customer: order.customerName || order.customerId || '',
            total: order.totalAmount,
            status: order.status.toLowerCase(), // Already a string from backend
            itemCount: order.itemCount || 0,
            createdAt: order.createdAt,
          }));
        }

        // Add recent users from user service response
        if (userStatsData.recentUsers && Array.isArray(userStatsData.recentUsers)) {
          aggregatedStats.recentUsers = userStatsData.recentUsers;
        }
      }

      // logger.info('Dashboard stats aggregated successfully', {
      //   traceId,
      //   spanId,
      //   servicesResponded: {
      //     users: userStats.status === 'fulfilled',
      //     orders: orderStats.status === 'fulfilled',
      //     products: productStats.status === 'fulfilled',
      //     inventory: inventoryStats.status === 'fulfilled',
      //     reviews: reviewStats.status === 'fulfilled',
      //   },
      //   stats: {
      //     users: userStatsData.total,
      //     orders: orderStatsData.total,
      //     inventory: inventoryStatsData.totalItems,
      //   },
      // });

      return aggregatedStats;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('Error processing dashboard stats', {
        traceId,
        spanId,
        error: err.message,
        stack: err.stack,
      });

      // Return safe defaults on error
      return {
        users: {
          total: 0,
          active: 0,
          newThisMonth: 0,
          growth: 0,
          customers: 0,
          newCustomersThisMonth: 0,
          customerGrowth: 0,
        },
        orders: { total: 0, pending: 0, processing: 0, completed: 0, revenue: 0, growth: 0 },
        products: { total: 0, active: 0 },
        inventory: {
          productsWithStock: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          totalInventoryValue: 0,
          totalUnits: 0,
          totalItems: 0,
        },
        reviews: { total: 0, pending: 0, averageRating: 0, growth: 0 },
      };
    }
  }
}

export const adminDashboardAggregator = new AdminDashboardAggregator();
