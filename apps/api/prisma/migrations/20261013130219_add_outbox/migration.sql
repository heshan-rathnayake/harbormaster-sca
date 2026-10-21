-- CreateTable
CREATE TABLE "outbox" (
    "id" BIGSERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_unpublished_idx" ON "outbox"("id") WHERE (published_at IS NULL);
