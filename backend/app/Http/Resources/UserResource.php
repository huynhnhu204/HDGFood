<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hasGoogle = !empty($this->google_id);
        $hasPassword = !empty($this->password);

        // Ưu tiên đánh dấu theo nguồn đăng nhập hiện có của tài khoản.
        $loginProvider = $hasGoogle ? 'google' : 'password';
        if (!$hasGoogle && !$hasPassword) {
            $loginProvider = 'unknown';
        }

        $isAdmin = $request->user()?->isAdmin() === true;

        return [
            'id'      => $this->id,
            'name'    => $this->name,
            'email'   => $this->email,
            'deleted_at' => $isAdmin ? optional($this->deleted_at)->toISOString() : null,
            'deleted_original_email' => $isAdmin ? $this->deleted_original_email : null,
            'role'    => $this->role,
            'phone'   => $this->phone,
            'address' => $this->address,
            'province_code' => $this->province_code,
            'district_code' => $this->district_code,
            'ward_code'     => $this->ward_code,
            'tier'    => $this->tier ?: 'regular',
            'total_spent' => (float) ($this->total_spent ?? 0),
            'total_orders' => (int) ($this->total_orders ?? 0),
            'is_active' => (bool) $this->is_active,
            'orders_count' => isset($this->orders_count) ? (int) $this->orders_count : null,
            'created_at' => optional($this->created_at)->toISOString(),
            'login_provider' => $loginProvider,
            'has_password'   => $hasPassword,
            'has_google'     => $hasGoogle,
            'avatar'  => $this->avatar
                ? (str_starts_with($this->avatar, 'http') ? $this->avatar : asset('storage/' . ltrim($this->avatar, '/')))
                : null,
        ];
    }
}
