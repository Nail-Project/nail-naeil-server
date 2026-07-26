export interface ApiSuccessResponse<T> {
  resultType: 'SUCCESS';
  error: null;
  success: T;
}

export interface ApiErrorResponse {
  resultType: 'FAIL';
  error: {
    code: string;
    message: string;
    data: unknown;
  };
  success: null;
}

export const success = <T>(data: T): ApiSuccessResponse<T> => ({
  resultType: 'SUCCESS',
  error: null,
  success: data,
});
