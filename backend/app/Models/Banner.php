<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Banner extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'title',
        'image_path',
        'mobile_image_path',
        'link_url',
        'position',
        'positions',
        'sort_order',
        'status',
        'start_date',
        'end_date',
        'click_count',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'click_count' => 'integer',
        'sort_order' => 'integer',
        'positions' => 'array',
    ];

    protected $appends = ['image_url', 'mobile_image_url'];

    public function getImageUrlAttribute()
    {
        if (!$this->image_path) {
            return null;
        }

        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
            return $this->image_path;
        }

        return \Illuminate\Support\Facades\Storage::url($this->image_path);
    }

    public function getMobileImageUrlAttribute()
    {
        if (!$this->mobile_image_path) {
            return null;
        }

        if (str_starts_with($this->mobile_image_path, 'http://') || str_starts_with($this->mobile_image_path, 'https://')) {
            return $this->mobile_image_path;
        }

        return \Illuminate\Support\Facades\Storage::url($this->mobile_image_path);
    }
}
