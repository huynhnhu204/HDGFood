<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ComboController;
use App\Http\Controllers\ImportReceiptController;
use App\Http\Controllers\LoyaltyController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\FoodieAssistantController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\PolicyController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VoucherController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| HDG Food — API Routes
|--------------------------------------------------------------------------
*/

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC — Không cần đăng nhập
// ═══════════════════════════════════════════════════════════════════════════

Route::prefix('auth')->group(function () {
    Route::post('/register',        [AuthController::class, 'register']);
    Route::post('/login',           [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password',  [AuthController::class, 'resetPassword']);
    Route::post('/forgot-password-otp', [AuthController::class, 'forgotPasswordOtp']);
    Route::post('/reset-password-otp',  [AuthController::class, 'resetPasswordOtp']);
    Route::post('/check-email',     [AuthController::class, 'checkEmail']);
    Route::post('/check-phone',     [AuthController::class, 'checkPhone']);
    // Google OAuth
    Route::get('/google/redirect',  [\App\Http\Controllers\SocialAuthController::class, 'redirectToGoogle']);
    Route::post('/google/callback', [\App\Http\Controllers\SocialAuthController::class, 'handleGoogleCallback']);
});

// Admin Auth (Public)
Route::post('/admin/login', [AuthController::class, 'loginAdmin']);

// Banners công khai
Route::get('/banners/active',           [\App\Http\Controllers\BannerController::class, 'active']);
Route::patch('/banners/{banner}/click', [\App\Http\Controllers\BannerController::class, 'incrementClick']);

// Danh mục & sản phẩm công khai
Route::get('/categories',             [CategoryController::class, 'index']);
Route::get('/categories/{category}',  [CategoryController::class, 'show']);
Route::get('/products',              [ProductController::class, 'index']);
Route::get('/products/promotions',   [ProductController::class, 'promotions']);
Route::get('/products/{product:slug}', [ProductController::class, 'show']);
Route::get('/products/{product}/availability', [ProductController::class, 'checkAvailability']);
Route::get('/products/{product}/related', [ProductController::class, 'related']);
Route::get('/products/{product}/cross-selling', [ProductController::class, 'crossSelling']);
Route::get('/products/{product}/reviews', [\App\Http\Controllers\ReviewController::class, 'getByProduct']);
Route::get('/products/{product}/reviews/summary', [\App\Http\Controllers\ReviewController::class, 'getSummary']);
Route::get('/products/{product}/review-eligibility', [\App\Http\Controllers\ReviewController::class, 'checkEligibility'])->middleware('auth:sanctum');
Route::get('/reviews/featured', [\App\Http\Controllers\ReviewController::class, 'getFeatured']);
Route::post('/reviews/{review}/like', [\App\Http\Controllers\ReviewController::class, 'like']);

// Khuyến mãi & voucher công khai
Route::get('/promotions',         [PromotionController::class, 'index']);
Route::get('/vouchers',           [VoucherController::class, 'index']);
Route::post('/vouchers/validate',  [VoucherController::class, 'validate']);

// Tin tức & Blog công khai
Route::get('/posts',                 [\App\Http\Controllers\PostController::class, 'index']);
Route::get('/posts/{slug}',          [\App\Http\Controllers\PostController::class, 'showBySlug']);
Route::get('/post-topics',           [\App\Http\Controllers\PostTopicController::class, 'index']);
Route::get('/post-topics/{slug}',    function($slug) {
    $topic = \App\Models\PostTopic::where('slug', $slug)->firstOrFail();
    return response()->json(['data' => $topic]);
});

// Route public cho khách gửi liên hệ & Menu & Giỏ hàng Local
Route::post('/public/contacts', [\App\Http\Controllers\ContactController::class, 'storePublic']);
Route::get('/menus', [\App\Http\Controllers\MenuController::class, 'index']);
Route::post('/cart/sync', [\App\Http\Controllers\CartController::class, 'sync']);
Route::post('/cart/add', [\App\Http\Controllers\CartController::class, 'add']);
Route::post('/orders/guest', [OrderController::class, 'storeGuest']);
Route::get('/tables/available', [\App\Http\Controllers\TableController::class, 'available']);
Route::get('/tables/public-list', [\App\Http\Controllers\TableController::class, 'publicList']);
Route::get('/tables/{table}/status', [\App\Http\Controllers\TableController::class, 'publicStatus']);
Route::get('/tables/{table}/current-order', [\App\Http\Controllers\TableController::class, 'publicCurrentOrder']);
Route::post('/tables/{table}/claim-session', [\App\Http\Controllers\TableController::class, 'claimSession']);
Route::post('/tables/{table}/occupy', [\App\Http\Controllers\TableController::class, 'occupyFromClient']);
Route::post('/tables/{table}/request-payment', [\App\Http\Controllers\TableController::class, 'requestPayment']);
Route::get('/policies', [PolicyController::class, 'index']);
Route::get('/policies/{slug}', [PolicyController::class, 'showBySlug']);
Route::post('/assistant/foodie-chat', [FoodieAssistantController::class, 'chat']);
Route::post('/assistant/shipping/estimate', [FoodieAssistantController::class, 'estimateShipping']);
Route::get('/public/settings', [\App\Http\Controllers\SettingController::class, 'publicStorefront']);
Route::get('/public/payment-info', [\App\Http\Controllers\PaymentController::class, 'publicInfo']);
Route::get('/public/orders/{order}/payment-qr', [\App\Http\Controllers\PaymentController::class, 'publicQr']);
Route::post('/public/orders/{order}/claim-payment', [\App\Http\Controllers\PaymentController::class, 'claimPayment']);
Route::post('/public/orders/{order}/vnpay/create', [\App\Http\Controllers\VnPayController::class, 'createPayment']);
Route::get('/payment/vnpay/return', [\App\Http\Controllers\VnPayController::class, 'returnUrl']);
Route::get('/payment/vnpay/ipn', [\App\Http\Controllers\VnPayController::class, 'ipn']);
Route::get('/public/orders/{order}/vnpay/status', [\App\Http\Controllers\VnPayController::class, 'checkStatus']);

// Combos (Public)
Route::get('/combos',               [ComboController::class, 'index']);
Route::get('/combos/{id}',          [ComboController::class, 'show']);
Route::post('/combos/calculate',   [ComboController::class, 'calculate']);

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATED — Cần Bearer token (Sanctum)
// ═══════════════════════════════════════════════════════════════════════════

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('customer.active')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        // ── User Specific (Orders của khách) ─────────────────────────────────────
        Route::get('/orders',         [OrderController::class, 'index']);
        Route::get('/orders/{order}', [OrderController::class, 'show']);
        Route::post('/orders',        [OrderController::class, 'store']);
        Route::post('/orders/{order}/cancel', [OrderController::class, 'cancelByUser']);
        Route::post('/orders/{order}/claim-payment', [\App\Http\Controllers\PaymentController::class, 'claimPayment']);
        Route::get('/orders/{order}/payment-qr', [\App\Http\Controllers\PaymentController::class, 'publicQr']);
        Route::post('/orders/{order}/vnpay/create', [\App\Http\Controllers\VnPayController::class, 'createPayment']);
        Route::get('/orders/{order}/vnpay/status', [\App\Http\Controllers\VnPayController::class, 'checkStatus']);

        // ── Reviews ──────────────────────────────────────────────────────────────
        Route::post('/reviews', [\App\Http\Controllers\ReviewController::class, 'store']);

        // ── User Profile ────────────────────────────────────────────────────────
        Route::get('/profile',                              [\App\Http\Controllers\ProfileController::class, 'show']);
        Route::put('/profile',                              [\App\Http\Controllers\ProfileController::class, 'update']);
        Route::post('/profile/avatar',                      [\App\Http\Controllers\ProfileController::class, 'updateAvatar']);
        Route::put('/profile/password',                     [\App\Http\Controllers\ProfileController::class, 'changePassword']);
        Route::get('/profile/orders',                       [\App\Http\Controllers\ProfileController::class, 'orders']);
        Route::get('/profile/wishlist',                     [\App\Http\Controllers\ProfileController::class, 'wishlist']);
        Route::post('/profile/wishlist',                    [\App\Http\Controllers\ProfileController::class, 'addToWishlist']);
        Route::delete('/profile/wishlist/{productId}',      [\App\Http\Controllers\ProfileController::class, 'removeFromWishlist']);

        // ── Loyalty ─────────────────────────────────────────────────────────────
        Route::get('/loyalty/summary', [LoyaltyController::class, 'summary']);
        Route::get('/loyalty/transactions', [LoyaltyController::class, 'transactions']);
        Route::get('/loyalty/rewards', [LoyaltyController::class, 'rewards']);
        Route::post('/loyalty/redeem', [LoyaltyController::class, 'redeem']);
    });

    // ── ADMIN ONLY (Prefix: /api/admin/...) ──────────────────────────────────
    Route::prefix('admin')->middleware('admin')->group(function () {

        // Quản lý chủ đề bài viết & Bài viết
        Route::apiResource('/post-topics', \App\Http\Controllers\PostTopicController::class);
        Route::patch('/post-topics/{postTopic}/toggle', [\App\Http\Controllers\PostTopicController::class, 'toggle']);
        
        Route::get('/posts',                                [\App\Http\Controllers\PostController::class, 'index']);
        Route::post('/posts',                               [\App\Http\Controllers\PostController::class, 'store']);
        Route::get('/posts/{post}',                         [\App\Http\Controllers\PostController::class, 'show']);
        Route::post('/posts/{post}',                        [\App\Http\Controllers\PostController::class, 'update']);
        Route::delete('/posts/{post}',                      [\App\Http\Controllers\PostController::class, 'destroy']);
        Route::patch('/posts/{id}/restore',                 [\App\Http\Controllers\PostController::class, 'restore']);
        Route::patch('/posts/{post}/toggle-featured',       [\App\Http\Controllers\PostController::class, 'toggleFeatured']);
        Route::patch('/posts/{post}/publish',               [\App\Http\Controllers\PostController::class, 'publish']);

        // Banners
        Route::apiResource('/banners', \App\Http\Controllers\BannerController::class);
        Route::patch('/banners/{banner}/toggle', [\App\Http\Controllers\BannerController::class, 'toggle']);

        // Menus
        Route::get('/menus/resources',                      [\App\Http\Controllers\MenuController::class, 'getResources']);
        Route::patch('/menus/{id}/restore',                 [\App\Http\Controllers\MenuController::class, 'restore']);
        Route::delete('/menus/{id}/purge',                  [\App\Http\Controllers\MenuController::class, 'purge']);
        Route::patch('/menus/{id}/toggle',                  [\App\Http\Controllers\MenuController::class, 'toggleStatus']);
        Route::apiResource('/menus', \App\Http\Controllers\MenuController::class);
        Route::post('/menus/store-whole',                   [\App\Http\Controllers\MenuController::class, 'storeWholeMenu']);
        Route::post('/menus/{menu}/sync',                   [\App\Http\Controllers\MenuController::class, 'syncItems']);

        // Cài đặt hệ thống (Settings)
        Route::get('/settings',                             [\App\Http\Controllers\SettingController::class, 'index']);
        Route::put('/settings',                             [\App\Http\Controllers\SettingController::class, 'update']);
        Route::post('/settings/upload',                     [\App\Http\Controllers\SettingController::class, 'upload']);
        
        // Trang About (Admin)
        Route::get('/settings/about',                       [\App\Http\Controllers\SettingController::class, 'getAbout']);
        Route::put('/settings/about',                       [\App\Http\Controllers\SettingController::class, 'updateAbout']);
        Route::post('/settings/about/upload',               [\App\Http\Controllers\SettingController::class, 'uploadAboutImage']);

        // Upload ảnh sản phẩm
        Route::post('/upload/image',                        [\App\Http\Controllers\UploadController::class, 'image']);
        Route::post('/upload/images',                       [\App\Http\Controllers\UploadController::class, 'images']);

        // Quản lý Orders (Admin)
        Route::get('/orders',                       [OrderController::class, 'indexAdmin']);
        Route::get('/orders/{order}',               [OrderController::class, 'showAdmin']);
        Route::get('/orders/cancel/reject-reasons', [OrderController::class, 'rejectReasonCatalog']);
        Route::patch('/orders/{order}/status',      [OrderController::class, 'updateStatus']);
        Route::post('/orders/{order}/cancel/approve', [OrderController::class, 'approveCancelRequest']);
        Route::post('/orders/{order}/cancel/reject',  [OrderController::class, 'rejectCancelRequest']);
        Route::post('/orders/{order}/confirm-payment', [\App\Http\Controllers\PaymentController::class, 'confirmPaymentAdmin']);
        Route::put('/orders/{order}',               [OrderController::class, 'update']);
        Route::delete('/orders/{order}',            [OrderController::class, 'destroy']);

        // Quản lý danh mục & Sản phẩm
        Route::post('/categories/bulk-delete',        [CategoryController::class, 'bulkDelete']);
        Route::post('/categories/reorder',            [CategoryController::class, 'reorder']);
        Route::get('/categories/check-slug',          [CategoryController::class, 'checkSlug']);
        Route::apiResource('/categories', CategoryController::class);
        Route::patch('/categories/{category}/toggle', [CategoryController::class, 'toggle']);

        Route::post('/products/bulk-delete',              [ProductController::class, 'bulkDelete']);
        Route::post('/products/import',                   [ProductController::class, 'import']);
        Route::get('/products/{product}/images',          [ProductImageController::class, 'index']);
        Route::post('/products/{product}/images',         [ProductImageController::class, 'store']);
        Route::patch('/products/{product}/images/reorder',[ProductImageController::class, 'reorder']);
        Route::patch('/products/{product}/images/{image}',[ProductImageController::class, 'update']);
        Route::delete('/products/{product}/images/{image}', [ProductImageController::class, 'destroy']);
        Route::apiResource('/products', ProductController::class);
        Route::get('/products/{product}/stats',           [ProductController::class, 'stats']);
        Route::post('/products/{product}/clone',          [ProductController::class, 'clone']);
        Route::get('/products/{product}/inventory-logs',  [ProductController::class, 'inventoryLogs']);
        Route::post('/products/{product}/inventory-logs', [ProductController::class, 'addInventoryLog']);

        // Phiếu nhập kho
        Route::get('/inventory/imports/test', function() {
            return response()->json(['message' => 'Import receipts route is working!']);
        });
        Route::post('/inventory/imports/import', [ImportReceiptController::class, 'import']);
        Route::apiResource('/inventory/imports', ImportReceiptController::class);

        // Quản lý thành viên
        Route::get('/users/search',                   [UserController::class, 'search']);
        Route::apiResource('/users', UserController::class);
        Route::post('/users/{user}/restore',          [UserController::class, 'restore']);
        Route::get('/users/{user}/orders',            [UserController::class, 'orders']);
        Route::post('/users/{user}/recalculate-tier', [UserController::class, 'recalculateTier']);

        // Loyalty Admin
        Route::apiResource('/loyalty-rewards', \App\Http\Controllers\Admin\LoyaltyRewardController::class);

        // Marketing Automation Admin
        Route::get('/automation/rules', [\App\Http\Controllers\Admin\AutomationController::class, 'rules']);
        Route::post('/automation/rules', [\App\Http\Controllers\Admin\AutomationController::class, 'updateRule']);
        Route::get('/automation/logs', [\App\Http\Controllers\Admin\AutomationController::class, 'logs']);
        Route::post('/automation/run-now', [\App\Http\Controllers\Admin\AutomationController::class, 'runNow']);

        // Quản lý khuyến mãi & Voucher
        Route::apiResource('/promotions', PromotionController::class);
        
        // ── Reviews Admin ───────────────────────────────────────────────────
        Route::get('/reviews',                 [ReviewController::class, 'index']);
        Route::post('/reviews/{review}/toggle', [ReviewController::class, 'toggleApproval']);
        Route::post('/reviews/{review}/reply',  [ReviewController::class, 'reply']);
        Route::delete('/reviews/{review}',     [ReviewController::class, 'destroy']);
        Route::get('/reviews/report',          [ReviewController::class, 'getPerformanceReport']);
        Route::patch('/promotions/{promotion}/toggle', [PromotionController::class, 'toggle']);
        Route::post('/promotions/bulk-delete',        [PromotionController::class, 'bulkDelete']);

        Route::apiResource('/vouchers', VoucherController::class);
        Route::post('/vouchers/seed',                 [VoucherController::class, 'seed']);
        Route::patch('/vouchers/{voucher}/toggle',    [VoucherController::class, 'toggle']);
        Route::post('/vouchers/bulk-delete',          [VoucherController::class, 'bulkDelete']);

        // Quản lý bàn
        Route::apiResource('/tables', \App\Http\Controllers\TableController::class);
        Route::patch('/tables/{table}/status',        [\App\Http\Controllers\TableController::class, 'updateStatus']);
        Route::post('/tables/{table}/complete-payment', [\App\Http\Controllers\TableController::class, 'completePayment']);
        Route::post('/tables/{table}/add-items',      [\App\Http\Controllers\TableController::class, 'addItems']);

        // Thống kê Dashboard
        Route::get('/dashboard/stats',                [\App\Http\Controllers\DashboardController::class, 'getStats']);

        // Thông báo (Notifications)
        Route::get('/notifications',                  [\App\Http\Controllers\NotificationController::class, 'index']);
        Route::get('/notifications/latest',           [\App\Http\Controllers\NotificationController::class, 'getLatest']);
        Route::get('/notifications/unread-count',     [\App\Http\Controllers\NotificationController::class, 'getUnreadCount']);
        Route::patch('/notifications/{id}/read',      [\App\Http\Controllers\NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all',        [\App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
        Route::delete('/notifications/delete-all',    [\App\Http\Controllers\NotificationController::class, 'destroyAll']);

        // Liên hệ (Contacts)
        Route::get('/contacts',                       [\App\Http\Controllers\ContactController::class, 'index']);
        Route::get('/contacts/pending-count',         [\App\Http\Controllers\ContactController::class, 'getPendingCount']);
        Route::get('/contacts/{contact}',             [\App\Http\Controllers\ContactController::class, 'show']);
        Route::patch('/contacts/{contact}/status',    [\App\Http\Controllers\ContactController::class, 'updateStatus']);

        // Combos
        Route::get('/combos',                           [ComboController::class, 'indexAdmin']);
        Route::post('/combos',                          [ComboController::class, 'store']);
        Route::get('/combos/{id}',                      [ComboController::class, 'showAdmin']);
        Route::put('/combos/{id}',                      [ComboController::class, 'update']);
        Route::delete('/combos/{id}',                   [ComboController::class, 'destroy']);
        Route::post('/combos/{id}/groups',              [ComboController::class, 'addGroup']);
        Route::put('/combos/{id}/groups/{gid}',         [ComboController::class, 'updateGroup']);
        Route::delete('/combos/{id}/groups/{gid}',     [ComboController::class, 'deleteGroup']);
        Route::post('/combos/{id}/groups/{gid}/products', [ComboController::class, 'addProducts']);
        Route::delete('/combos/{id}/groups/{gid}/products/{pid}', [ComboController::class, 'removeProduct']);
        Route::post('/combos/{id}/toggle',              [ComboController::class, 'toggle']);
        Route::post('/combos/seed',                     [ComboController::class, 'seed']);

        // Policies
        Route::get('/policies',                         [PolicyController::class, 'indexAdmin']);
        Route::post('/policies',                        [PolicyController::class, 'store']);
        Route::get('/policies/{id}',                    [PolicyController::class, 'showAdmin']);
        Route::put('/policies/{id}',                    [PolicyController::class, 'update']);
        Route::delete('/policies/{id}',                 [PolicyController::class, 'destroy']);
        Route::post('/policies/{id}/toggle',            [PolicyController::class, 'toggle']);
    });
});
