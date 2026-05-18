<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // ── General ──
            ['key' => 'site_name',        'value' => 'HDG Food',                          'group' => 'general'],
            ['key' => 'site_description',  'value' => 'Nhà hàng & Quán ăn ngon nhất',    'group' => 'general'],
            ['key' => 'logo',             'value' => '',                                   'group' => 'general'],
            ['key' => 'favicon',          'value' => '',                                   'group' => 'general'],
            ['key' => 'currency',         'value' => 'VND',                                'group' => 'general'],

            // ── Contact ──
            ['key' => 'phone',            'value' => '0123 456 789',                       'group' => 'contact'],
            ['key' => 'hotline',          'value' => '1900 1234',                          'group' => 'contact'],
            ['key' => 'email',            'value' => 'contact@HDGfood.vn',                 'group' => 'contact'],
            ['key' => 'address',          'value' => '123 Nguyễn Huệ, Quận 1, TP.HCM',   'group' => 'contact'],
            ['key' => 'google_maps_embed','value' => '',                                   'group' => 'contact'],
            ['key' => 'working_hours',    'value' => '08:00 - 22:00 (Thứ 2 - CN)',        'group' => 'contact'],

            // ── Social ──
            ['key' => 'facebook_url',     'value' => 'https://facebook.com/HDGfood',       'group' => 'social'],
            ['key' => 'tiktok_url',       'value' => 'https://tiktok.com/@HDGfood',        'group' => 'social'],
            ['key' => 'instagram_url',    'value' => 'https://instagram.com/HDGfood',      'group' => 'social'],
            ['key' => 'youtube_url',      'value' => '',                                   'group' => 'social'],
            ['key' => 'zalo_url',         'value' => '',                                   'group' => 'social'],

            // ── SEO / Config ──
            ['key' => 'meta_title',       'value' => 'HDG Food - Nhà hàng & Quán ăn ngon','group' => 'seo'],
            ['key' => 'meta_description', 'value' => 'Khám phá thực đơn phong phú tại HDG Food. Đặt món trực tuyến nhanh chóng.', 'group' => 'seo'],
            ['key' => 'google_analytics_id','value' => '',                                 'group' => 'seo'],
            ['key' => 'facebook_pixel_id','value' => '',                                   'group' => 'seo'],

            // ── Thanh toán chuyển khoản (VietQR — Mức A) ──
            ['key' => 'bank_bin',                  'value' => 'mbbank',                    'group' => 'payment'],
            ['key' => 'bank_account',              'value' => '02092004281',               'group' => 'payment'],
            ['key' => 'bank_account_name',         'value' => 'HDG FOOD',                  'group' => 'payment'],
            ['key' => 'bank_transfer_note_prefix', 'value' => 'HDGFOOD',                   'group' => 'payment'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'group' => $setting['group']]
            );
        }
    }
}
