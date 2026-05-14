<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index()
    {
        $notifications = Notification::orderByDesc('created_at')->paginate(20);
        return response()->json($notifications);
    }

    public function getLatest()
    {
        $notifications = Notification::orderByDesc('created_at')->limit(10)->get();
        return response()->json($notifications);
    }

    public function getUnreadCount()
    {
        $count = Notification::where('is_read', false)->count();
        return response()->json(['count' => $count]);
    }

    public function markAsRead($id)
    {
        $notification = Notification::findOrFail($id);
        $notification->update(['is_read' => true]);
        return response()->json(['message' => 'Đã đánh dấu đã đọc']);
    }

    public function markAllAsRead()
    {
        Notification::where('is_read', false)->update(['is_read' => true]);
        return response()->json(['message' => 'Đã đánh dấu tất cả đã đọc']);
    }

    public function destroyAll()
    {
        Notification::truncate(); // Xóa sạch bảng
        return response()->json(['message' => 'Đã xóa tất cả thông báo']);
    }
}
