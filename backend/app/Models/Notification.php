<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'title',
        'content',
        'type',
        'link',
        'is_read'
    ];

    /**
     * Helper để tạo nhanh thông báo từ Controller
     */
    public static function createNotification($title, $content, $type = 'system', $link = null)
    {
        return self::create([
            'title' => $title,
            'content' => $content,
            'type' => $type,
            'link' => $link,
            'is_read' => false
        ]);
    }
}
