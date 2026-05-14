<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('voucher_usage', 'discount_amount')) {
            Schema::table('voucher_usage', function (Blueprint $table) {
                $table->decimal('discount_amount', 12, 2)->default(0)->after('order_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('voucher_usage', 'discount_amount')) {
            Schema::table('voucher_usage', function (Blueprint $table) {
                $table->dropColumn('discount_amount');
            });
        }
    }
};
