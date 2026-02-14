/**
 * Unit tests for Review Service
 */

import { getReviewsWithUserData } from '../../../src/services/review.service';

// Mock the logger
jest.mock('../../../src/core/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the review client
jest.mock('../../../src/clients/review.client', () => ({
  reviewClient: {
    getAllReviews: jest.fn(),
  },
}));

// Mock the user client
jest.mock('../../../src/clients/user.client', () => ({
  userClient: {
    batchGetUsers: jest.fn(),
  },
}));

import logger from '../../../src/core/logger';

describe('Review Service', () => {
  const mockAuthHeaders = { Authorization: 'Bearer test-token' };
  const mockCorrelationId = 'test-correlation-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReviewsWithUserData', () => {
    it('should return empty reviews when no reviews exist', async () => {
      const { reviewClient } = await import('../../../src/clients/review.client');
      (reviewClient.getAllReviews as jest.Mock).mockResolvedValue({
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const result = await getReviewsWithUserData({}, mockAuthHeaders, mockCorrelationId);

      expect(result).toEqual({
        reviews: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('should enrich reviews with user data', async () => {
      const mockReviews = [
        {
          _id: 'review-1',
          userId: 'user-1',
          productId: 'product-1',
          rating: 5,
          comment: 'Great product!',
          verifiedPurchase: true,
          helpful: 10,
          status: 'approved',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          _id: 'review-2',
          userId: 'user-2',
          productId: 'product-1',
          rating: 4,
          comment: 'Good product',
          verifiedPurchase: false,
          helpful: 5,
          status: 'approved',
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      ];

      const mockUsers = {
        'user-1': {
          userId: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
        },
        'user-2': {
          userId: 'user-2',
          email: 'user2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          fullName: 'Jane Smith',
        },
      };

      const { reviewClient } = await import('../../../src/clients/review.client');
      const { userClient } = await import('../../../src/clients/user.client');

      (reviewClient.getAllReviews as jest.Mock).mockResolvedValue({
        data: mockReviews,
        pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
      });

      (userClient.batchGetUsers as jest.Mock).mockResolvedValue({
        data: mockUsers,
      });

      const result = await getReviewsWithUserData({}, mockAuthHeaders, mockCorrelationId);

      expect(result.reviews).toHaveLength(2);
      expect(result.reviews[0].user.fullName).toBe('John Doe');
      expect(result.reviews[1].user.fullName).toBe('Jane Smith');
      expect(logger.info).toHaveBeenCalledWith(
        'Fetching user data for reviews',
        expect.objectContaining({
          reviewCount: 2,
          uniqueUserIds: 2,
        })
      );
    });

    it('should use fallback user data when user service fails', async () => {
      const mockReviews = [
        {
          _id: 'review-1',
          userId: 'user-1',
          productId: 'product-1',
          rating: 5,
          comment: 'Great product!',
          verifiedPurchase: true,
          helpful: 10,
          status: 'approved',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      const { reviewClient } = await import('../../../src/clients/review.client');
      const { userClient } = await import('../../../src/clients/user.client');

      (reviewClient.getAllReviews as jest.Mock).mockResolvedValue({
        data: mockReviews,
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      (userClient.batchGetUsers as jest.Mock).mockRejectedValue(
        new Error('User service unavailable')
      );

      const result = await getReviewsWithUserData({}, mockAuthHeaders, mockCorrelationId);

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].user).toEqual({
        userId: 'user-1',
        email: 'N/A',
        firstName: 'Unknown',
        lastName: 'User',
        fullName: 'Unknown User',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch user data, using fallback',
        expect.objectContaining({
          error: 'User service unavailable',
        })
      );
    });

    it('should handle reviews with missing userId', async () => {
      const mockReviews = [
        {
          _id: 'review-1',
          userId: 'user-1',
          productId: 'product-1',
          rating: 5,
          comment: 'Great product!',
          verifiedPurchase: true,
          helpful: 10,
          status: 'approved',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          _id: 'review-2',
          userId: null,
          productId: 'product-1',
          rating: 4,
          comment: 'Anonymous review',
          verifiedPurchase: false,
          helpful: 2,
          status: 'approved',
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      ];

      const mockUsers = {
        'user-1': {
          userId: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
        },
      };

      const { reviewClient } = await import('../../../src/clients/review.client');
      const { userClient } = await import('../../../src/clients/user.client');

      (reviewClient.getAllReviews as jest.Mock).mockResolvedValue({
        data: mockReviews,
        pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
      });

      (userClient.batchGetUsers as jest.Mock).mockResolvedValue({
        data: mockUsers,
      });

      const result = await getReviewsWithUserData({}, mockAuthHeaders, mockCorrelationId);

      expect(result.reviews).toHaveLength(2);
      // First review should have real user data
      expect(result.reviews[0].user.fullName).toBe('John Doe');
      // Second review should have fallback user data
      expect(result.reviews[1].user.fullName).toBe('Unknown User');
    });

    it('should pass filters to review client', async () => {
      const { reviewClient } = await import('../../../src/clients/review.client');
      (reviewClient.getAllReviews as jest.Mock).mockResolvedValue({
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const filters = { productId: 'product-1', status: 'approved' };
      await getReviewsWithUserData(filters, mockAuthHeaders, mockCorrelationId);

      expect(reviewClient.getAllReviews).toHaveBeenCalledWith(mockAuthHeaders, filters);
    });

    it('should throw error when review client fails', async () => {
      const { reviewClient } = await import('../../../src/clients/review.client');
      (reviewClient.getAllReviews as jest.Mock).mockRejectedValue(
        new Error('Review service unavailable')
      );

      await expect(getReviewsWithUserData({}, mockAuthHeaders, mockCorrelationId)).rejects.toThrow(
        'Review service unavailable'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get reviews with user data',
        expect.objectContaining({
          error: 'Review service unavailable',
        })
      );
    });

    it('should deduplicate user IDs before fetching', async () => {
      const mockReviews = [
        {
          _id: 'review-1',
          userId: 'user-1',
          productId: 'product-1',
          rating: 5,
          comment: 'First review',
          verifiedPurchase: true,
          helpful: 10,
          status: 'approved',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          _id: 'review-2',
          userId: 'user-1', // Same user
          productId: 'product-2',
          rating: 4,
          comment: 'Second review by same user',
          verifiedPurchase: true,
          helpful: 5,
          status: 'approved',
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      ];

      const { reviewClient } = await import('../../../src/clients/review.client');
      const { userClient } = await import('../../../src/clients/user.client');

      (reviewClient.getAllReviews as jest.Mock).mockResolvedValue({
        data: mockReviews,
        pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
      });

      (userClient.batchGetUsers as jest.Mock).mockResolvedValue({
        data: {
          'user-1': {
            userId: 'user-1',
            email: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe',
            fullName: 'John Doe',
          },
        },
      });

      await getReviewsWithUserData({}, mockAuthHeaders, mockCorrelationId);

      // Should only request 1 unique user
      expect(logger.info).toHaveBeenCalledWith(
        'Fetching user data for reviews',
        expect.objectContaining({
          reviewCount: 2,
          uniqueUserIds: 1,
        })
      );
    });
  });
});
