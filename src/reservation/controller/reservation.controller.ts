import { Request, Response, NextFunction } from 'express';
import type { ReservationService } from '../service/reservation.service';
import { CreateReservationRequest } from '../dto/create-reservation-request';
import { GetReservationsRequest } from '../dto/get-reservations-request';
import { GetReservationDetailRequest } from '../dto/get-reservation-detail-request';
import {
  InvalidReservationIdError,
  InvalidReservationRequestError,
  ReservationValidationError,
} from '../error/reservation.error';
import { success } from '../../common/responses/api-response';


export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  // POST /api/v1/reserve
  createReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateReservationRequest.safeParse(req.body);

      if (!parsed.success) {
        throw new ReservationValidationError(parsed.error.flatten());
      }

      const result = await this.reservationService.createReservation(parsed.data, BigInt(req.userId));
      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/reserve/detail
  getReservations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetReservationsRequest.safeParse(req.query);

      if (!parsed.success) {
        throw new InvalidReservationRequestError(parsed.error.flatten());
      }

      const { status, cursor, size } = parsed.data;

      const result = await this.reservationService.getReservations(
        status,
        BigInt(req.userId),
        cursor,
        size,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/reserve/:reservationId
  getReservationDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = GetReservationDetailRequest.safeParse(req.params);

      if (!parsed.success) {
        throw new InvalidReservationIdError(parsed.error.flatten());
      }

      const result = await this.reservationService.getReservationDetail(
        BigInt(parsed.data.reservationId),
        BigInt(req.userId),
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
