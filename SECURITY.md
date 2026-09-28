# Security policy

## Supported versions
Harbormaster is pre-release. Only the latest commit on `main` receives security fixes.

## Reporting a vulnerability
Please **don't open a public issue**. Report privately through GitHub:
[Report a vulnerability](https://github.com/heshan-rathnayake/harbormaster-sca/security/advisories/new)

Include:
- what's affected (component, file or endpoint, and the version or commit)
- steps to reproduce, or a proof of concept
- the impact you expect

## What to expect
This project has one maintainer, so responses are best effort:
- acknowledgement within 7 days
- an initial assessment within 14 days
- a fix or mitigation plan agreed with you before anything is published

You'll be credited in the advisory unless you'd prefer not to be.

## Scope
In scope: the code in this repository, and the hosted demo once it exists.

Out of scope:
- `harbormaster-demo-app`, which is intentionally vulnerable
- the accuracy of third-party advisory data (OSV, EPSS, CISA KEV); please open a normal issue instead
- denial-of-service or load testing against the hosted demo
- social engineering

## Safe harbor
Good-faith research that follows this policy is welcome. Don't access other people's data, and stop testing once you've shown the issue.
