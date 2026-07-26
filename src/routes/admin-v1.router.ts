import { Router } from 'express';
import shopSyncRouter from '../shop/shop-sync.route';

const adminV1Router = Router();

adminV1Router.use('/shops', shopSyncRouter);

export default adminV1Router;
