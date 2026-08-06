import { Router } from 'express';
import estimateRequestRouter from '../estimate-request/estimate-request.route';
import estimateResponseRouter from '../estimate-response/estimate-response.route';
import reservationRouter from '../reservation/reservation.route';
import shopMatchingRouter from '../shop/shop-matching.route';
import shopQueryRouter from '../shop/shop-query.route';
import imageRouter from '../image/image.route';
import userAuthRouter from '../user/route/user-auth.route';
import userRouter from '../user/route/user.route';
import socialAuthRouter from '../user/route/social-auth.route';
import notificationRouter from '../notification/notification.route';
import deviceTokenRouter from '../device-token/device-token.route';

const v1Router = Router();

v1Router.use('/estimate', estimateRequestRouter);
v1Router.use('/estimate', estimateResponseRouter);
v1Router.use('/reserve', reservationRouter);
v1Router.use('/shops', shopMatchingRouter);
v1Router.use('/shops', shopQueryRouter);
v1Router.use('/image', imageRouter);
v1Router.use('/users', userAuthRouter);
v1Router.use('/users', userRouter);
v1Router.use('/auth', socialAuthRouter);
v1Router.use('/notifications', notificationRouter);
v1Router.use('/device-tokens', deviceTokenRouter);

export default v1Router;
