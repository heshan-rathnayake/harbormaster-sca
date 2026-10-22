# 006: Next.js for the console

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

Developers and security leads need a web console. It will show a findings table that can hold thousands of rows, a page for each finding with the evidence behind its triage verdict, and live progress while a scan runs.

The console owns no data. Everything it shows comes from the public API ([ADR 004](004-nestjs-api.md)), the same `/api/v1` that the CLI uses. The API will also own sign-in and sessions.

Two questions need answers before the first page is built: which framework to use, and how the browser reaches the API. The second matters more, because session cookies and protection against cross-site request forgery depend on it. If the console and the API live on different origins, every request from the browser is a cross-origin request. The API then needs CORS rules that allow cookies, and getting those rules wrong is a common security bug.

## Decision

The console is a Next.js application using the App Router, written in TypeScript with React. Tailwind CSS and shadcn/ui provide the styling and components. shadcn/ui copies each component's source into the repository, so the components can be read and changed like the rest of our code. Server components render the first load of each page, and TanStack Query handles refetching in the browser.

The console is a thin client of the public API. It has no database connection, no authentication library and no business logic, and its route handlers don't grow into a second API. When the console needs data that the API doesn't offer, the API gets a new endpoint, which every other client can then use too.

The console reaches the API in two ways:

| Caller            | Address it uses                            | How the request reaches the API                      |
| ----------------- | ------------------------------------------ | ---------------------------------------------------- |
| The browser       | `/api/...` on the console's own origin     | A Next.js rewrite locally; the ingress in production |
| Server components | `API_URL` from the console's configuration | Directly, over the internal network                  |

The browser only ever talks to the console's origin, so the API needs no CORS rules and the session cookie stays first-party. Server components call the API directly, so they can also reach endpoints that aren't routed through the public origin, such as the `/readyz` health check. Once sign-in exists, server components pass the user's session cookie on to the API unchanged; the console never stores or decodes the session token.

The API enforces every access rule. Next.js middleware may send a signed-out user to the sign-in page as a convenience, but it is never the security check.

Pages that show live or user-specific data render on every request. Anything Next.js caches is cached on purpose.

## Consequences

Large pages arrive as HTML rendered by server components, so the findings table shows data without waiting for client-side JavaScript. The rewrite gives the same single-origin setup locally as in production, with no extra proxy to run. And because the console uses only the public API, it can be rebuilt or replaced without changing the API.

The costs:

- The console is one more Node.js server to run and deploy, where a static single-page app would need none.
- Next.js changes its rendering and caching defaults between major versions, so each page must state how it renders, and each major upgrade needs its upgrade guide read first.
- Next.js has had serious security advisories, such as CVE-2025-29927, which let a crafted request skip middleware. The framework must be kept patched, and keeping access checks in the API limits the damage such bugs can do.

## Alternatives considered

| Option                                                                              | Why not                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A React single-page app built with Vite                                             | The strongest alternative: static files, a simpler model and no server to run. But without server rendering, the findings table shows a loading state until the JavaScript has downloaded and fetched the data |
| React Router in framework mode (formerly Remix)                                     | Capable and close to web standards, but with a smaller ecosystem; shadcn/ui and most examples target Next.js first                                                                                             |
| Serving the console from the NestJS API                                             | One deployable, but every console change becomes an API release, and one process does two jobs                                                                                                                 |
| Next.js as a backend-for-frontend that holds sessions and calls the API with tokens | Splits authentication across two applications, when the API should be the only place that handles sign-in and sessions                                                                                         |
| SvelteKit or Nuxt                                                                   | Capable frameworks, but the console builds on React libraries (TanStack Query, shadcn/ui), and the planned mobile app uses React Native                                                                        |
