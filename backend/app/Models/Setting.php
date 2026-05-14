<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'group'];

    /**
     * Lấy giá trị setting theo key
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $settings = Cache::rememberForever('settings_global', function () {
            return static::all()->pluck('value', 'key')->toArray();
        });

        return $settings[$key] ?? $default;
    }

    /**
     * Xóa cache settings
     */
    public static function clearCache(): void
    {
        Cache::forget('settings_global');
    }
}
