<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reward_catalog_id')->constrained('loyalty_reward_catalogs')->cascadeOnDelete();
            $table->foreignId('voucher_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('point_transaction_id')->nullable()->constrained('loyalty_point_transactions')->nullOnDelete();
            $table->integer('points_used');
            $table->string('status', 30)->default('success');
            $table->timestamps();

            $table->index(['user_id', 'reward_catalog_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_redemptions');
    }
};
