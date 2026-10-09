export type Cell = string | number | boolean | null;
export interface Account {
  nick: string; sv: number; goal: string; state: string;
  sm: number | null; smGain: number | null; tn: number | null; tnNetChange: number | null;
  tn60s: number | null; sm60s: number | null; petSM: number | null; petSMGain: number | null;
}
export interface Report {
  at: string; measuredAt: string; stale: boolean;
  summary: Record<string, number>;
  period: { from: string; to: string; minutes: number };
  hermes: Record<string, string | number | null>;
  hot: { nick: string; event: string; seconds: number }[];
  accounts: Account[];
}
export const NAMES = ['Hermes Report', 'Hermes History', 'Hermes Accounts'];
export const HEADERS = ['Tài khoản', 'SV', 'Mục tiêu', 'Trạng thái', 'SM', 'ΔSM lần trước',
  'TN (số dư)', 'ΔTN số dư', 'TN / 60s', 'SM / 60s', 'SM đệ tử', 'ΔSM đệ tử',
  'Khoảng so sánh (phút)', 'SM tăng nguồn', 'TN đổi nguồn', 'Đệ tăng nguồn'];
export const SUMMARY_HEADERS = ['Thời điểm đo (VN)', 'Thời điểm lấy (VN)', 'Tài khoản', 'Online',
  'Dừng chủ động', 'Nghi bị kẹt', 'Tác vụ native', 'SM tăng nguồn', 'Đệ tăng nguồn', 'Kỳ nguồn (phút)', 'Watcher', 'AI review'];
const numericFields = ['sm', 'smGain', 'tn', 'tnNetChange', 'tn60s', 'sm60s', 'petSM', 'petSMGain'] as const;
export function parseReport(value: unknown): Report {
  const r = value as Report;
  if (!r || typeof r !== 'object' || !Number.isFinite(Date.parse(r.measuredAt)) ||
    !Number.isFinite(Date.parse(r.at)) || typeof r.stale !== 'boolean' || !r.summary || !r.hermes ||
    !r.period || !Number.isFinite(r.period.minutes) || !Array.isArray(r.hot) ||
    !Array.isArray(r.accounts) || r.accounts.length > 1000) throw new Error('Invalid report schema');
  for (const k of ['authorized', 'onlineReadyFresh', 'intentionalStop', 'suspectedStalls', 'nativeBusy', 'smGain', 'petSMGain']) {
    if (!Number.isFinite(r.summary[k])) throw new Error('Invalid report summary');
  }
  if (r.hot.some((h) => !h || typeof h.nick !== 'string' || typeof h.event !== 'string' || !Number.isFinite(h.seconds))) throw new Error('Invalid alerts');
  const seen = new Set<string>();
  for (const a of r.accounts) {
    if (!a || typeof a.nick !== 'string' || !Number.isSafeInteger(a.sv) || typeof a.goal !== 'string' ||
      typeof a.state !== 'string' || numericFields.some((k) => a[k] !== null && (typeof a[k] !== 'number' || !Number.isFinite(a[k])))) throw new Error('Invalid account schema');
    const key = `${a.sv}:${a.nick}`;
    if (seen.has(key)) throw new Error('Duplicate account');
    seen.add(key);
  }
  return r;
}
export const sheetDate = (iso: string) => Date.parse(iso) / 86_400_000 + 25569 + 7 / 24;
export const shouldSkip = (r: Report, last: Cell | undefined) => r.stale ||
  (typeof last === 'string' && Date.parse(r.measuredAt) <= Date.parse(last));
const difference = (a: number | null, b: Cell | undefined) => a !== null && typeof b === 'number' ? a - b : null;
const states: Record<string, string> = { up: 'Đang chạy', stalled: 'Nghi bị kẹt', paused: 'Tạm dừng',
  native_job: 'Đang làm tác vụ', waiting_login: 'Chờ đăng nhập', supply: 'Cấp vật phẩm' };
const goals: Record<string, string> = { pet_training: 'Luyện đệ tử', pet_supply: 'Cấp cho đệ tử', bean_giver: 'Cấp đậu',
  preserve_training: 'Giữ luyện', preserve_existing_training: 'Giữ luyện hiện tại', preserve_existing_profile: 'Giữ cấu hình',
  train_nghs: 'Luyện NGHS', skh: 'SKH', skh_punch: 'SKH đấm' };
export function buildRows(r: Report, previous: Cell[][] = []) {
  const lastAt = previous[2]?.[1];
  const baseline = typeof lastAt === 'string' && Number.isFinite(Date.parse(lastAt));
  const minutes = baseline ? (Date.parse(r.measuredAt) - Date.parse(lastAt)) / 60_000 : null;
  const old = new Map(previous.slice(13).map((row) => [`${row[1]}:${row[0]}`, row]));
  const accounts: Cell[][] = r.accounts.map((a) => {
    const p = baseline ? old.get(`${a.sv}:${a.nick}`) : undefined;
    return [a.nick, a.sv, goals[a.goal] ?? a.goal, states[a.state] ?? a.state,
      a.sm, difference(a.sm, p?.[4]), a.tn, difference(a.tn, p?.[6]), a.tn60s, a.sm60s,
      a.petSM, difference(a.petSM, p?.[10]), p ? minutes : null, a.smGain, a.tnNetChange, a.petSMGain];
  });
  const s = r.summary;
  const rows: Cell[][] = [
    ['HERMES • BÁO CÁO VẬN HÀNH'],
    ['Lấy dữ liệu (VN)', sheetDate(r.at)],
    ['Snapshot / measuredAt', r.measuredAt, 'Thời điểm đo (VN)', sheetDate(r.measuredAt)],
    ['Nguồn', 'https://app.treogamenro.online/api/hermes-report.json'],
    ['Tài khoản', s.authorized, 'Online', s.onlineReadyFresh, 'Dừng chủ động', s.intentionalStop, 'Nghi bị kẹt', s.suspectedStalls, 'Native busy', s.nativeBusy],
    ['Watcher', String(r.hermes.watcher ?? ''), 'AI review', String(r.hermes.aiReview ?? ''), 'Exit code', r.hermes.lastExitCode ?? null],
    ['Kỳ đo nguồn (phút)', r.period.minutes, 'ΔSM nguồn', s.smGain, 'ΔSM đệ nguồn', s.petSMGain],
    ['So sánh', 'ΔSM / ΔTN / Δđệ so với lần lấy hợp lệ trước; trống = chưa đủ mẫu.'],
    ['Lưu ý', 'ΔTN là thay đổi số dư sau chi tiêu, không phải tổng TN kiếm được. Chỉ số 60s là cửa sổ của game, không cộng thành kỳ 15 phút.'],
    ['Cảnh báo', r.hot.length ? r.hot.map((h) => `${h.nick}: ${h.event} (${Math.round(h.seconds / 60)} phút)`).join(' • ') : 'Không có cảnh báo nóng'],
    ['Chu kỳ', 'Lấy mỗi 15 phút; chỉ ghi snapshot mới. Không nội suy các mẫu bị bỏ lỡ.'],
    [], HEADERS, ...accounts,
  ];
  const summary: Cell[] = [sheetDate(r.measuredAt), sheetDate(r.at), s.authorized, s.onlineReadyFresh,
    s.intentionalStop, s.suspectedStalls, s.nativeBusy, s.smGain, s.petSMGain, r.period.minutes,
    String(r.hermes.watcher ?? ''), String(r.hermes.aiReview ?? '')];
  return { rows, summary, accountHistory: accounts.map((row) => [sheetDate(r.measuredAt), ...row]) };
}
