<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            if (! Schema::hasColumn('tables', 'session_token')) {
                $table->string('session_token', 120)->nullable()->after('current_order_id');
            }
            if (! Schema::hasColumn('tables', 'session_locked_at')) {
                $table->timestamp('session_locked_at')->nullable()->after('session_token');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            if (Schema::hasColumn('tables', 'session_locked_at')) {
                $table->dropColumn('session_locked_at');
            }
            if (Schema::hasColumn('tables', 'session_token')) {
                $table->dropColumn('session_token');
            }
        });
    }
};
