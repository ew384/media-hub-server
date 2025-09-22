/*
  Warnings:

  - A unique constraint covering the columns `[wechat_openid]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wechat_unionid]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "wechat_avatar" VARCHAR(255),
ADD COLUMN     "wechat_bound_at" TIMESTAMP(3),
ADD COLUMN     "wechat_nickname" VARCHAR(100),
ADD COLUMN     "wechat_openid" VARCHAR(64),
ADD COLUMN     "wechat_unionid" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "users_wechat_openid_key" ON "users"("wechat_openid");

-- CreateIndex
CREATE UNIQUE INDEX "users_wechat_unionid_key" ON "users"("wechat_unionid");

-- CreateIndex
CREATE INDEX "users_wechat_openid_idx" ON "users"("wechat_openid");

-- CreateIndex
CREATE INDEX "users_wechat_unionid_idx" ON "users"("wechat_unionid");
