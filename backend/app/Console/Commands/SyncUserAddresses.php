<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class SyncUserAddresses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'address:sync-users {--chunk=100}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Đồng bộ dữ liệu địa chỉ cũ sang cấu trúc mới sau 1/7/2025';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting address synchronization process...');
        
        $chunkSize = $this->option('chunk');
        $successCount = 0;
        $failCount = 0;

        // Giả sử các cột lưu mã Tỉnh/Huyện/Xã của bạn trong bảng users là province_code, district_code, ward_code
        // Duyệt theo chunk để không tràn bộ nhớ (RAM) khi có hàng ngàn User
        User::whereNotNull('district_code') // Lấy những user vẫn còn trường district (chưa chuẩn hoá)
            ->whereNotNull('province_code')
            ->whereNotNull('ward_code')
            ->chunk($chunkSize, function ($users) use (&$successCount, &$failCount) {
                foreach ($users as $user) {
                    try {
                        // Gọi API để convert địa chỉ
                        $response = Http::timeout(10)->post('https://tinhthanhpho.com/api/v1/convert/address', [
                            'provinceCode' => $user->province_code,
                            'districtCode' => $user->district_code,
                            'wardCode'     => $user->ward_code,
                        ]);

                        if ($response->successful() && $response->json('status') === 'success') {
                            $data = $response->json('data.new');

                            if (!empty($data)) {
                                // Cập nhật User với địa chỉ mới. Tuỳ thuộc DB, có thể bạn sẽ xoá hoặc set null cột district_code
                                $user->update([
                                    'province_code' => $data['provinceCode'] ?? $user->province_code,
                                    'ward_code'     => $data['wardCode'] ?? $user->ward_code,
                                    'district_code' => null, // Đặt null để đánh dấu đã chuẩn hóa sang 2 cấp
                                    // 'address' => Cập nhật thêm cột chuỗi địa chỉ nếu cần...
                                ]);

                                $this->line("Successfully synced User ID: {$user->id}");
                                $successCount++;
                            } else {
                                $this->logFailure($user, "API trả về data.new rỗng");
                                $failCount++;
                            }
                        } else {
                            $this->logFailure($user, "API response không thành công: " . $response->body());
                            $failCount++;
                        }
                    } catch (\Exception $e) {
                        $this->logFailure($user, "Lỗi kết nối/Exception: " . $e->getMessage());
                        $failCount++;
                    }
                }
            });

        $this->info("=============================");
        $this->info("Sync completed!");
        $this->info("Successfully updated: {$successCount} users.");
        $this->error("Failed updates: {$failCount} users. Please check the logs.");
    }

    /**
     * Ghi Log những trường hợp thất bại.
     */
    private function logFailure($user, $reason)
    {
        $this->error("Failed User ID: {$user->id} - {$reason}");
        
        // Log vào file storage/logs/laravel.log hoặc một channel tuỳ chỉnh để xử lý thủ công
        Log::channel('single')->error("ADDRESS_SYNC_FAILED", [
            'user_id' => $user->id,
            'old_address' => [
                'province' => $user->province_code,
                'district' => $user->district_code,
                'ward'     => $user->ward_code,
            ],
            'reason' => $reason
        ]);
    }
}
