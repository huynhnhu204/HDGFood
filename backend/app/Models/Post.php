<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Post extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'content',
        'thumbnail',
        'topic_id',
        'user_id',
        'status',
        'view_count',
        'is_featured',
        'meta_title',
        'meta_description',
        'published_at',
    ];

    protected $casts = [
        'is_featured'  => 'boolean',
        'view_count'   => 'integer',
        'published_at' => 'datetime',
    ];

    /* ── Relations ── */

    public function topic(): BelongsTo
    {
        return $this->belongsTo(PostTopic::class, 'topic_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
