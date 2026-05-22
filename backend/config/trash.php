<?php

return [
    /** Số ngày giữ mục soft-delete trong thùng rác trước khi khuyến nghị / tự xóa cứng */
    'retention_days' => max(1, (int) env('TRASH_RETENTION_DAYS', 30)),

    /** Thành viên đã đóng TK — cron `users:purge-trashed` */
    'member_retention_days' => max(1, (int) env('USER_TRASH_PURGE_DAYS', 30)),
];
