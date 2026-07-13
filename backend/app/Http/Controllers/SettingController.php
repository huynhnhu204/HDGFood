<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    /**
     * GET /api/public/settings
     * Chỉ các field hiển thị storefront (footer) — không cần đăng nhập admin.
     */
    public function publicStorefront()
    {
        $keys = [
            'phone',
            'address',
            'email',
            'working_hours',
            'store_latitude',
            'store_longitude',
            'delivery_radius_km',
            'facebook',
            'tiktok',
            'youtube',
            'zalo',
        ];

        $flat = Setting::query()
            ->whereIn('key', $keys)
            ->pluck('value', 'key');

        return response()->json([
            'data' => $flat,
        ]);
    }

    /**
     * GET /api/settings
     * Trả về tất cả settings, nhóm theo group
     */
    public function index()
    {
        $settings = Setting::all();

        // Nhóm theo group
        $grouped = $settings->groupBy('group')->map(function ($items) {
            return $items->pluck('value', 'key');
        });

        // Cũng trả flat để dễ sử dụng
        $flat = $settings->pluck('value', 'key');

        return response()->json([
            'grouped' => $grouped,
            'data'    => $flat,
        ]);
    }

    /**
     * PUT /api/settings
     * Nhận mảng { key: value } và cập nhật
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'settings'          => 'required|array',
            'settings.*.key'    => 'required|string',
            'settings.*.value'  => 'nullable|string',
            'settings.*.group'  => 'nullable|string',
        ]);

        foreach ($data['settings'] as $item) {
            Setting::updateOrCreate(
                ['key' => $item['key']],
                [
                    'value' => $item['value'] ?? '',
                    'group' => $item['group'] ?? 'general',
                ]
            );
        }

        // Xóa cache sau khi cập nhật
        Setting::clearCache();

        return response()->json([
            'message' => 'Cài đặt đã được cập nhật thành công.',
        ]);
    }

    /**
     * POST /api/settings/upload
     * Upload file (logo, favicon)
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|image|mimes:jpg,jpeg,png,webp,svg,ico|max:5120',
            'key'  => 'required|string',
        ]);

        $path = $request->file('file')->store('settings', 'public');

        // Lưu vào settings
        Setting::updateOrCreate(
            ['key' => $request->key],
            ['value' => $path, 'group' => 'general']
        );

        Setting::clearCache();

        return response()->json([
            'message' => 'Upload thành công.',
            'path'    => $path,
        ]);
    }

    /**
     * GET /api/settings/about
     * Lấy dữ liệu trang About
     */
    public function getAbout()
    {
        $data = Setting::where('key', 'page_about_data')->first();
        
        if (!$data) {
            // Trả về dữ liệu mặc định
            return response()->json([
                'hero_title' => 'Về HDG Food',
                'hero_subtitle' => 'Hành trình mang tinh hoa ẩm thực Việt đến từng bữa ăn',
                'hero_image' => '',
                'main_content' => '<p>Chào mừng đến với HDG Food - nơi hội tụ tinh hoa ẩm thực Việt Nam.</p>',
                'mission' => 'Mang đến những bữa ăn ngon, sạch và tiện lợi — nơi mỗi món ăn là một câu chuyện về văn hóa và tình yêu ẩm thực Việt Nam.',
                'vision' => 'Trở thành thương hiệu ẩm thực Việt được yêu mến nhất tại Đông Nam Á vào năm 2030, với tiêu chuẩn chất lượng quốc tế.',
                'stats' => [
                    ['label' => 'Năm Kinh Nghiệm', 'value' => '10+'],
                    ['label' => 'Chi Nhánh', 'value' => '50+'],
                    ['label' => 'Món Ăn', 'value' => '200+'],
                    ['label' => 'Khách Hàng / Ngày', 'value' => '1000+'],
                ],
                'founder_name' => 'Trần Thị Bình',
                'founder_title' => 'Nhà Sáng Lập & CEO',
                'founder_quote' => 'Mỗi món ăn chúng tôi tạo ra đều mang theo tâm huyết và tình yêu với ẩm thực Việt. HDG Food không chỉ là nơi bán đồ ăn — đó là nơi chúng tôi kể câu chuyện về quê hương qua từng hương vị.',
                'founder_image' => '',
                'team' => [
                    [
                        'name' => 'Nguyễn Văn An',
                        'role' => 'Bếp Trưởng',
                        'experience' => '15 năm kinh nghiệm',
                        'image' => 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop'
                    ],
                    [
                        'name' => 'Trần Thị Bình',
                        'role' => 'Giám Đốc Điều Hành',
                        'experience' => 'Sáng lập HDG Food',
                        'image' => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop'
                    ],
                    [
                        'name' => 'Lê Minh Cường',
                        'role' => 'Bếp Phó',
                        'experience' => '10 năm kinh nghiệm',
                        'image' => 'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=400&h=400&fit=crop'
                    ],
                ],
            ]);
        }

        return response()->json(json_decode($data->value, true));
    }

    /**
     * PUT /api/settings/about
     * Cập nhật dữ liệu trang About
     */
    public function updateAbout(Request $request)
    {
        $validated = $request->validate([
            'hero_title' => 'required|string|max:255',
            'hero_subtitle' => 'nullable|string|max:500',
            'hero_image' => 'nullable|string',
            'main_content' => 'nullable|string',
            'mission' => 'nullable|string',
            'vision' => 'nullable|string',
            'stats' => 'nullable|array',
            'stats.*.label' => 'required|string',
            'stats.*.value' => 'required|string',
            'founder_name' => 'nullable|string',
            'founder_title' => 'nullable|string',
            'founder_quote' => 'nullable|string',
            'founder_image' => 'nullable|string',
            'team' => 'nullable|array',
            'team.*.name' => 'required|string',
            'team.*.role' => 'required|string',
            'team.*.experience' => 'nullable|string',
            'team.*.image' => 'nullable|string',
        ]);

        Setting::updateOrCreate(
            ['key' => 'page_about_data'],
            [
                'value' => json_encode($validated),
                'group' => 'pages'
            ]
        );

        Setting::clearCache();

        return response()->json([
            'message' => 'Cập nhật trang Giới thiệu thành công.',
            'data' => $validated,
        ]);
    }

    /**
     * POST /api/settings/about/upload
     * Upload ảnh cho trang About
     */
    public function uploadAboutImage(Request $request)
    {
        $request->validate([
            'file' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $path = $request->file('file')->store('about', 'public');

        return response()->json([
            'message' => 'Upload thành công.',
            'path' => '/storage/' . $path,
        ]);
    }
}
