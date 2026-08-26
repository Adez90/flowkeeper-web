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

Defaults to `http://localhost:8080` for the API and `http://localhost:8081/realms/flowkeeper`
for Keycloak — see `.env.example` if either needs to point somewhere else.

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

## What's here vs. what's next

- [x] Login/registration via Keycloak (PKCE), landing page, profile editing,
      event creation + completion, personal statistics
- [ ] A direct "Register" deep link on the start page (currently both buttons
      go to Keycloak's login page, which itself offers registration) — Keycloak
      supports this via its `/registrations` endpoint, not wired up without a
      running realm to verify the exact behavior against
- [ ] OpenAPI-generated client (currently hand-written)
- [ ] Organisation/team views — waiting on the sharing & visibility model
