# 001: Polyglot monorepo with pnpm, Turborepo and Task

- **Status:** Accepted
- **Date:** 2026-09-29


## Context
Harbormaster is made of several services written in different languages: a Rust CLI, a TypeScript API and console, a Go findings service and a Python triage service. Kotlin and a React Native app come later. The services share contracts (the event schemas and the OpenAPI spec), so many changes cross service boundaries. Adding a field to an event, for example, means touching the producer, the schema and every consumer. One person maintains the project, so the setup has to stay simple.

## Decision
Everything lives in one repository:

```text
apps/
  api/          NestJS API and the outbox relay
  console/      Next.js web console
services/
  findings/     Go
  triage/       Python (uv)
cli/            Rust workspace
contracts/
  events/       JSON Schemas for events
  openapi/      OpenAPI spec
packages/       shared TypeScript config and generated types
evals/          labelled cases for evaluating the AI triage
infra/          Terraform, Helm, Argo CD
docs/           decision records, architecture, runbooks
```

pnpm workspaces and Turborepo manage the TypeScript packages. Turborepo works out the order to build them in and caches the results. Task is the entry point for every language (`task up`, `task dev`, `task test`, `task lint`), and each task calls that language's own tool: `turbo`, `cargo`, `go` or `uv`. mise pins tool versions in `.mise.toml`, so every machine and CI runner uses the same ones. CI uses path filters, so a change that only touches Go runs only the Go jobs.

## Consequences
A change that spans services goes in one pull request, and the contracts live in one place. Anyone can read and run the whole system from a single clone.

The downside is that CI configuration grows with every language. One workflow per language, plus a shared end-to-end workflow, keeps that manageable. Turborepo also only understands the TypeScript packages, so Task has to tie the other languages together.

## Alternatives considered
| Option | Why not |
|---|---|
| Nx | Better polyglot support, but plugin-heavy |
| Bazel or Pants | Works well for very large codebases, but far too much overhead for a one-person project |
| One repository per service | Changes across services would need several coordinated PRs and version bumps, which costs more than it saves when one person maintains everything |
