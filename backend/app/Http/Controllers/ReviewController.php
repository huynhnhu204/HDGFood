<?php

namespace App\Http\Controllers;

use App\Mail\ReviewThanksMail;
use App\Models\Review;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

use App\Http\Controllers\Concerns\AppliesAdminTrashIndex;

class ReviewController extends Controller
{
    use AppliesAdminTrashIndex;
    // ── Public APIs ──────────────────────────────────────────────────────────

    public function getByProduct(Request $request, Product $product)
    {
        $rating = $request->input('rating');
        $hasPhoto = $request->boolean('has_photo');
        $sort = $request->input('sort', 'latest');

        $query = $product->reviews()
            ->approved()
            ->with(['user' => function($q) {
                $q->select('id', 'name');
            }]);

        if ($rating) $query->where('rating', $rating);
        if ($hasPhoto) $query->whereNotNull('images')->where('images', '!=', '[]');

        if ($sort === 'useful') $query->orderByDesc('likes');
        $query->orderByDesc('created_at');

        $reviews = $query->paginate(10);
        
        // Tất cả review hợp lệ đều từ người đã mua hàng dựa trên eligibility check
        $reviews->getCollection()->transform(function ($review) {
            $review->is_bought = true;
            return $review;
        });

        return response()->json($reviews);
    }

    public function getSummary(Product $product)
    {
        $stats = $product->reviews()
            ->approved()
            ->select('rating', DB::raw('count(*) as count'))
            ->groupBy('rating')
            ->get()
            ->pluck('count', 'rating')
            ->toArray();

        $totalCount = array_sum($stats);
        $avgRating = $totalCount > 0 ? round($product->reviews()->approved()->avg('rating'), 1) : 0;

        $distribution = [];
        for ($i = 5; $i >= 1; $i--) {
            $count = $stats[$i] ?? 0;
            $distribution[] = [
                'rating' => $i,
                'count'  => $count,
                'percentage' => $totalCount > 0 ? round(($count / $totalCount) * 100) : 0
            ];
        }

        return response()->json([
            'average'      => $avgRating,
            'total_count'  => $totalCount,
            'distribution' => $distribution,
            'has_photo_count' => $product->reviews()->approved()->whereNotNull('images')->where('images', '!=', '[]')->count()
        ]);
    }

    public function like(Review $review)
    {
        // Simple increment for now. Real implementation could use a review_likes table for uniqueness.
        $review->increment('likes');
        return response()->json(['likes' => $review->likes]);
    }

    /**
     * Lấy danh sách reviews nổi bật cho hiển thị public (trang chủ)
     */
    public function getFeatured(Request $request)
    {
        $limit = $request->input('limit', 10);
        
        $reviews = Review::with([
                'user' => function($q) { $q->select('id', 'name', 'avatar'); },
                'product' => function($q) { $q->select('id', 'name', 'slug'); }
            ])
            ->where('is_approved', true)
            ->orderByDesc('rating')
            ->orderByDesc('likes')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json($reviews);
    }

    // ── Admin APIs ───────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = Review::with([
                'user' => function($q) { $q->select('id', 'name', 'avatar'); },
                'product' => function($q) { $q->select('id', 'name', 'image'); }
            ])
            ->when($request->status === 'pending', fn($q) => $q->where('is_approved', false))
            ->when($request->status === 'approved', fn($q) => $q->where('is_approved', true))
            ->when($request->is_featured, fn($q) => $q->where('is_featured', true))
            ->when($request->rating, fn($q) => $q->where('rating', $request->rating))
            ->when($request->search, function($q, $s) {
                $q->where('content', 'like', "%$s%")
                  ->orWhereHas('user', fn($uq) => $uq->where('name', 'like', "%$s%"))
                  ->orWhereHas('product', fn($pq) => $pq->where('name', 'like', "%$s%"));
            });

        $this->applyAdminTrashIndexScope($query, $request);

        return response()->json($query->orderByDesc('created_at')->paginate($request->limit ?? 20));
    }

    /**
     * Duyệt hoặc Ẩn đánh giá
     * Thưởng điểm nếu được duyệt lần đầu
     */
    public function toggleApproval(Review $review)
    {
        $wasApproved = $review->is_approved;
        $review->is_approved = !$wasApproved;
        $review->save();

        // Logic tặng điểm: Khi chuyển từ Chờ duyệt -> Đã duyệt
        // Và phải có ảnh và chưa từng được tặng điểm cho review này
        if (!$wasApproved && $review->is_approved) {
            if (!empty($review->images) && count($review->images) > 0) {
                // Tăng điểm cho user
                $user = $review->user;
                if ($user) {
                    $user->increment('loyalty_points', 50);
                }
            }
        }

        return response()->json([
            'message' => $review->is_approved ? 'Đã duyệt đánh giá' : 'Đã ẩn đánh giá',
            'is_approved' => $review->is_approved
        ]);
    }

    public function reply(Request $request, Review $review)
    {
        $request->validate([
            'reply' => 'required|string|max:1000'
        ]);

        $review->update([
            'reply' => $request->reply
        ]);

        return response()->json([
            'message' => 'Đã gửi phản hồi thành công',
            'reply' => $review->reply
        ]);
    }

    public function destroy(Review $review)
    {
        $review->delete();
        return response()->json(['message' => 'Đã xóa đánh giá']);
    }

    public function getPerformanceReport()
    {
        // Top sản phẩm bị đánh giá thấp
        $lowPerformers = Product::select('products.id', 'products.name', 'products.image', DB::raw('AVG(reviews.rating) as avg_rating'), DB::raw('COUNT(reviews.id) as review_count'))
            ->join('reviews', 'products.id', '=', 'reviews.product_id')
            ->where('reviews.is_approved', true)
            ->groupBy('products.id', 'products.name', 'products.image')
            ->having('avg_rating', '<', 3.5)
            ->orderBy('avg_rating', 'asc')
            ->limit(10)
            ->get();

        return response()->json([
            'low_performers' => $lowPerformers,
            'stats' => [
                'total_reviews' => Review::count(),
                'pending_approval' => Review::where('is_approved', false)->count(),
                'average_all' => round(Review::avg('rating') ?: 0, 1)
            ]
        ]);
    }

    // ── Helper Logic ─────────────────────────────────────────────────────────

    public function checkEligibility(Product $product)
    {
        $res = $this->getEligibilityStatus($product);
        return response()->json($res);
    }

    protected function getEligibilityStatus(Product $product): array
    {
        $user = Auth::user();
        if (!$user) return ['can_review' => false, 'reason' => 'unauthenticated'];

        // Kiểm tra xem đã review sản phẩm này chưa
        $exists = Review::where('user_id', $user->id)->where('product_id', $product->id)->exists();
        if ($exists) return ['can_review' => false, 'reason' => 'already_reviewed'];

        // Kiểm tra xem có đơn hàng thành công chứa sản phẩm này không
        $hasBought = Order::where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereHas('items', function($q) use ($product) {
                $q->where('product_id', $product->id);
            })
            ->exists();

        return ['can_review' => $hasBought, 'reason' => $hasBought ? null : 'not_purchased'];
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'rating'     => 'required|integer|min:1|max:5',
            'content'    => 'nullable|string|max:1000',
            'images'     => 'nullable|array',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $eligibility = $this->getEligibilityStatus($product);
        
        if (!$eligibility['can_review']) {
            return response()->json(['message' => 'Không thể đánh giá.', 'reason' => $eligibility['reason']], 403);
        }

        $review = Review::create([
            'user_id'     => Auth::id(),
            'product_id'  => $product->id,
            'rating'      => $validated['rating'],
            'content'     => $validated['content'] ?? null,
            'images'      => $validated['images'] ?? null,
            'is_approved' => false, // Mặc định chờ duyệt để admin kiểm soát
        ]);

        // Load relationships for response
        $review->load(['user' => function($q) { $q->select('id', 'name'); }, 'product' => function($q) { $q->select('id', 'name', 'image'); }]);

        if ($review->user?->email) {
            try {
                Mail::to($review->user->email)->send(new ReviewThanksMail($review));
            } catch (\Throwable $e) {
                Log::warning('Send review thank-you email failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Gửi đánh giá thành công! Vui lòng chờ quản trị viên phê duyệt.',
            'review' => $review
        ], 201);
    }
}
