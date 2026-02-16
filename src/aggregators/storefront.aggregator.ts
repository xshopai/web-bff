import { productClient, Product, TrendingCategory } from '@clients/product.client';
import { inventoryClient, InventoryItem } from '@clients/inventory.client';
import logger from '../core/logger';

export interface EnrichedProduct extends Product {
  inventory: {
    inStock: boolean;
    availableQuantity: number;
  };
  reviews: {
    averageRating: number;
    reviewCount: number;
  };
}

export interface EnrichedCategory extends TrendingCategory {
  displayName: string;
  description: string;
  image: string;
  department: string;
  categoryName: string;
  accurateCount: number;
  path: string;
}

export class StorefrontAggregator {
  /**
   * Get trending data (products and categories) in a single call
   * OPTIMIZED: Single call to product service /trending endpoint
   * Reduces service calls from 6+ to 2 (trending data + inventory)
   */
  async getTrendingData(
    productsLimit: number = 4,
    categoriesLimit: number = 5,
    traceId?: string,
    spanId?: string
  ): Promise<{
    trendingProducts: EnrichedProduct[];
    trendingCategories: EnrichedCategory[];
  }> {
    try {
      logger.info('Fetching trending data (single call optimization)', {
        traceId,
        spanId,
        productsLimit,
        categoriesLimit,
      });

      // Single call to product service /trending endpoint for both products and categories
      const { trending_products, trending_categories } = await productClient.getStorefrontData(
        productsLimit,
        categoriesLimit
      );

      // Process products with inventory enrichment
      let enrichedProducts: EnrichedProduct[] = [];
      if (trending_products && trending_products.length > 0) {
        const skus = trending_products
          .map((p) => p.sku)
          .filter((sku): sku is string => Boolean(sku));

        // Fetch inventory data in parallel
        const inventoryMap = new Map<string, InventoryItem>();
        try {
          const inventoryData = await inventoryClient.getInventoryBatch(skus);
          inventoryData.forEach((item) => inventoryMap.set(item.sku, item));
        } catch (error) {
          logger.warn('Failed to fetch inventory data', { error, traceId, spanId });
        }

        // Map to EnrichedProduct format
        interface ProductWithReviews {
          review_aggregates?: {
            average_rating?: number;
            total_review_count?: number;
          };
        }
        enrichedProducts = trending_products.map((product) => {
          const inventory = product.sku ? inventoryMap.get(product.sku) : undefined;
          const productWithReviews = product as typeof product & ProductWithReviews;

          return {
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
            category: product.category || '',
            sku: product.sku || '',
            images: product.images,
            isActive: product.isActive,
            inventory: {
              inStock: inventory ? inventory.quantityAvailable > 0 : false,
              availableQuantity: inventory?.quantityAvailable || 0,
            },
            reviews: {
              averageRating: productWithReviews.review_aggregates?.average_rating || 0,
              reviewCount: productWithReviews.review_aggregates?.total_review_count || 0,
            },
          };
        });
      }

      // Process categories with enrichment
      let enrichedCategories: EnrichedCategory[] = [];
      if (trending_categories && trending_categories.length > 0) {
        enrichedCategories = await Promise.all(
          trending_categories.map(async (category) => await this.enrichCategory(category))
        );
      }

      logger.info('Trending data aggregation complete', {
        traceId,
        spanId,
        productsCount: enrichedProducts.length,
        categoriesCount: enrichedCategories.length,
      });

      return {
        trendingProducts: enrichedProducts,
        trendingCategories: enrichedCategories,
      };
    } catch (error) {
      logger.error('Error getting trending data', { error });
      throw error;
    }
  }

  /**
   * Get categories with product counts
   */
  async getCategories(): Promise<string[]> {
    try {
      return await productClient.getCategories();
    } catch (error) {
      logger.error('Error getting categories', { error });
      throw error;
    }
  }

  /**
   * Enrich category with display metadata and accurate product count
   */
  private async enrichCategory(category: TrendingCategory): Promise<EnrichedCategory> {
    // Map category names to department, category, and path
    // Based on actual product database structure
    const categoryRoutes: Record<
      string,
      { department: string; categoryName: string; path: string }
    > = {
      Clothing: {
        department: 'Women',
        categoryName: 'Clothing',
        path: '/products?department=women&category=clothing',
      },
      Accessories: {
        department: 'Women',
        categoryName: 'Accessories',
        path: '/products?department=women&category=accessories',
      },
      Apparel: {
        department: 'Sports',
        categoryName: 'Apparel',
        path: '/products?department=sports&category=apparel',
      },
      Footwear: {
        department: 'Kids',
        categoryName: 'Footwear',
        path: '/products?department=kids&category=footwear',
      },
      Mobile: {
        department: 'Electronics',
        categoryName: 'Mobile',
        path: '/products?department=electronics&category=mobile',
      },
      Audio: {
        department: 'Electronics',
        categoryName: 'Audio',
        path: '/products?department=electronics&category=audio',
      },
      Computers: {
        department: 'Electronics',
        categoryName: 'Computers',
        path: '/products?department=electronics&category=computers',
      },
      Gaming: {
        department: 'Electronics',
        categoryName: 'Gaming',
        path: '/products?department=electronics&category=gaming',
      },
      Fiction: {
        department: 'Books',
        categoryName: 'Fiction',
        path: '/products?department=books&category=fiction',
      },
      Nonfiction: {
        department: 'Books',
        categoryName: 'Nonfiction',
        path: '/products?department=books&category=nonfiction',
      },
    };

    // Map category names to display names and images
    const categoryMetadata: Record<
      string,
      { displayName: string; description: string; image: string }
    > = {
      Electronics: {
        displayName: 'Tech essentials',
        description: 'Latest gadgets and devices',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
      },
      Audio: {
        displayName: 'Sound & music',
        description: 'Headphones and speakers',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      },
      Computers: {
        displayName: 'Computing',
        description: 'Laptops and desktops',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      },
      Gaming: {
        displayName: 'Gaming',
        description: 'Consoles and accessories',
        image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800',
      },
      Wearables: {
        displayName: 'Wearables',
        description: 'Smartwatches and fitness',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      },
      Clothing: {
        displayName: 'Style & trends',
        description: 'Fashion and apparel',
        image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
      },
      Accessories: {
        displayName: 'Accessories',
        description: 'Bags, jewelry and more',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
      },
      Apparel: {
        displayName: 'Sports apparel',
        description: 'Athletic wear and gear',
        image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800',
      },
      Footwear: {
        displayName: 'Footwear',
        description: 'Shoes and sneakers',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      },
      Furniture: {
        displayName: 'For your space',
        description: 'Home and office furniture',
        image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800',
      },
      'Home Appliances': {
        displayName: 'Home essentials',
        description: 'Kitchen and cleaning',
        image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800',
      },
      Cameras: {
        displayName: 'Photography',
        description: 'Cameras and accessories',
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
      },
      Tablets: {
        displayName: 'Tablets',
        description: 'iPads and tablets',
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
      },
      Automotive: {
        displayName: 'Automotive',
        description: 'Car parts and accessories',
        image: 'https://images.unsplash.com/photo-1562911791-c7a97b729ec5?w=800',
      },
    };

    const metadata = categoryMetadata[category.name] ||
      categoryMetadata[
        category.name?.charAt(0).toUpperCase() + category.name?.slice(1).toLowerCase()
      ] || {
        displayName: category.name,
        description: `Browse ${category.name}`,
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      };

    // Get routing information for this category (case-insensitive lookup)
    const route =
      categoryRoutes[category.name] ||
      categoryRoutes[
        category.name?.charAt(0).toUpperCase() + category.name?.slice(1).toLowerCase()
      ];

    // Use the product count already provided by the trending categories endpoint
    // This avoids making 5 additional API calls for product counts
    const accurateCount = category.product_count;

    return {
      ...category,
      ...metadata,
      department: route?.department || category.name,
      categoryName: route?.categoryName || category.name,
      accurateCount,
      path: route?.path || `/products?category=${category.name}`,
    };
  }
}

export const storefrontAggregator = new StorefrontAggregator();
