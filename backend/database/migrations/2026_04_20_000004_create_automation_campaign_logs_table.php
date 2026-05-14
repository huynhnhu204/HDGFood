<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_campaign_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('campaign_type', 50);
            $table->string('dedupe_key', 120)->unique();
            $table->string('channel', 20)->default('email');
            $table->string('status', 20)->default('queued');
            $table->string('email')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['campaign_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_campaign_logs');
    }
};
