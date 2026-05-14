<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PurgeTrashedCustomersCommand extends Command
{
    protected $signature = 'users:purge-trashed
                            {--days= : Số ngày kể từ khi đóng TK (mặc định USER_TRASH_PURGE_DAYS hoặc 30)}
                            {--dry-run : Chỉ đếm, không xóa}';

    protected $description = 'Xóa cứng khách (đã đóng TK / soft-delete) sau N ngày không khôi phục; đơn hàng giữ lại với user_id = null.';

    public function handle(): int
    {
        $daysOpt = $this->option('days');
        $days = $daysOpt !== null && $daysOpt !== ''
            ? max(1, (int) $daysOpt)
            : max(1, (int) env('USER_TRASH_PURGE_DAYS', 30));

        $cutoff = now()->subDays($days);

        $ids = User::onlyTrashed()
            ->where('role', 'user')
            ->where('deleted_at', '<=', $cutoff)
            ->orderBy('id')
            ->pluck('id');

        $count = $ids->count();
        if ($count === 0) {
            $this->info("Không có tài khoản khách nào trong thùng rác quá {$days} ngày.");

            return self::SUCCESS;
        }

        $this->info("Tìm thấy {$count} tài khoản (deleted_at ≤ {$cutoff->toDateTimeString()}).");

        if ($this->option('dry-run')) {
            $this->warn('Dry-run: không xóa dữ liệu.');

            return self::SUCCESS;
        }

        $purged = 0;
        foreach ($ids->chunk(50) as $chunk) {
            foreach ($chunk as $id) {
                $user = User::withTrashed()->find($id);
                if (! $user || ! $user->trashed() || $user->role !== 'user') {
                    continue;
                }

                try {
                    DB::transaction(function () use ($user) {
                        Order::query()->where('user_id', $user->id)->update([
                            'user_id' => null,
                            'customer_account_detached_at' => now(),
                        ]);
                        $user->forceDelete();
                    });
                    $purged++;
                    Log::info('Purged trashed customer after grace period', ['user_id' => $id]);
                } catch (\Throwable $e) {
                    Log::error('Purge trashed customer failed', [
                        'user_id' => $id,
                        'message' => $e->getMessage(),
                    ]);
                    $this->error("Lỗi user {$id}: {$e->getMessage()}");
                }
            }
        }

        $this->info("Đã xóa cứng {$purged}/{$count} tài khoản.");

        return self::SUCCESS;
    }
}
