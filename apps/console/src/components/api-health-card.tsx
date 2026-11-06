import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiHealth, type ApiHealth } from "@/lib/api-health";
import { getEnv } from "@/lib/env";

const labels: Record<ApiHealth["status"], string> = {
  ready: "Ready",
  "not-ready": "Not ready",
  unreachable: "Unreachable",
};

function describe(health: ApiHealth): string {
  switch (health.status) {
    case "ready":
      return "The API is running and all its checks pass.";
    case "not-ready":
      return `The API is running, but these checks fail: ${health.failing.join(", ")}.`;
    case "unreachable":
      return health.reason;
  }
}

export async function ApiHealthCard() {
  await connection();
  const health = await getApiHealth(getEnv().API_URL);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          API
          <Badge
            variant={health.status === "ready" ? "default" : "destructive"}
          >
            {labels[health.status]}
          </Badge>
        </CardTitle>
        <CardDescription>{describe(health)}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function ApiHealthCardSkeleton() {
  return <Skeleton className="h-24 w-full" />;
}
