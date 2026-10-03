# 004: NestJS on Fastify for the public API

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

The API has many kinds of client: a Rust CLI, a web console and GitHub webhooks, with a mobile app and AI assistants (through MCP) planned later. They're written in different languages, so the API needs a language-neutral contract, which means OpenAPI. The API will also grow to cover authentication, multi-tenancy, billing and live updates, so cross-cutting concerns such as auth guards, validation and tenancy need a clear, consistent place in the code. The same codebase also runs the outbox relay, which publishes events to Kafka.

## Decision

The API uses NestJS on the Fastify adapter.

Zod schemas validate every request, response and the environment configuration, so a bad input or a missing variable fails fast with a clear error. Where it helps, the same schemas are shared with the console.

The OpenAPI 3.1 specification is generated from the code. It's served at `/api/v1/openapi.json`, with an interactive reference at `/api/v1/docs`. A copy is committed to `contracts/openapi/`, and CI fails if the code and the committed copy drift apart.

Prisma manages the API's `core` schema and connects as the API's own database role. Queries always use `select` rather than `include`, so sensitive columns can't leak into responses by accident.

The outbox relay and event consumers run from the same codebase through a second entrypoint, a standalone Nest application, deployed as a separate process.

## Consequences

Modules, dependency injection and guards give authentication and tenancy an obvious home, and the generated OpenAPI lets clients in any language be generated or tested against the contract.

The costs: NestJS adds more structure and boilerplate than a minimal framework, and it starts more slowly than bare Fastify, which doesn't matter at this scale. Prisma adds a code-generation step (`prisma generate`) to the build.

## Alternatives considered

| Option                 | Why not                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Express                | Mature, but has no structure; modules, dependency injection and validation would all be assembled by hand |
| Fastify alone, or Hono | Lean and fast, with the same problem: the structure NestJS provides would have to be built by hand        |
| tRPC                   | Excellent when every client is TypeScript, but the Rust CLI needs an OpenAPI contract                     |
| GraphQL                | No client needs flexible graph queries; REST with OpenAPI is simpler to secure, cache and document        |
