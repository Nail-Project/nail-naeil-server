import { Router } from 'express';
//import estimateRouter from '../estimate/estimate.route';
import imageRouter from '../image/image.route';

const v1Router = Router();

//v1Router.use('/estimate', estimateRouter);
v1Router.use('/image', imageRouter);

export default v1Router;
