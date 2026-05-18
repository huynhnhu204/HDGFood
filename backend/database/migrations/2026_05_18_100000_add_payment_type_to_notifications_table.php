<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('order', 'table', 'system', 'voucher', 'payment') NOT NULL DEFAULT 'system'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('order', 'table', 'system', 'voucher') NOT NULL DEFAULT 'system'");
        }
    }
};
