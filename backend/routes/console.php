<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment('HDG Food API');
})->purpose('Display an inspiring quote');

Schedule::command('automation:run-campaigns')->hourly();

/** Khách đóng TK quá N ngày (USER_TRASH_PURGE_DAYS, mặc định 30) → xóa cứng; đơn giữ user_id null */
Schedule::command('users:purge-trashed')->dailyAt('03:15');
