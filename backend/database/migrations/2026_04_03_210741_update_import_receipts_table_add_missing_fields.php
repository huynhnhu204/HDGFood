<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('import_receipts', function (Blueprint $table) {
            $table->string('supplier')->nullable()->after('user_id');
            $table->timestamp('imported_at')->nullable()->after('note');
            $table->renameColumn('receipt_number', 'code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('import_receipts', function (Blueprint $table) {
            $table->dropColumn(['supplier', 'imported_at']);
            $table->renameColumn('code', 'receipt_number');
        });
    }
};
