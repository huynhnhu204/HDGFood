<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cancel_reject_reasons', function (Blueprint $table) {
            $table->string('code', 64)->primary();
            $table->string('label', 255);
            $table->string('allowed_status', 32);
            $table->timestamps();
            $table->index(['allowed_status', 'code']);
        });

        DB::table('cancel_reject_reasons')->insert([
            ['code' => 'confirmed_timeout', 'label' => 'Đã quá 5 phút kể từ khi đơn được xác nhận.', 'allowed_status' => 'confirmed', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'confirmed_prep_started', 'label' => 'Đơn đã được chuyển sang khâu chuẩn bị nguyên liệu.', 'allowed_status' => 'confirmed', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'preparing_cooking_started', 'label' => 'Bếp đã bắt đầu chế biến món.', 'allowed_status' => 'preparing', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'preparing_stock_issued', 'label' => 'Nguyên liệu đã được xuất kho để chế biến.', 'allowed_status' => 'preparing', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'ready_completed', 'label' => 'Món đã hoàn tất và sẵn sàng phục vụ/giao.', 'allowed_status' => 'ready', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'ready_policy_locked', 'label' => 'Đơn đã qua ngưỡng cho phép hủy theo chính sách.', 'allowed_status' => 'ready', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'serving_in_progress', 'label' => 'Đơn đang được phục vụ/giao cho khách.', 'allowed_status' => 'serving', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'serving_policy_locked', 'label' => 'Đơn đã ở trạng thái phục vụ nên không thể hủy.', 'allowed_status' => 'serving', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'default_policy_mismatch', 'label' => 'Yêu cầu hủy không phù hợp chính sách ở trạng thái hiện tại.', 'allowed_status' => 'default', 'created_at' => now(), 'updated_at' => now()],
        ]);

        Schema::table('orders', function (Blueprint $table) {
            $table->string('cancel_reject_reason_code', 64)->nullable()->after('cancel_reason');
            $table->foreign('cancel_reject_reason_code')
                ->references('code')
                ->on('cancel_reject_reasons')
                ->nullOnDelete();

            $table->index(['status', 'created_at']);
            $table->index(['cancel_requested_at', 'status']);
            $table->index('delivery_phone');
        });

        Schema::table('voucher_usage', function (Blueprint $table) {
            $table->unique(['voucher_id', 'user_id', 'order_id'], 'voucher_usage_unique_triplet');
        });
    }

    public function down(): void
    {
        Schema::table('voucher_usage', function (Blueprint $table) {
            $table->dropUnique('voucher_usage_unique_triplet');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['cancel_reject_reason_code']);
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['cancel_requested_at', 'status']);
            $table->dropIndex(['delivery_phone']);
            $table->dropColumn('cancel_reject_reason_code');
        });

        Schema::dropIfExists('cancel_reject_reasons');
    }
};

