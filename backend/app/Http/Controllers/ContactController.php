<?php

namespace App\Http\Controllers;

use App\Mail\ContactThanksMail;
use App\Models\Contact;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $query = Contact::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        return response()->json($query->latest()->paginate(15));
    }

    public function show(Contact $contact)
    {
        return response()->json($contact);
    }

    public function storePublic(Request $request)
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'phone'   => 'nullable|string|max:20',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string|max:2000',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $contact = Contact::create($validated);

        // Auto Notification
        Notification::createNotification(
            "Liên hệ mới từ {$contact->name}",
            ($contact->subject ? "[{$contact->subject}] " : '') . "Khách hàng vừa gửi lời nhắn: " . substr($contact->message, 0, 50) . "...",
            "system",
            "/admin/contacts/{$contact->id}"
        );

        try {
            Mail::to($contact->email)->send(new ContactThanksMail($contact));
        } catch (\Throwable $e) {
            Log::warning('Send contact thank-you email failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Gửi lời nhắn thành công. Chúng tôi sẽ phản hồi sớm nhất!',
            'data'    => $contact
        ], 201);
    }

    public function updateStatus(Request $request, Contact $contact)
    {
        $validated = $request->validate([
            'status'     => 'required|in:pending,processed',
            'admin_note' => 'nullable|string|max:2000',
        ]);

        $contact->update($validated);

        return response()->json([
            'message' => 'Cập nhật trạng thái liên hệ thành công',
            'data'    => $contact
        ]);
    }

    public function getPendingCount()
    {
        $count = Contact::where('status', 'pending')->count();
        return response()->json(['count' => $count]);
    }
}
