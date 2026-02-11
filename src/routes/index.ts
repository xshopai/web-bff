import { Router } from 'express';
import storefrontRoutes from './storefront.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import productsRoutes from './products.routes';
import adminRoutes from './admin.routes';
import orderRoutes from './order.routes';
import returnRoutes from './return.routes';
import cartRoutes from './cart.routes';
import inventoryRoutes from './inventory.routes';
import reviewRoutes from './review.routes';
import chatRoutes from './chat.routes';

const router = Router();

// Mount routes
router.use('/storefront', storefrontRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/products', productsRoutes);
router.use('/orders', orderRoutes);
router.use('/returns', returnRoutes);
router.use('/cart', cartRoutes);
router.use('/admin', adminRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reviews', reviewRoutes);
router.use('/chat', chatRoutes);

export default router;
