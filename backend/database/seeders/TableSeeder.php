<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Table;

class TableSeeder extends Seeder
{
    public function run(): void
    {
        $tables = [];
        
        // Tầng 1 - 10 bàn
        for ($i = 1; $i <= 10; $i++) {
            $tables[] = [
                'name' => "Bàn {$i}",
                'slug' => "ban-{$i}",
                'capacity' => rand(2, 4),
                'area' => 'Tầng 1',
                'status' => 'available',
            ];
        }

        // Tầng 2 - 8 bàn
        for ($i = 11; $i <= 18; $i++) {
            $tables[] = [
                'name' => "Bàn {$i}",
                'slug' => "ban-{$i}",
                'capacity' => rand(4, 6),
                'area' => 'Tầng 2',
                'status' => 'available',
            ];
        }

        // VIP - 3 bàn
        for ($i = 1; $i <= 3; $i++) {
            $tables[] = [
                'name' => "VIP {$i}",
                'slug' => "vip-{$i}",
                'capacity' => rand(6, 10),
                'area' => 'Phòng VIP',
                'status' => 'available',
            ];
        }

        foreach ($tables as $table) {
            Table::updateOrCreate(
                ['slug' => $table['slug']],
                $table
            );
        }

        $this->command->info('✅ Đã seed ' . count($tables) . ' tables');
    }
}
