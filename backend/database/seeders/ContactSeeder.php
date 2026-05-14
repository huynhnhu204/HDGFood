<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Contact;

class ContactSeeder extends Seeder
{
    public function run(): void
    {
        $contacts = [
            [
                'name' => 'Nguyễn Văn A',
                'email' => 'nguyenvana@example.com',
                'phone' => '0901234567',
                'message' => 'Hỏi về thực đơn: Cho tôi hỏi quán có phục vụ món chay không ạ?',
                'status' => 'pending',
            ],
            [
                'name' => 'Trần Thị B',
                'email' => 'tranthib@example.com',
                'phone' => '0912345678',
                'message' => 'Đặt tiệc: Tôi muốn đặt tiệc cho 50 người vào cuối tuần',
                'status' => 'processed',
                'admin_note' => 'Đã gọi lại và xác nhận đặt tiệc.',
            ],
            [
                'name' => 'Lê Văn C',
                'email' => 'levanc@example.com',
                'phone' => '0923456789',
                'message' => 'Góp ý: Món ăn rất ngon, nhưng giao hàng hơi lâu',
                'status' => 'processed',
                'admin_note' => 'Đã ghi nhận và cải thiện dịch vụ giao hàng.',
            ],
        ];

        foreach ($contacts as $contact) {
            Contact::updateOrCreate(
                ['email' => $contact['email']],
                $contact
            );
        }

        $this->command->info('✅ Đã seed ' . count($contacts) . ' contacts');
    }
}
