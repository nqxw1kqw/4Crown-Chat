import { JWT } from 'google-auth-library';
import { NAMES, HEADERS, SUMMARY_HEADERS, parseReport, buildRows, shouldSkip, type Cell } from './hermes/model';

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing secret or variable: ${name}`);
  return value;
}
export function credentials(raw: string) {
  if (raw.trim().startsWith('AIza')) throw new Error('GOOGLESHEET contains a Google API key. Writes require service-account JSON with client_email and private_key.');
  let value: { client_email?: string; private_key?: string; type?: string };
  try { value = JSON.parse(raw); } catch { throw new Error('GOOGLESHEET must contain the complete service-account JSON key, not an API key or a file path.'); }
  if (value.type !== 'service_account' || !value.client_email || !value.private_key) throw new Error('GOOGLESHEET is missing service-account client_email/private_key.');
  return { email: value.client_email, key: value.private_key.replace(/\\n/g, '\n') };
}

type Props = { sheetId: number; title: string; gridProperties: { rowCount: number; columnCount: number } };
type BatchRequest = Record<string, unknown>;
const rgb = (hex: string) => ({ red: parseInt(hex.slice(0, 2), 16) / 255, green: parseInt(hex.slice(2, 4), 16) / 255, blue: parseInt(hex.slice(4, 6), 16) / 255 });
const cells = (rows: Cell[][]) => rows.map((values) => ({ values: values.map((v) => v === null ? {} : { userEnteredValue:
  typeof v === 'number' ? { numberValue: v } : typeof v === 'boolean' ? { boolValue: v } : { stringValue: v } }) }));
const update = (sheetId: number, rows: Cell[][]): BatchRequest => ({ updateCells: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 17 }, rows: cells(rows), fields: 'userEnteredValue' } });

function formatting(sheetId: number, report: boolean): BatchRequest[] {
  const header = report ? 12 : 0;
  const requests: BatchRequest[] = [
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: header + 1, frozenColumnCount: report ? 2 : 1, hideGridlines: true } }, fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount,gridProperties.hideGridlines' } },
    { repeatCell: { range: { sheetId }, cell: { userEnteredFormat: { textFormat: { fontFamily: 'Arial', fontSize: 10 }, verticalAlignment: 'MIDDLE', numberFormat: { type: 'NUMBER', pattern: '#,##0;[Red]-#,##0' } } }, fields: 'userEnteredFormat' } },
    { repeatCell: { range: { sheetId, startRowIndex: header, endRowIndex: header + 1 }, cell: { userEnteredFormat: { backgroundColor: rgb('17365D'), textFormat: { bold: true, foregroundColor: rgb('FFFFFF') }, wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 17 }, properties: { pixelSize: 145 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: header, endIndex: header + 1 }, properties: { pixelSize: 48 }, fields: 'pixelSize' } },
  ];
  const dateFormat = { numberFormat: { type: 'DATE_TIME', pattern: 'dd/mm/yyyy hh:mm:ss' } };
  if (report) {
    requests.push(
      { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 16 }, mergeType: 'MERGE_ALL' } },
      { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: rgb('17365D'), textFormat: { foregroundColor: rgb('FFFFFF'), bold: true, fontSize: 20 } } }, fields: 'userEnteredFormat' } },
      { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 2 }, cell: { userEnteredFormat: dateFormat }, fields: 'userEnteredFormat.numberFormat' } },
      { repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 3, endColumnIndex: 4 }, cell: { userEnteredFormat: dateFormat }, fields: 'userEnteredFormat.numberFormat' } },
      { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 4 }, properties: { pixelSize: 220 }, fields: 'pixelSize' } },
      { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 44 }, fields: 'pixelSize' } },
      { repeatCell: { range: { sheetId, startRowIndex: 13, startColumnIndex: 12, endColumnIndex: 13 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '0.0' } } }, fields: 'userEnteredFormat.numberFormat' } },
    );
    for (const i of [3, 7, 8, 9, 10]) {
      requests.push({ mergeCells: { range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 1, endColumnIndex: 16 }, mergeType: 'MERGE_ALL' } },
        { repeatCell: { range: { sheetId, startRowIndex: i, endRowIndex: i + 1 }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP', textFormat: { foregroundColor: rgb('475569'), fontSize: 10 } } }, fields: 'userEnteredFormat' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: i === 8 ? 42 : 30 }, fields: 'pixelSize' } });
    }
    for (const [state, hex] of [['Đang chạy', 'DCFCE7'], ['Nghi bị kẹt', 'FEE2E2'], ['Tạm dừng', 'F1F5F9'], ['Chờ đăng nhập', 'FEF3C7'], ['Đang làm tác vụ', 'DBEAFE']]) {
      requests.push({ addConditionalFormatRule: { index: 0, rule: { ranges: [{ sheetId, startRowIndex: 13, startColumnIndex: 0, endColumnIndex: 16 }], booleanRule: { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: `=$D14="${state}"` }] }, format: { backgroundColor: rgb(hex) } } } } });
    }
  } else {
    requests.push({ repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: dateFormat }, fields: 'userEnteredFormat.numberFormat' } });
  }
  return requests;
}

export async function syncReport() {
  const credential = credentials(env('GOOGLESHEET'));
  const auth = new JWT({ ...credential, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  let token: string | null | undefined;
  try { token = (await auth.getAccessToken()).token; } catch { throw new Error('Google authentication failed. Check the service-account key in GOOGLESHEET.'); }
  if (!token) throw new Error('Google did not return an access token');
  const id = process.env.HERMES_SPREADSHEET_ID ?? '1Hh7AWv8bzlZGti4DfqR5e0dFF43z0mr2mwm964rAk4M';
  const sourceUrl = process.env.HERMES_REPORT_URL ?? 'https://app.treogamenro.online/api/hermes-report.json';
  if (new URL(sourceUrl).protocol !== 'https:') throw new Error('Source URL must use HTTPS');
  const source = await fetch(sourceUrl, { headers: { Authorization: `Basic ${Buffer.from(`${env('HERMES_REPORT_USERNAME')}:${env('HERMES_REPORT_PASSWORD')}`).toString('base64')}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!source.ok) throw new Error(`Hermes source returned HTTP ${source.status}`);
  const report = parseReport(await source.json());
  const api = async <T>(path: string, body?: object): Promise<T> => {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}${path}`, { method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000), cache: 'no-store' });
    if (!response.ok) throw new Error(`Google Sheets HTTP ${response.status}${response.status === 403 ? ': enable Sheets API and share the sheet with service-account email as Editor' : ''}`);
    return response.json() as Promise<T>;
  };
  const metadata = await api<{ sheets: { properties: Props }[] }>('?fields=sheets.properties');
  const sheets = new Map(metadata.sheets.map((s) => [s.properties.title, s.properties]));
  const previous = sheets.has(NAMES[0]) ? (await api<{ values?: Cell[][] }>(`/values/${encodeURIComponent(`'${NAMES[0]}'!A1:Q1015`)}?valueRenderOption=UNFORMATTED_VALUE`)).values ?? [] : [];
  if (shouldSkip(report, previous[2]?.[1])) return { status: 'skipped', reason: report.stale ? 'source_stale' : 'snapshot_not_new', measuredAt: report.measuredAt };
  const { rows, summary, accountHistory } = buildRows(report, previous);
  const requests: BatchRequest[] = [];
  let nextId = Math.max(0, ...metadata.sheets.map((s) => s.properties.sheetId)) + 1;
  for (const title of NAMES) {
    if (!sheets.has(title)) {
      const properties = { title, sheetId: nextId++, gridProperties: { rowCount: 1200, columnCount: 17 } };
      requests.push({ addSheet: { properties } });
      sheets.set(title, properties);
      requests.push(...formatting(properties.sheetId, title === NAMES[0]));
      if (title === NAMES[1]) requests.push(update(properties.sheetId, [SUMMARY_HEADERS]),
        { repeatCell: { range: { sheetId: properties.sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 }, cell: { userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: 'dd/mm/yyyy hh:mm:ss' } } }, fields: 'userEnteredFormat.numberFormat' } });
      if (title === NAMES[2]) requests.push(update(properties.sheetId, [['Thời điểm đo (VN)', ...HEADERS]]));
    }
  }
  const reportId = sheets.get(NAMES[0])!.sheetId;
  requests.push(update(reportId, rows),
    { setBasicFilter: { filter: { range: { sheetId: reportId, startRowIndex: 12, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 16 } } } },
    { appendCells: { sheetId: sheets.get(NAMES[1])!.sheetId, rows: cells([summary]), fields: 'userEnteredValue' } });
  if (accountHistory.length) requests.push({ appendCells: { sheetId: sheets.get(NAMES[2])!.sheetId, rows: cells(accountHistory), fields: 'userEnteredValue' } });
  await api(':batchUpdate', { requests });
  return { status: 'updated', measuredAt: report.measuredAt, accounts: report.accounts.length, url: `https://docs.google.com/spreadsheets/d/${id}/edit` };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/hermes-report.ts')) {
  syncReport().then((r) => console.log(JSON.stringify(r))).catch((error) => {
    console.error(error instanceof Error ? error.message : 'Report sync failed'); process.exitCode = 1;
  });
}
