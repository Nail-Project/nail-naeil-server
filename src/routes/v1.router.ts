import { Router } from 'express';
//import estimateRouter from '../estimate/estimate.route';
import reservationRouter from '../reservation/reservation.route';

const v1Router = Router();

//v1Router.use('/estimate', estimateRouter);
v1Router.use('/reserve', reservationRouter);

export default v1Router;
