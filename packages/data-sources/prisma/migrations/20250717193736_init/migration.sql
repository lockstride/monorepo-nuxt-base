-- CreateTable
CREATE TABLE "hello_world_messages" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hello_world_messages_pkey" PRIMARY KEY ("id")
);
