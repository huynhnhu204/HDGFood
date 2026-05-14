<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add foreign keys for orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('promotion_id')->references('id')->on('promotions')->nullOnDelete();
            $table->foreign('voucher_id')->references('id')->on('vouchers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['promotion_id']);
            $table->dropForeign(['voucher_id']);
        });
    }
};
