import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../service/reservation.service';
import { CreateReservationRequest } from '../dto/create-reservation-request';
import { GetReservationsRequest } from '../dto/get-reservations-request';
import { GetReservationDetailRequest } from '../dto/get-reservation-detail-request';
import {
  InvalidReservationRequestError,
  ReservationValidationError,
} from '../error/reservation.error';
import { success } from '../../common/responses/api-response';

// TODO: [malibu] 로그인 구현 후 토큰에서 userId 추출하는 로직으로 교체
const TEMP_USER_ID = BigInt(1);

export class ReservationController {
  private readonly reservationService = new ReservationService();

  // POST /api/v1/reserve
  createReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateReservationRequest.safeParse(req.body);

      if (!parsed.success) {
        throw new ReservationValidationError(parsed.error.flatten());
      }

      const result = await this.reservationService.createReservation(parsed.data, TEMP_USER_ID);
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

      const { status, page, size } = parsed.data;

      const result = await this.reservationService.getReservations(
        status,
        TEMP_USER_ID,
        page,
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
        throw new InvalidReservationRequestError(parsed.error.flatten());
      }

      const result = await this.reservationService.getReservationDetail(
        BigInt(parsed.data.reservationId),
        TEMP_USER_ID,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };
}
