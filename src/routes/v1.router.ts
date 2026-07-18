import { Router } from 'express';
import estimateResponseRouter from '../estimate-response/estimate-response.route';

const v1Router = Router();

v1Router.use('/estimate', estimateResponseRouter);

export default v1Router;
