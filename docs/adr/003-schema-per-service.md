# 003: One Postgres, one schema per service

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Three services need to store data: the API, the findings service, and the triage service.

Each service should own its own data. One service should not be able to quietly write into tables that belong to another service.

At the same time, the project runs on a single small server, so running a completely separate Postgres instance for every service would add unnecessary cost and operational overhead.

The API also needs to display findings and verdicts that are owned by the findings and triage services.

## Decision

Use a single Postgres cluster, with one schema per service:

- `core` for the API
- `matching` for the findings service
- `triage` for the triage service

Each service connects using its own database role, and that role can write only to the schema owned by that service.

Each service is also responsible for its own database migrations, using the standard migration tool for its language and framework:

- API: Prisma Migrate
- Findings service: `golang-migrate`
- Triage service: Alembic

When one service needs to read data owned by another service, it does so through a small set of read-only views.

Examples include:

- `matching.findings_v`
- `triage.latest_verdicts_v`
- `triage.agent_steps_v`

The API's database role is given `SELECT` access to these views, but not to the underlying tables.

The columns exposed by these views are treated as a versioned contract, similar to an API contract. Changes to them should therefore be made deliberately and with compatibility in mind.

Database-wide extensions such as `pgvector` are installed once through a bootstrap migration owned by the infrastructure.

## Consequences

This gives us clear data ownership while still keeping the operational simplicity of a single Postgres instance.

The database itself enforces the boundary between services, because each service can write only to its own schema.

The trade-off is that the project now has three migration tools, one for each service language, and each service is responsible for running its own migrations.

The read-only views also create some coupling between the API and the internal schemas of the findings and triage services.

That is acceptable for the first release.

The planned next step is to remove that dependency by giving the API its own read model, populated from events such as:

- `finding.updated`
- `verdict.created`

A single Postgres cluster also means there is one shared failure domain. If Postgres becomes unavailable, all three services are affected.

## Alternatives considered

| Option                                  | Why not                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| One shared schema                       | Data ownership becomes unclear very quickly, and any service could potentially write to tables owned by another service.     |
| A database per service                  | Provides stronger isolation, but would require more memory and significantly more operational work on a single small server. |
| Build an API read model from events now | Provides better decoupling from the beginning, but adds more implementation work before the first release.                   |
