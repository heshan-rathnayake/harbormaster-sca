#!/usr/bin/env bash
# Creates the topics the services expect. Safe to re-run: existing topics are skipped.
set -euo pipefail

BROKERS=redpanda:9092
TOPICS=(
  harbormaster.debug.ping.v1
)

for topic in "${TOPICS[@]}"; do
  if rpk topic describe "$topic" -X brokers="$BROKERS" >/dev/null 2>&1; then
    echo "exists: $topic"
  else
    rpk topic create "$topic" -X brokers="$BROKERS" \
      --partitions 3 --replicas 1 --topic-config retention.ms=604800000
  fi
done
