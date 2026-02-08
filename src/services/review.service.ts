/**
 * Review Service
 * Business logic for enriching review data with user information
 */

import logger from '../core/logger';

interface Review {
  _id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  title?: string;
  verifiedPurchase: boolean;
  helpful: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface UserInfo {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roles?: string[];
  createdAt?: string;
}

interface EnrichedReview extends Review {
  user: UserInfo;
}

/**
 * Get reviews with enriched user data
 * Fetches reviews from review-service and enriches with user data from user-service
 */
export async function getReviewsWithUserData(
  filters: Record<string, any>,
  authHeaders: Record<string, string>,
  correlationId: string
): Promise<{
  reviews: EnrichedReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  try {
    // 1. Fetch reviews from review-service
    const { reviewClient } = await import('../clients/review.client');
    const reviewResponse = (await reviewClient.getAllReviews(authHeaders, filters)) as any;

    const reviews: Review[] = reviewResponse.data || [];
    const pagination = reviewResponse.pagination || {};
    const total = pagination.total || 0;
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const totalPages = pagination.totalPages || 0;

    if (reviews.length === 0) {
      return { reviews: [], total, page, limit, totalPages };
    }

    // 2. Extract unique user IDs
    const userIds = [...new Set(reviews.map((r: Review) => r.userId).filter(Boolean))];

    logger.info('Fetching user data for reviews', {
      reviewCount: reviews.length,
      uniqueUserIds: userIds.length,
      correlationId,
    });

    // 3. Batch fetch user details from user-service
    let userMap: Record<string, UserInfo> = {};

    if (userIds.length > 0) {
      try {
        const { userClient } = await import('../clients/user.client');
        const userResponse = (await userClient.batchGetUsers(
          userIds as string[],
          authHeaders
        )) as any;

        userMap = userResponse.data || {};

        logger.info('User data fetched successfully', {
          usersFound: Object.keys(userMap).length,
          correlationId,
        });
      } catch (userError: any) {
        logger.error('Failed to fetch user data, using fallback', {
          error: userError.message,
          correlationId,
        });
        // Continue with empty user map - will use fallback values
      }
    }

    // 4. Enrich reviews with user data
    const enrichedReviews: EnrichedReview[] = reviews.map((review: Review) => ({
      ...review,
      user: userMap[review.userId] || {
        userId: review.userId,
        email: 'N/A',
        firstName: 'Unknown',
        lastName: 'User',
        fullName: 'Unknown User',
      },
    }));

    logger.info('Reviews enriched with user data', {
      enrichedCount: enrichedReviews.length,
      usersFound: Object.keys(userMap).length,
      correlationId,
    });

    return {
      reviews: enrichedReviews,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error: any) {
    logger.error('Failed to get reviews with user data', {
      error: error.message,
      correlationId,
    });
    throw error;
  }
}
