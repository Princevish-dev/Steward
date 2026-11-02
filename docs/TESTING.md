# Testing Steward

Run checks serially so `next build` does not race `tsc` over generated `.next` types:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright test --project=desktop
npx playwright test --project=mobile
```

Playwright expects the demo application and its configured database. The browser can be installed with `npx playwright install chromium`; set `PLAYWRIGHT_BROWSERS_PATH` if using a workspace-local browser cache. Do not use `force: true` in user-facing interaction checks. The mobile project uses the configured 390px viewport.

## Release verification notes

- The database migration hook intentionally skips migrations during `next build` when `DATABASE_URL` is absent.
- Playwright login is rate limited; E2E helpers establish the browser session through the UI and reuse it per worker.
- Keep service credentials out of command output and test reports.
- A passing unit or browser suite does not verify PayPal sandbox settlement, production deployment, or live database state. Record those checks separately in the release report.
