import { Suspense } from "react";
import {
  ApiHealthCard,
  ApiHealthCardSkeleton,
} from "@/components/api-health-card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Harbormaster</h1>
      <Suspense fallback={<ApiHealthCardSkeleton />}>
        <ApiHealthCard />
      </Suspense>
    </main>
  );
}
