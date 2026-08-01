import { Router } from 'express';
import estimateRequestRouter from '../estimate-request/estimate-request.route';
import estimateResponseRouter from '../estimate-response/estimate-response.route';
import reservationRouter from '../reservation/reservation.route';
import shopMatchingRouter from '../shop/shop-matching.route';
import shopQueryRouter from '../shop/shop-query.route';
import imageRouter from '../image/image.route';
<<<<<<< HEAD
=======
import userAuthRouter from '../user/route/user-auth.route';
import userRouter from '../user/route/user.route';
import socialAuthRouter from '../user/route/social-auth.route';
>>>>>>> d42da51aa3ed93a2b4412cc9de251d9ca41ba0dc

const v1Router = Router();

v1Router.use('/estimate', estimateRequestRouter);
v1Router.use('/estimate', estimateResponseRouter);
v1Router.use('/reserve', reservationRouter);
v1Router.use('/shops', shopMatchingRouter);
v1Router.use('/shops', shopQueryRouter);
v1Router.use('/image', imageRouter);
<<<<<<< HEAD
=======
v1Router.use('/users', userAuthRouter);
v1Router.use('/users', userRouter);
v1Router.use('/auth', socialAuthRouter);
>>>>>>> d42da51aa3ed93a2b4412cc9de251d9ca41ba0dc

export default v1Router;
