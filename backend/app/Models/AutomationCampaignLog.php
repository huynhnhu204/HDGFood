<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutomationCampaignLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'campaign_type',
        'dedupe_key',
        'channel',
        'status',
        'email',
        'scheduled_at',
        'sent_at',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
