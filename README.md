# flowkeeper-web

FlowKeeper's browser client — React 19 + Vite + TypeScript, no server rendering
(this is a logged-in dashboard, nothing here needs SEO). See the
[FlowKeeper Blueprint](https://claude.ai/code/artifact/4121aef7-c600-4f2d-bf55-fb27e6fba16f)
for the full architecture and the reasoning behind these choices.

## Running locally

Needs `flowkeeper-infra`'s Postgres + Keycloak running, and `flowkeeper-api` running
against them (see those repos' READMEs).

```
npm install
npm run dev
```

Run the test suite with `npm run test` (Vitest + React Testing Library).

Defaults to `http://localhost:8080` for the API and `http://localhost:8082/realms/flowkeeper`
for Keycloak — see `.env.example` if either needs to point somewhere else. (8082, not
Keycloak's more obvious 8081 — that's Expo's Metro dev server default port, which
`flowkeeper-mobile` will also be running locally.)

## Pages

- **Start** (`/`) — logged out: log in or create an account (Keycloak's own login
  page offers registration, since self-registration is enabled on the realm)
- **Landing** (`/app`) — ongoing (open) activities, and logging a new one
- **Your information** (`/app/profile`) — display name, timezone, language, avatar —
  reached via the small account icon in the header's top-right corner
- **Statistics** (`/app/statistics`) — day/week/month rollups for the signed-in user

## How auth works

`react-oidc-context` drives the Authorization Code + PKCE flow against Keycloak.
`AppLayout` fetches `GET /api/v1/me` once per session; a 404 there means this is the
user's very first login, so it calls `POST /api/v1/registration` (idempotent) and
retries — after that, every page gets the profile via `useOutletContext`.

## API client

Hand-written, typed to match `flowkeeper-api`'s DTOs exactly (`src/api/types.ts`).
Generating this from the live OpenAPI spec (`/v3/api-docs`) is the intended long-term
approach — not wired up yet since it needs a running API instance to generate
against. Keep `types.ts` in sync by hand until then.

## Docker

`Dockerfile` builds the production image: a Vite build served by nginx
(`nginx.conf` handles SPA client-side routing — any unmatched path falls back to
`index.html`). Used by `flowkeeper-infra`'s production Compose file via `${WEB_IMAGE}`.

## CI/CD

`.github/workflows/ci.yml`: every PR runs the build and test suite. Every merge to
`main` additionally builds and pushes the image to `ghcr.io/adez90/flowkeeper-web`
and deploys it to the staging server over SSH. See `flowkeeper-infra`'s
`DEPLOYMENT.md` for the server setup and required secrets.

## What's here vs. what's next

- [x] Login/registration via Keycloak (PKCE), landing page, profile editing,
      event creation + completion, personal statistics
- [x] Test coverage (Vitest + React Testing Library) for every page/component
      with real logic — form submission, error states, list rendering, the
      route guard, period switching. Dialogs' API calls are mocked; nothing
      here exercises a real backend
- [ ] A direct "Register" deep link on the start page (currently both buttons
      go to Keycloak's login page, which itself offers registration) — Keycloak
      supports this via its `/registrations` endpoint, not wired up without a
      running realm to verify the exact behavior against
- [ ] OpenAPI-generated client (currently hand-written)
- [ ] Organisation/team views — waiting on the sharing & visibility model
