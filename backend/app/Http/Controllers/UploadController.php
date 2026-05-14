<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    /**
     * POST /api/admin/upload/image
     * Upload ảnh sản phẩm (hoặc bất kỳ ảnh nào).
     * Trả về URL đầy đủ để frontend preview ngay.
     */
    public function image(Request $request)
    {
        $request->validate([
            'file' => 'required|image|mimes:jpg,jpeg,png,webp,gif|max:2048', // Max 2MB
        ]);

        $path = $request->file('file')->store('products', 'public');
        $url  = asset('storage/' . $path);

        return response()->json([
            'url'     => $url,
            'path'    => $path,
            'message' => 'Upload thành công.',
        ]);
    }

    /**
     * POST /api/admin/upload/images
     * Upload nhiều ảnh cùng lúc (Gallery).
     */
    public function images(Request $request)
    {
        $request->validate([
            'files'   => 'required|array|max:10',
            'files.*' => 'image|mimes:jpg,jpeg,png,webp,gif|max:2048',
        ]);

        $files = [];

        foreach ($request->file('files') as $file) {
            $path   = $file->store('products', 'public');
            $files[] = [
                'url' => asset('storage/' . $path),
                'path' => $path,
            ];
        }

        return response()->json([
            'files'   => $files,
            'urls'    => collect($files)->pluck('url')->values(),
            'message' => "Đã upload " . count($files) . " ảnh thành công.",
        ]);
    }
}
