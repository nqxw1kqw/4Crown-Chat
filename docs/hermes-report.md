# Hermes report on GitHub Actions

The public-repository workflow runs every 15 minutes (minutes 03, 18, 33, 48 UTC) using the `GOOGLESHEET` secret directly. It does not require Vercel Pro, an open website, or this computer to stay on. The code is separate from the chat app.

`GOOGLESHEET` must contain the full JSON key for a Google service account (`type: service_account`, `client_email`, `private_key`). A Google API key cannot authorize spreadsheet writes. Enable Google Sheets API in that service-account project and share the spreadsheet with its email as Editor.

The source uses two separate repository secrets: `HERMES_REPORT_USERNAME` and `HERMES_REPORT_PASSWORD`. No credentials are committed or written into the spreadsheet.

Run **Actions → Hermes report every 15 minutes → Run workflow** to validate the credentials and produce the first report. After that succeeds, set repository Actions variable `HERMES_REPORT_ENABLED=true` to activate scheduled runs. Leave it unset to pause the schedule without repeated failures.

Only the three reserved report tabs are managed: `Hermes Report` (current overview and accounts), `Hermes History` (snapshot summaries), and `Hermes Accounts` (account history). Existing unrelated tabs are preserved; keep manual notes on separate tabs. Dates display in Vietnam time, missing samples are blank, states have colors, headers are frozen, and the current table has filters.

The script checks measuredAt, skips stale/repeated/older snapshots, and writes the current view and both history logs together in one atomic batch. Workflow concurrency prevents two scheduled/manual runs from racing. Delta columns compare account balances with the previous successful poll, retaining negative changes. Native 60-second rates and source-period gains stay separate; TN balance changes are not total earnings. It does not invent samples missed between polls.

GitHub scheduling may be delayed or skipped under load and public-repository schedules are disabled after 60 days without repository activity. This free scheduler is not a guaranteed exact-time or uninterrupted service.

Sources:

- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://developers.google.com/workspace/sheets/api/guides/batchupdate
