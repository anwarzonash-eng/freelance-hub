# Roadmap

Planned work on this project:

## Security
- [ ] Move OpenAI and job-API calls from the browser (`NEXT_PUBLIC_*` keys) to server-side route handlers
- [ ] Add proper route protection in middleware and remove `middleware1.ts`
- [ ] Rotate to short-lived tokens for the backend API

## Code quality
- [ ] Remove leftover copies (`page copy.tsx`, `job_matcher copy.ts`) and dead code
- [ ] Replace `any` with typed API models and enable ESLint in CI
- [ ] Split very large components (`JobCVModal`, `createDynamicPersonalWebsite`)
- [ ] Rename the remaining `upwork`-named routes, enums and types to platform-neutral names

## Features
- [ ] Support more job sources behind a common interface
- [ ] Saved searches and email alerts for new matching jobs
- [ ] Proposal templates and A/B tracking of cover letters
- [ ] Analytics dashboard for win rate per source and skill

## Testing and DevOps
- [ ] Unit tests (Vitest) and Playwright end-to-end tests
- [ ] GitHub Actions for lint, type-check and build
- [ ] Add a Dockerfile
