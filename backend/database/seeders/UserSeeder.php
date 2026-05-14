<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Tài khoản cố định + khách demo (@gmail.com).
 * Mật khẩu plain — model User cast `password` => hashed sẽ băm khi lưu.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@hdgfood.vn'],
            [
                'name'              => 'HDG Food Admin',
                'password'          => 'Admin@123',
                'role'              => 'admin',
                'phone'             => '0901234567',
                'is_active'         => true,
                'email_verified_at' => Carbon::now(),
            ]
        );

        $customers = [
            ['email' => 'nguyenvana@gmail.com', 'name' => 'Nguyễn Văn A', 'phone' => '0911123456', 'tier' => 'regular', 'loyalty_points' => 0, 'total_spent' => 0, 'total_orders' => 0],
            ['email' => 'tranthib@gmail.com', 'name' => 'Trần Thị B', 'phone' => '0922234567', 'tier' => 'silver', 'loyalty_points' => 500, 'total_spent' => 1_500_000, 'total_orders' => 5],
            ['email' => 'levanc@gmail.com', 'name' => 'Lê Văn C', 'phone' => '0933345678', 'tier' => 'gold', 'loyalty_points' => 1_500, 'total_spent' => 3_800_000, 'total_orders' => 12],
            ['email' => 'phamthid@gmail.com', 'name' => 'Phạm Thị D', 'phone' => '0944456789', 'tier' => 'vip', 'loyalty_points' => 5_000, 'total_spent' => 8_200_000, 'total_orders' => 25],
        ];

        foreach ($customers as $c) {
            User::updateOrCreate(
                ['email' => $c['email']],
                [
                    'name'              => $c['name'],
                    'phone'             => $c['phone'],
                    'password'          => 'User@123',
                    'role'              => 'user',
                    'tier'              => $c['tier'],
                    'loyalty_points'    => $c['loyalty_points'],
                    'total_spent'       => $c['total_spent'],
                    'total_orders'      => $c['total_orders'],
                    'is_active'         => true,
                    'email_verified_at' => Carbon::now(),
                ]
            );
        }

        $demoNames = ['Khách Demo 1', 'Khách Demo 2', 'Khách Demo 3', 'Khách Demo 4', 'Khách Demo 5'];
        foreach ($demoNames as $i => $name) {
            $n = $i + 1;
            User::updateOrCreate(
                ['email' => "hdg.demo{$n}@gmail.com"],
                [
                    'name'              => $name,
                    'phone'             => '09770000' . str_pad((string) (40 + $n), 2, '0', STR_PAD_LEFT),
                    'password'          => 'User@123',
                    'role'              => 'user',
                    'tier'              => 'regular',
                    'loyalty_points'    => 0,
                    'total_spent'       => 0,
                    'total_orders'      => 0,
                    'is_active'         => true,
                    'email_verified_at' => Carbon::now(),
                ]
            );
        }
    }
}
