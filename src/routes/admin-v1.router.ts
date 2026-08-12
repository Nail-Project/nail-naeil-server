import { Router } from 'express';
import shopSyncRouter from '../shop/shop-sync.route';
import shopAdminRouter from '../shop/shop-admin.route';
import designAdminRouter from '../design/design-admin.route';

const adminV1Router = Router();

adminV1Router.use('/shops', shopSyncRouter);
adminV1Router.use('/shops', shopAdminRouter);
adminV1Router.use('/designs', designAdminRouter);

export default adminV1Router;
