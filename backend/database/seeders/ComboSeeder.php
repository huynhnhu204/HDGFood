<?php

namespace Database\Seeders;

use App\Http\Controllers\ComboController;
use Illuminate\Database\Seeder;

/**
 * Tạo 6 combo mẫu (dùng logic giống API admin/combos/seed).
 * Chạy: php artisan db:seed --class=ComboSeeder
 */
class ComboSeeder extends Seeder
{
    public function run(): void
    {
        $response = app(ComboController::class)->seed();
        $payload = json_decode($response->getContent(), true) ?? [];

        if ($response->getStatusCode() >= 400) {
            throw new \RuntimeException($payload['message'] ?? 'Combo seed thất bại.');
        }

        $this->command?->info($payload['message'] ?? 'Combo seed OK.');
    }
}
