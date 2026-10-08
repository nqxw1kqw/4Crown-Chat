export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'invalid'
  | 'unconfigured'
  | 'system';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode) {
    super(`${code} (${status})`);
    this.status = status;
    this.code = code;
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

/** Dữ liệu trên máy khách đã cũ (ai đó vừa xoá task/file/video). */
export function isStaleError(err: unknown): boolean {
  return err instanceof ApiClientError && err.code === 'not_found';
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    let code: ApiErrorCode = 'system';
    try {
      const payload = (await res.json()) as { error?: ApiErrorCode };
      if (payload?.error) code = payload.error;
    } catch {
      // body không phải JSON — giữ mã 'system'
    }
    throw new ApiClientError(res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiPost<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiPut<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiDelete<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' });
}
