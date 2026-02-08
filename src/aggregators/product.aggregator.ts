import { reviewClient } from '@clients/review.client';
import logger from '../core/logger';

export interface ReviewAggregates {
  average_rating: number;
  total_review_count: number;
  verified_review_count: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recent_reviews: string[];
  last_review_date?: string;
  last_updated: string;
}

export interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  brand?: string;
  sku?: string;
  department?: string;
  category?: string;
  subcategory?: string;
  product_type?: string;
  images: string[];
  tags: string[];
  colors: string[];
  sizes: string[];
  specifications: Record<string, string>;
  review_aggregates?: ReviewAggregates;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface ReviewData {
  id: string;
  productId: string;
  userId: string;
  username: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  status: string;
  helpfulVotes: {
    helpful: number;
    notHelpful: number;
  };
  sentiment?: {
    score: number;
    label: string;
    confidence: number;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Fetch all reviews for a product (for dedicated reviews page)
 *
 * @param productId - The ID of the product
 * @param traceId - W3C Trace Context trace ID
 * @param spanId - W3C Trace Context span ID
 * @param skip - Number of reviews to skip (pagination)
 * @param limit - Maximum number of reviews to fetch
 * @param sort - Sort order (helpful, recent, rating)
 * @returns Reviews list with pagination and rating details
 */
export async function getProductReviews(
  productId: string,
  traceId: string,
  spanId: string,
  skip: number = 0,
  limit: number = 20,
  sort: string = 'recent'
): Promise<{
  reviews: ReviewData[];
  total: number;
  hasMore: boolean;
  ratingDetails?: {
    averageRating: number;
    totalReviews: number;
    verifiedReviewCount: number;
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  };
}> {
  try {
    logger.info('Fetching product reviews', {
      traceId,
      spanId,
      productId,
      skip,
      limit,
      sort,
    });

    // Response type for type safety
    interface ReviewListResponse {
      data?: {
        reviews?: ReviewData[];
        total?: number;
        ratingDetails?: {
          averageRating: number;
          totalReviews: number;
          verifiedReviewCount: number;
          ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
        };
        pagination?: {
          total?: number;
        };
      };
    }

    const response = (await reviewClient.getProductReviewsList(
      productId,
      {
        status: 'approved',
        skip,
        limit,
        sort,
      },
      {
        traceparent: `00-${traceId}-${spanId}-01`,
      }
    )) as ReviewListResponse;

    const reviews = response.data?.reviews || [];
    const total = response.data?.pagination?.total || response.data?.total || 0;
    const hasMore = skip + reviews.length < total;
    const ratingDetails = response.data?.ratingDetails;

    logger.info('Successfully fetched product reviews', {
      traceId,
      spanId,
      productId,
      reviewCount: reviews.length,
      total,
      hasMore,
      hasRatingDetails: !!ratingDetails,
    });

    return {
      reviews,
      total,
      hasMore,
      ratingDetails,
    };
  } catch (error) {
    logger.error('Error fetching product reviews', {
      traceId,
      spanId,
      productId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
