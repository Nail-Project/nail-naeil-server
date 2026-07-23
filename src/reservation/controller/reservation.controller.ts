import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../service/reservation.service';
import { CreateReservationRequest } from '../dto/create-reservation-request';
import {
  InvalidReservationRequestError,
  ReservationValidationError,
} from '../error/reservation.error';
import { success } from '../../common/responses/api-response';

const RESERVATION_STATUSES = ['CONFIRMED', 'PAST'] as const;
type ReservationListStatus = (typeof RESERVATION_STATUSES)[number];

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;

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
      const status = req.query.status;

      if (
        typeof status !== 'string' ||
        !RESERVATION_STATUSES.includes(status as ReservationListStatus)
      ) {
        throw new InvalidReservationRequestError();
      }

      const page = this.parsePageParam(req.query.page);
      const size = this.parseSizeParam(req.query.size);

      const result = await this.reservationService.getReservations(
        status as ReservationListStatus,
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
      const reservationId = this.parsePositiveInteger(req.params.reservationId);

      const result = await this.reservationService.getReservationDetail(
        BigInt(reservationId),
        TEMP_USER_ID,
      );
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  };

  private parsePageParam(value: unknown): number {
    if (value === undefined) return DEFAULT_PAGE;

    const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new InvalidReservationRequestError();
    }

    return parsed;
  }

  private parseSizeParam(value: unknown): number {
    if (value === undefined) return DEFAULT_SIZE;

    const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_SIZE) {
      throw new InvalidReservationRequestError();
    }

    return parsed;
  }

  // 안전한 정수 범위를 벗어나는 값(정밀도 손실 우려)은 거부
  private parsePositiveInteger(value: unknown): number {
    const parsed = typeof value === 'string' ? Number(value) : Number.NaN;

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new InvalidReservationRequestError();
    }

    return parsed;
  }
}
