import { Request, Response, NextFunction } from 'express';
import type { ReservationService } from '../service/reservation.service';
import { CreateReservationRequest } from '../dto/create-reservation-request';
import { GetReservationsRequest } from '../dto/get-reservations-request';
import { GetReservationDetailRequest } from '../dto/get-reservation-detail-request';
import { CancelReservationRequest } from '../dto/cancel-reservation-request';
import {
  ReservationCancelValidationError,
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

      const result = await this.reservationService.createReservation(parsed.data, req.userId);
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
        req.userId,
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
        req.userId,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/v1/reserve/:reservationId
  cancelReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedParams = GetReservationDetailRequest.safeParse(req.params);
      if (!parsedParams.success) {
        throw new InvalidReservationIdError(parsedParams.error.flatten());
      }

      const parsedBody = CancelReservationRequest.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ReservationCancelValidationError(parsedBody.error.flatten());
      }

      await this.reservationService.cancelReservation(
        BigInt(parsedParams.data.reservationId),
        req.userId,
        parsedBody.data.reason,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
