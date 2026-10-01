# 002: Kafka protocol, with Redpanda as the broker

- **Status:** Accepted
- **Date:** 2026-09-30

## Context

A scan fans out into slow, retryable work across services written in different languages. The API publishes an event, the Go findings service matches advisories, and the Python triage service investigates each finding.

These services need a durable log that they can consume at their own pace, replay when needed, and scale using consumer groups.

Production runs on one small server that also hosts Postgres and every application service, and the whole system is operated by one person.

There are two separate decisions here:

1. Which protocol should the application code depend on?
2. Which broker should actually run in production?

## Decision

Services depend only on the **Kafka protocol**.

They use standard Kafka clients and Kafka concepts such as topics, partitions, consumer groups, offsets, and headers:

- `franz-go` in Go
- `confluent-kafka` in Python
- `@confluentinc/kafka-javascript` in TypeScript

The broker is a **single Redpanda node**: a Docker container locally, and the official Helm chart or a small StatefulSet in production.

Service code must not use Redpanda-specific APIs.

`rpk` and Redpanda Console are operator tools only. If the built-in Schema Registry is used, it is accessed through its Confluent-compatible API.

Event schemas live in:

`contracts/events/`

To make sure this separation remains true, CI runs the event integration tests against both Redpanda and Apache Kafka.

## Why Redpanda

| Factor          | Redpanda                                                                   | Apache Kafka (KRaft)                                   |
| --------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| What you deploy | One binary with Schema Registry and HTTP proxy built in                    | The broker only; Schema Registry is a separate service |
| Tuning          | Few settings, no JVM                                                       | JVM heap and garbage-collection tuning                 |
| Admin tooling   | `rpk` for topics, consumer groups and cluster admin, plus Redpanda Console | Several `kafka-*.sh` scripts; UIs are third-party      |
| Local start-up  | Seconds                                                                    | Slower because of the JVM, but still fine              |

For a one-person, one-node setup, the simpler packaging and lower operational overhead are what make Redpanda the better fit here.

Memory is not the deciding factor. Since Kafka dropped ZooKeeper, a single KRaft node can run in roughly 1 to 1.5 GB of memory, which is close to Redpanda at this scale.

## Consequences

The services get real Kafka semantics, including:

- partitions
- consumer groups
- offsets
- replay

At the same time, there is less infrastructure to operate.

Because the services depend only on the Kafka protocol, moving to Apache Kafka or a managed service such as AWS MSK or Confluent Cloud should be a configuration change rather than an application rewrite.

The CI checks against both Redpanda and Apache Kafka help verify that portability.

A single broker provides no high availability.

A production cluster that needs high availability would require three brokers, a replication factor of `3`, and:

`min.insync.replicas=2`

Redpanda Community Edition is source-available under BSL 1.1 rather than OSI open source, which may not be acceptable in some organisations.

Its ecosystem is also smaller than Kafka's.

Kafka Connect and Kafka Streams generally work against Redpanda because it uses the Kafka protocol, but neither is used in this system.

## When to revisit

Revisit this decision if:

- the target environment already runs Kafka or uses a managed Kafka service
- a policy requires OSI-licensed infrastructure
- Kafka Connect or Kafka Streams become central to the design

## Alternatives considered

| Option                                 | Why not                                                                                                                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apache Kafka (KRaft)                   | Same protocol, Apache 2.0 licensed, and comparable in memory at this size, but there is more to operate: a separate Schema Registry, JVM tuning, and several admin scripts. It remains the portability target in CI. |
| NATS JetStream                         | Lighter and simpler, but not Kafka-compatible, and Kafka is the more widely used streaming protocol.                                                                                                                 |
| RabbitMQ                               | More queue-oriented. Consumed messages are not kept as a replayable log in the same way.                                                                                                                             |
| A Postgres queue (`SKIP LOCKED`, pgmq) | The simplest option, but it does not provide the same replayable log or consumer-group model.                                                                                                                        |
| AWS SQS and SNS                        | A good managed option, but it adds cost and ties the project more closely to AWS.                                                                                                                                    |
