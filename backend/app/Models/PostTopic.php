<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PostTopic extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'name',
        'slug',
        'description',
        'status',
        'meta_title',
        'meta_description',
        'image_url',
    ];

    public function posts(): HasMany
    {
        return $this->hasMany(\App\Models\Post::class, 'topic_id');
    }
}
