-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "password_hash" VARCHAR(255),
    "avatar_url" VARCHAR(255),
    "status" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_codes" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "scene" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" SERIAL NOT NULL,
    "identifier" VARCHAR(100) NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" VARCHAR(20) NOT NULL,
    "plan_name" VARCHAR(50) NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(20),
    "payment_status" INTEGER NOT NULL DEFAULT 0,
    "trade_no" VARCHAR(64),
    "qr_code_url" VARCHAR(255),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_callbacks" (
    "id" SERIAL NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "trade_no" VARCHAR(64),
    "callback_data" JSONB NOT NULL,
    "signature" VARCHAR(255),
    "status" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_callbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" SERIAL NOT NULL,
    "order_no" VARCHAR(32) NOT NULL,
    "refund_no" VARCHAR(32) NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_reason" VARCHAR(255),
    "refund_status" INTEGER NOT NULL DEFAULT 0,
    "trade_refund_no" VARCHAR(64),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" VARCHAR(20) NOT NULL,
    "plan_name" VARCHAR(50) NOT NULL,
    "original_price" DECIMAL(10,2) NOT NULL,
    "paid_price" DECIMAL(10,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "sms_codes_phone_idx" ON "sms_codes"("phone");

-- CreateIndex
CREATE INDEX "sms_codes_phone_scene_idx" ON "sms_codes"("phone", "scene");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_identifier_created_at_idx" ON "login_attempts"("identifier", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_created_at_idx" ON "login_attempts"("ip", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "idx_orders_user_status" ON "orders"("user_id", "payment_status");

-- CreateIndex
CREATE INDEX "idx_orders_order_no" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "idx_orders_trade_no" ON "orders"("trade_no");

-- CreateIndex
CREATE INDEX "idx_orders_expires_at" ON "orders"("expires_at");

-- CreateIndex
CREATE INDEX "idx_payment_callbacks_order_no" ON "payment_callbacks"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refund_no_key" ON "refunds"("refund_no");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_end_date_idx" ON "subscriptions"("end_date");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_callbacks" ADD CONSTRAINT "payment_callbacks_order_no_fkey" FOREIGN KEY ("order_no") REFERENCES "orders"("order_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_no_fkey" FOREIGN KEY ("order_no") REFERENCES "orders"("order_no") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
