# 007: Go for the findings service

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The findings service turns an uploaded SBOM into findings. For each scan it:

1. Consumes the event that says the scan's SBOM has been stored.
2. Reads the SBOM's components and asks OSV which vulnerabilities affect them, in batches of up to 1,000 packages.
3. Fetches the full record of every advisory it hasn't cached yet.
4. Adds exploit data, EPSS scores and the CISA KEV catalogue, which it refreshes daily.
5. Stores the findings, works out their priority and publishes an event when the scan is done.

Most of that time is spent waiting on OSV and Postgres, with many requests in flight at once. The service is an internal worker. It serves no public HTTP, only health checks and metrics. In production it shares one small server with Postgres, Redpanda and the other services, so its memory use matters.

Earlier decisions already assume the service is written in Go and set some of its rules:

- It lives in `services/findings`, and Task runs it, because Turborepo only understands the TypeScript packages ([ADR 001](001-polyglot-monorepo.md)).
- It uses the Kafka protocol only, with franz-go as the client ([ADR 002](002-redpanda-event-backbone.md)).
- It owns the `matching` schema and migrates it with golang-migrate ([ADR 003](003-schema-per-service.md)).
- It must handle repeated events safely, and it publishes its own events through an outbox ([ADR 005](005-transactional-outbox.md)).

This record explains why Go was chosen and sets out how the service is built.

## Decision

The findings service is written in Go. The Go version is pinned in `.mise.toml`, like the other tools.

The service is its own Go module, with one entry point and private packages:

```text
services/findings/
  go.mod
  cmd/findings/main.go   starts the service
  internal/              packages, added as they're needed (consume, osv, findings, priority, store, outbox)
  migrations/            golang-migrate files for the matching schema
  Taskfile.yml           included in the root Taskfile as `findings`
```

The standard library comes first:

- `net/http` serves `/healthz` and `/readyz`, with the same meaning as the API's.
- `log/slog` writes JSON logs.
- `context` carries timeouts and cancellation through every call. On SIGTERM, `signal.NotifyContext` cancels it: the service stops fetching new events, lets the current one finish, commits its offset and closes its connections.
- Configuration comes from environment variables, read into a typed struct when the service starts. An invalid or missing value stops the service with a clear message, as it does in the API.

Libraries are added only where the standard library falls short:

| Need                | Library                          | Why                                                                                                                              |
| ------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Kafka               | franz-go                         | Named in ADR 002. Written in pure Go, so it builds without a C toolchain; the API's client wraps the C library librdkafka        |
| Postgres            | pgx v5                           | A native Postgres driver with connection pooling, and `COPY` for bulk inserts                                                    |
| Queries             | sqlc                             | Generates type-safe Go functions from hand-written SQL, and reports a query that doesn't match the schema when it generates them |
| Migrations          | golang-migrate                   | Named in ADR 003. Migrations are plain SQL files                                                                                 |
| Bounded concurrency | `errgroup` (`golang.org/x/sync`) | Runs requests in parallel up to a fixed limit, and cancels the rest when one fails                                               |

The service consumes events as one consumer group, with automatic offset commits turned off. It commits an event's offset only after it has handled the event, so a crash means the event is delivered again rather than lost. In the same transaction as the findings it writes, it records the event's id from the `ce_id` header, and it skips any id it has already handled, as ADR 005 requires.

The findings service is the only writer of findings. It recalculates a finding's priority whenever a triage verdict or the exploit data changes. Priority is a pure function: the same inputs always give the same result, with no I/O. Its tests are tables of cases. The API shows a finding's priority but never calculates it.

`gofmt`, `go vet` and golangci-lint check the code, and `go test` runs the tests, written as table-driven tests. The root Taskfile's `lint`, `test` and `build` tasks run the service's own tasks alongside Turborepo, so `task test` still checks the whole repository.

## Consequences

Goroutines and `errgroup` fit the work: many requests in flight, with a limit that keeps the load on OSV and on the server under control. Because every call takes a `context`, timeouts and shutdown work the same way throughout the service. The service compiles to a single static binary, so its container image needs no language runtime, and a service like this typically uses tens of megabytes of memory.

The costs:

- A third toolchain. CI, linting, dependency updates and image builds each need a Go version.
- No code is shared with the TypeScript apps. Event shapes are shared only through the JSON Schemas in `contracts/events/`, and both sides must be kept in line with them.
- Priority logic lives in Go. Changing how priority is calculated is a findings service change, even when the console is what prompted it.

## Alternatives considered

| Option                                    | Why not                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A TypeScript worker in the API's codebase | Would work and reuse the API's tooling, but each Node.js process uses more memory, and the matching code would ship with every API release |
| Rust                                      | Already used for the CLI, but slower to iterate on for a network service, and its async ecosystem is harder to work with                   |
| Python                                    | Used for the triage service because of its AI libraries. For high-volume matching it is slower and uses more memory than Go                |
| Kotlin on the JVM                         | A mature ecosystem, but a JVM uses more memory than a Go binary on a shared server                                                         |
