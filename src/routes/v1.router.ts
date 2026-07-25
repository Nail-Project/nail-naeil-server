import { Router } from 'express';
import estimateRequestRouter from '../estimate-request/estimate-request.route';
import estimateResponseRouter from '../estimate-response/estimate-response.route';
import reservationRouter from '../reservation/reservation.route';
import shopMatchingRouter from '../shop/shop-matching.route';
import shopQueryRouter from '../shop/shop-query.route';

const v1Router = Router();

v1Router.use('/estimate', estimateRequestRouter);
v1Router.use('/estimate', estimateResponseRouter);
v1Router.use('/reserve', reservationRouter);
v1Router.use('/shops', shopMatchingRouter);
v1Router.use('/shops', shopQueryRouter);

export default v1Router;
