<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WardMergeHistory extends Model
{
    /**
     * Bảng tương ứng trong cơ sở dữ liệu.
     *
     * @var string
     */
    protected $table = 'ward_merge_histories';

    /**
     * Các trường cho phép gán dữ liệu hàng loạt (Mass Assignment).
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'old_ward_code',
        'new_ward_code',
        'merge_date',
        'note'
    ];

    /**
     * Tự động cast (ép kiểu) dữ liệu cột.
     *
     * @var array
     */
    protected $casts = [
        'merge_date' => 'date'
    ];

    /**
     * Quan hệ trỏ về phường CŨ (bị sáp nhập)
     * - Chỉ hoạt động chuẩn xác nếu bạn có bảng words tham chiếu với field `code`.
     */
    public function oldWard(): BelongsTo
    {
        return $this->belongsTo(Ward::class, 'old_ward_code', 'code');
    }

    /**
     * Quan hệ trỏ về phường MỚI (phường/xã đích đang tiếp nhận sáp nhập)
     */
    public function newWard(): BelongsTo
    {
        return $this->belongsTo(Ward::class, 'new_ward_code', 'code');
    }
}
