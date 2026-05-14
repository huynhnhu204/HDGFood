<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('combos', function (Blueprint $table) {
            if (!Schema::hasColumn('combos', 'show_on_homepage')) {
                $table->boolean('show_on_homepage')->default(false)->after('is_active');
                $table->index('show_on_homepage');
            }
        });
    }

    public function down(): void
    {
        Schema::table('combos', function (Blueprint $table) {
            if (Schema::hasColumn('combos', 'show_on_homepage')) {
                $table->dropIndex(['show_on_homepage']);
                $table->dropColumn('show_on_homepage');
            }
        });
    }
};
