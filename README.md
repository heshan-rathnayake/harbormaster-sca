# Harbormaster

**Find the dependency vulnerabilities that actually matter.**

Harbormaster is an open-source software composition analysis (SCA) platform. It builds an SBOM from your lockfiles, matches every dependency against public advisories, and uses an AI agent to check whether each vulnerability is reachable from your code, with the evidence and a safe fix.

> [!WARNING]
> **Status: under construction.** Phase 1 of 9 (foundations). Nothing here is ready to use yet.

## Why

Dependency scanners report hundreds of advisories, and most of them don't affect you. Teams either drown in alerts or stop reading them. Harbormaster ranks findings by whether the vulnerable code is reachable, whether it's exploited in the wild (CISA KEV, FIRST EPSS) and whether a safe upgrade exists, so the one that matters stands out.

## How it will work

1. A Rust CLI reads your lockfiles and uploads a CycloneDX SBOM.
2. The API stores it and publishes an event.
3. A Go service matches packages against OSV advisories and adds EPSS and KEV data.
4. A Python service runs an AI triage agent that looks for evidence of reachability in your code.
5. A Next.js console shows the findings, the verdicts and how each one was reached.

Architecture diagrams and decision records will live in `docs/`.

## Roadmap

| Phase | Focus                                        | Status      |
| ----- | -------------------------------------------- | ----------- |
| 1     | Foundations: monorepo, services, tracing, CI | In progress |
| 2     | CLI and SBOM ingest                          | Planned     |
| 3     | Vulnerability matching                       | Planned     |
| 4     | Findings console                             | Planned     |
| 5     | AI triage                                    | Planned     |
| 6     | Production deployment                        | Planned     |

Progress is tracked on the [project board](https://github.com/users/heshan-rathnayake/projects/3).

## Development

You need Linux or WSL2, Docker, [mise](https://mise.jdx.dev) and [rustup](https://rustup.rs). After cloning:

```bash
mise trust && mise install   # pinned tool versions from .mise.toml
task setup                   # dependencies and git hooks
```

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE)
