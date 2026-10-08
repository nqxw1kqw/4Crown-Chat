import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'invalid'
  | 'unconfigured'
  | 'system';

/**
 * Lỗi API trả về `code` ổn định để client tự dịch sang VI/JA,
 * thay vì rò rỉ message nội bộ ra trình duyệt.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly detail?: string;

  constructor(status: number, code: ApiErrorCode, detail?: string) {
    super(detail ?? code);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Next cắt prerender bằng cách ném một lỗi điều khiển có `digest`.
 * Lỗi đó phải được ném tiếp, không được nuốt thành HTTP 500.
 */
function isPrerenderBailout(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { digest?: unknown }).digest === 'NEXT_PRERENDER_INTERRUPTED'
  );
}

/**
 * PostgREST báo thiếu cột/bảng khi migration chưa chạy.
 * Client chỉ nhận mã ổn định, message nội bộ ở lại log server.
 */
export function dbError(error: { code?: string; message?: string }): ApiError {
  const missingSchema = ['42703', '42P01', 'PGRST204', 'PGRST205'];
  if (missingSchema.includes(error.code ?? '')) {
    console.error('[db] schema chưa migrate:', error.code, error.message);
    return new ApiError(500, 'unconfigured', 'schema');
  }
  console.error('[db]', error.code, error.message);
  return new ApiError(500, 'system');
}

export function toErrorResponse(err: unknown): NextResponse {
  if (isPrerenderBailout(err)) throw err;
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.code, detail: err.detail }, { status: err.status });
  }
  console.error('[api]', err);
  return NextResponse.json({ error: 'system' satisfies ApiErrorCode }, { status: 500 });
}
