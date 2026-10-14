# Repository rules

- Keep all type/content checks, builds, desktop/mobile browser tests and Pages deployment gates.
- GitHub Actions stays within the free allowance and the $0 budget. Diagnostic screenshots, logs, test reports and JSON evidence must never be uploaded, on success or failure. Use runner-local files, Actions logs and Job Summary.
- The only current artifact exception is `actions/upload-pages-artifact`: `dist/` is consumed by `actions/deploy-pages` in another job. Upload only for a main deployment, retain for 1 day, and never remove it without an equivalent verified deployment path.
- `npm run check` includes `scripts/ci-policy.test.mjs`. New functional exceptions require a verified consumer, minimal retention and an explicit guard update. Never weaken the guard for diagnostics.
- Keep useful dependency caches. Never enable paid runners, raise budgets, add billing details, or cancel a production deployment already running.
