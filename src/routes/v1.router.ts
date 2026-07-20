import { Router } from 'express';
import estimateRequestRouter from '../estimate-request/estimate-request.route';

const v1Router = Router();

v1Router.use('/estimate-request', estimateRequestRouter);

export default v1Router;
