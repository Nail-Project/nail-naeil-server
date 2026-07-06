import { describe, expect, it } from 'vitest';
import {
  EstimateRequestFailedError,
  InternalServerError,
  LocationRequiredError,
  PhotoUploadFailedError,
  RequiredFieldMissingError,
  ReservationFailedError,
} from './common.error';

describe('common errors', () => {
  it('RequiredFieldMissingError는 400과 안내 메시지를 갖는다', () => {
    const error = new RequiredFieldMissingError({ field: 'name' });

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('REQUIRED_FIELD_MISSING');
    expect(error.message).toBe('필수 정보를 입력해주세요.');
    expect(error.data).toEqual({ field: 'name' });
  });

  it('LocationRequiredError는 400과 안내 메시지를 갖는다', () => {
    const error = new LocationRequiredError();

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('LOCATION_REQUIRED');
    expect(error.message).toBe('주변 샵을 찾기 위해 위치가 필요해요.');
    expect(error.data).toBeNull();
  });

  it('PhotoUploadFailedError는 500과 안내 메시지를 갖는다', () => {
    const error = new PhotoUploadFailedError();

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('PHOTO_UPLOAD_FAILED');
    expect(error.message).toBe('사진을 업로드하지 못했어요. 다시 시도해주세요.');
  });

  it('EstimateRequestFailedError는 500과 안내 메시지를 갖는다', () => {
    const error = new EstimateRequestFailedError();

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('ESTIMATE_REQUEST_FAILED');
    expect(error.message).toBe('견적 요청을 보내지 못했어요. 다시 시도해주세요.');
  });

  it('ReservationFailedError는 500과 안내 메시지를 갖는다', () => {
    const error = new ReservationFailedError();

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('RESERVATION_FAILED');
    expect(error.message).toBe('예약을 완료하지 못했어요. 다시 시도해주세요.');
  });

  it('InternalServerError는 500과 공통 안내 메시지를 갖는다', () => {
    const error = new InternalServerError();

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
