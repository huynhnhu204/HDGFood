<?php

use App\Models\Setting;

if (!function_exists('get_setting')) {
    /**
     * Lấy giá trị setting theo key
     * Sử dụng: get_setting('site_name', 'HDG Food')
     */
    function get_setting(string $key, mixed $default = null): mixed
    {
        return Setting::getValue($key, $default);
    }
}
