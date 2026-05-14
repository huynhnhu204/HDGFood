<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_reward_catalogs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('points_cost');
            $table->decimal('voucher_amount', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->default(0);
            $table->integer('voucher_valid_days')->default(30);
            $table->integer('monthly_limit')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_reward_catalogs');
    }
};
