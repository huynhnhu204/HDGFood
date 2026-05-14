<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('banners', 'positions')) {
            Schema::table('banners', function (Blueprint $table) {
                $table->json('positions')->nullable()->after('position');
            });
        }

        DB::statement("UPDATE banners SET positions = JSON_ARRAY(position) WHERE positions IS NULL");
    }

    public function down(): void
    {
        if (Schema::hasColumn('banners', 'positions')) {
            Schema::table('banners', function (Blueprint $table) {
                $table->dropColumn('positions');
            });
        }
    }
};
