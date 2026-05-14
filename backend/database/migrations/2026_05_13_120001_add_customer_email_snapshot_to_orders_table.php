<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Email khách tại thời điểm đặt (đối chiếu sau khi purge user — phân biệt đăng ký lại cùng Gmail).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('customer_email_snapshot', 255)->nullable()->after('delivery_phone');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('customer_email_snapshot');
        });
    }
};
