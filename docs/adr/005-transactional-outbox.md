# 005: Transactional outbox for publishing events

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

Services change their own data and then tell other services about it. When a scan is uploaded, for example, the API saves it and publishes an event so that the findings service can start matching.

Postgres and the broker ([ADR 002](002-redpanda-event-backbone.md)) are separate systems, and no transaction covers both. Writing to one and then the other is known as the dual-write problem, and it fails in two ways:

- **Commit, then publish.** If the process crashes or the broker is unavailable between the two steps, the event is lost. The scan is saved, but nothing ever processes it.
- **Publish, then commit.** If the commit fails, the event describes something that never happened.

Retrying inside the request doesn't solve either case, because the process can stop between the two steps.

## Decision

Every service that changes data and emits events uses a transactional outbox.

Code that handles a request never publishes to the broker. In the same database transaction as the change, it inserts a row into the service's own `outbox` table. The row holds the topic, the key, the payload and the headers, including the trace context. A transaction is all-or-nothing, so the change and its event are saved together or not at all.

A relay loop then publishes the rows. It claims a batch of unpublished rows, oldest first, publishes them, waits for the broker to acknowledge them, marks them as published and commits. The rows are claimed with `FOR UPDATE SKIP LOCKED`, so two relays never publish the same row at the same time. If publishing fails, the rows stay unpublished and the relay tries again after a backoff. A cleanup job deletes published rows after seven days.

Each service has its own outbox table in its own schema ([ADR 003](003-schema-per-service.md)) and runs its own relay:

| Service  | Where the relay runs                                                             |
| -------- | -------------------------------------------------------------------------------- |
| API      | A separate process started from the same codebase ([ADR 004](004-nestjs-api.md)) |
| Findings | A goroutine inside the service                                                   |
| Triage   | An asyncio task inside the service                                               |

The API's relay is a separate process for three reasons:

- The API can run as several copies, and one relay is enough.
- A slow or unavailable broker can't slow down HTTP requests.
- Only the relay needs broker credentials, so the internet-facing process holds none.

The findings and triage services are internal workers that already connect to the broker as consumers, so their relays run inside the service.

Delivery is at-least-once. Every event carries a unique id, and each consumer records the ids it has handled and skips any it has seen before.

## Consequences

No event is lost, and no event describes a change that didn't happen. The API keeps accepting requests while the broker is down: events wait in the table and are published when it returns. The age of the oldest unpublished row, the outbox lag, is one number that shows whether publishing is healthy.

The costs:

- An event can be delivered more than once, for example when the relay stops after publishing a row but before marking it. Every consumer must be idempotent.
- Polling delays each event by up to one poll interval, which is 200 to 500 ms.
- The API has one more process to run, deploy and monitor.
- Every transaction that emits an event makes one extra insert, and the table needs the cleanup job.

## Alternatives considered

| Option                                          | Why not                                                                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Publish straight after the commit               | The simplest option, but a crash or a broker outage between the two steps loses the event                                              |
| Change data capture with Debezium               | Reads the database's change log, so it needs no polling, but it adds Kafka Connect and a JVM to one small production server            |
| Redpanda Connect's Postgres change data capture | Lighter than Debezium, but still another component and a replication slot to operate; worth revisiting if polling becomes a bottleneck |
| Postgres `LISTEN/NOTIFY` on its own             | Notifications aren't stored, so any sent while the relay is down are lost                                                              |
| The API's relay inside the API process          | One process fewer, but every API copy would poll, and the internet-facing process would hold broker credentials                        |
