import { Router } from 'express';
import estimateRequestRouter from '../estimate-request/estimate-request.route';
import estimateResponseRouter from '../estimate-response/estimate-response.route';
import reservationRouter from '../reservation/reservation.route';

const v1Router = Router();

v1Router.use('/estimate', estimateRequestRouter);
v1Router.use('/estimate', estimateResponseRouter);
v1Router.use('/reserve', reservationRouter);

export default v1Router;
