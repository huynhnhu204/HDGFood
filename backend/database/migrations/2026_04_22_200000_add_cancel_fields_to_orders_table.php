<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('cancel_reason', 255)->nullable()->after('notes');
            $table->timestamp('cancelled_at')->nullable()->after('cancel_reason');
            $table->timestamp('cancel_requested_at')->nullable()->after('cancelled_at');
            $table->boolean('is_user_cancelled')->default(false)->after('cancel_requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'cancel_reason',
                'cancelled_at',
                'cancel_requested_at',
                'is_user_cancelled',
            ]);
        });
    }
};

