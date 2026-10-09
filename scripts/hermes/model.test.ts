import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRows, parseReport, sheetDate, shouldSkip, type Report } from './model';
import { credentials } from '../hermes-report';

const report: Report = {
  at: '2026-10-09T17:15:01+07:00', measuredAt: '2026-10-09T17:15:00+07:00', stale: false,
  period: { from: '2026-10-09T17:14:59+07:00', to: '2026-10-09T17:15:00+07:00', minutes: 0 },
  summary: { authorized: 1, onlineReadyFresh: 1, intentionalStop: 0, suspectedStalls: 0, nativeBusy: 0, smGain: 0, petSMGain: 0 },
  hermes: { watcher: 'running', aiReview: 'reviewing' }, hot: [],
  accounts: [{ nick: 'test', sv: 5, goal: 'pet_training', state: 'up', sm: 1000, smGain: 0,
    tn: 200, tnNetChange: 0, tn60s: 5, sm60s: 7, petSM: null, petSMGain: null }],
};

test('initial sample preserves source zero and unknown samples', () => {
  const { rows } = buildRows(parseReport(report));
  assert.equal(rows[13][5], null);
  assert.equal(rows[13][10], null);
  assert.equal(rows[13][13], 0);
  assert.equal(rows[13][8], 5);
});
test('poll deltas use balances and real interval; negative TN and zero baseline work', () => {
  const previous = buildRows({ ...report, measuredAt: '2026-10-09T17:00:00+07:00', accounts: [{ ...report.accounts[0], sm: 0, tn: 300 }] }).rows;
  const { rows } = buildRows(report, previous);
  assert.equal(rows[13][5], 1000);
  assert.equal(rows[13][7], -100);
  assert.equal(rows[13][12], 15);
  assert.equal(rows[13][11], null);
});
test('server number is part of account identity', () => {
  const previous = buildRows({ ...report, measuredAt: '2026-10-09T17:00:00+07:00', accounts: [{ ...report.accounts[0], sv: 17 }] }).rows;
  assert.equal(buildRows(report, previous).rows[13][5], null);
});
test('duplicate, older and stale snapshots are skipped', () => {
  assert.equal(shouldSkip(report, report.measuredAt), true);
  assert.equal(shouldSkip(report, '2026-10-09T18:00:00+07:00'), true);
  assert.equal(shouldSkip({ ...report, stale: true }, undefined), true);
  assert.equal(shouldSkip(report, '2026-10-09T17:00:00+07:00'), false);
});
test('schema validation rejects duplicate accounts and invalid numbers', () => {
  assert.throws(() => parseReport({ ...report, accounts: [...report.accounts, ...report.accounts] }), /Duplicate/);
  assert.throws(() => parseReport({ ...report, accounts: [{ ...report.accounts[0], sm: '1000' }] }), /Invalid account/);
  assert.equal(sheetDate('2026-10-09T17:00:00+07:00') % 1 > 0.7, true);
});
test('GOOGLESHEET accepts service-account JSON and rejects API keys without exposing them', () => {
  assert.deepEqual(credentials(JSON.stringify({ type: 'service_account', client_email: 'report@example.test', private_key: 'test\\nkey' })), { email: 'report@example.test', key: 'test\nkey' });
  assert.throws(() => credentials('AIza-not-a-service-account'), /API key/);
  assert.throws(() => credentials('{}'), /missing/);
});
test('source alerts support both stalled duration and top gain', () => {
  const r = parseReport({ ...report, hot: [{ nick: 'test', event: 'top_sm_gain', gain: 500 }, { nick: 'other', event: 'stalled', seconds: 120 }] });
  const text = buildRows(r).rows[9][1] as string;
  assert.match(text, /500 SM/);
  assert.match(text, /2 phút/);
  assert.doesNotMatch(text, /NaN/);
});
