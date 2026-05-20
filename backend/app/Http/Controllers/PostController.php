<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostTopic;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\Concerns\AppliesAdminTrashIndex;

class PostController extends Controller
{
    use AppliesAdminTrashIndex;
    private const THUMBNAIL_MAX_KB = 10240; // 10MB
    /* ══════════════════════════════════════════
     | GET /api/posts
     | Query: search, topic_id, status, is_featured, page, per_page
     ══════════════════════════════════════════ */
    public function index(Request $request)
    {
        $query = Post::with(['topic:id,name,slug', 'author:id,name,email']);

        // Public users only see published posts
        if (!$request->user()?->is_admin) {
            $query->where('status', 'published');
        } else {
            $this->applyAdminTrashIndexScope($query, $request);
        }

        $query->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->filled('topic_id')) {
            $query->where('topic_id', $request->topic_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->boolean('is_featured')) {
            $query->where('is_featured', true);
        }

        $perPage = min((int) ($request->per_page ?? 20), 100);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
            ],
        ]);
    }

    /* ══════════════════════════════════════════
     | GET /api/posts/{post}
     ══════════════════════════════════════════ */
    public function show(Post $post)
    {
        // Increment view count on each visit
        $post->increment('view_count');

        $post->load(['topic:id,name,slug', 'author:id,name,email']);

        return response()->json($post);
    }

    /* ══════════════════════════════════════════
     | GET /api/posts/{slug}  (Public - by slug)
     ══════════════════════════════════════════ */
    public function showBySlug(string $slug)
    {
        $post = Post::where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $post->increment('view_count');
        $post->load(['topic:id,name,slug', 'author:id,name,email']);

        return response()->json($post);
    }

    /* ══════════════════════════════════════════
     | POST /api/posts
     ══════════════════════════════════════════ */
    public function store(Request $request)
    {
        $data = $request->validate([
            'title'            => 'required|string|max:255',
            'slug'             => 'nullable|string|max:255|unique:posts,slug',
            'content'          => 'nullable|string',
            'thumbnail'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:' . self::THUMBNAIL_MAX_KB,
            'topic_id'         => 'nullable|exists:post_topics,id',
            'status'           => 'in:draft,published',
            'is_featured'      => 'boolean',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ], [
            'thumbnail.image' => 'Thumbnail phải là tệp hình ảnh hợp lệ.',
            'thumbnail.mimes' => 'Thumbnail chỉ hỗ trợ định dạng JPG, JPEG, PNG hoặc WEBP.',
            'thumbnail.max'   => 'Thumbnail không được vượt quá 10MB.',
        ]);

        // Auto-generate slug
        $data['slug'] = $this->generateSlug($data['slug'] ?? null, $data['title']);

        // Handle thumbnail upload
        if ($request->hasFile('thumbnail')) {
            $data['thumbnail'] = $request->file('thumbnail')->store('posts/thumbnails', 'public');
        }

        // Auto-set published_at
        if (($data['status'] ?? 'draft') === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $data['user_id'] = Auth::id();

        $post = Post::create($data);
        $post->load(['topic:id,name,slug', 'author:id,name,email']);

        return response()->json($post, 201);
    }

    /* ══════════════════════════════════════════
     | PUT /api/posts/{post}
     ══════════════════════════════════════════ */
    public function update(Request $request, Post $post)
    {
        $data = $request->validate([
            'title'            => 'sometimes|string|max:255',
            'slug'             => 'nullable|string|max:255|unique:posts,slug,' . $post->id,
            'content'          => 'nullable|string',
            'thumbnail'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:' . self::THUMBNAIL_MAX_KB,
            'topic_id'         => 'nullable|exists:post_topics,id',
            'status'           => 'in:draft,published',
            'is_featured'      => 'boolean',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ], [
            'thumbnail.image' => 'Thumbnail phải là tệp hình ảnh hợp lệ.',
            'thumbnail.mimes' => 'Thumbnail chỉ hỗ trợ định dạng JPG, JPEG, PNG hoặc WEBP.',
            'thumbnail.max'   => 'Thumbnail không được vượt quá 10MB.',
        ]);

        // Regenerate slug if title changed and slug is blank
        if (isset($data['title']) && empty($data['slug'])) {
            $data['slug'] = $this->generateSlug(null, $data['title'], $post->id);
        }

        // Handle thumbnail upload
        if ($request->hasFile('thumbnail')) {
            // Delete old thumbnail
            if ($post->thumbnail) {
                Storage::disk('public')->delete($post->thumbnail);
            }
            $data['thumbnail'] = $request->file('thumbnail')->store('posts/thumbnails', 'public');
        }

        // Auto-set published_at when first publishing
        if (isset($data['status']) && $data['status'] === 'published' && !$post->published_at) {
            $data['published_at'] = now();
        }

        $post->update($data);
        $post->load(['topic:id,name,slug', 'author:id,name,email']);

        return response()->json($post);
    }

    /* ══════════════════════════════════════════
     | DELETE /api/posts/{post}  (Soft Delete)
     ══════════════════════════════════════════ */
    public function destroy(Post $post)
    {
        $post->delete(); // SoftDelete — có thể restore

        return response()->json(['message' => 'Đã chuyển bài viết vào thùng rác.']);
    }

    /* ══════════════════════════════════════════
     | PATCH /api/posts/{id}/restore  (Restore Soft Delete)
     ══════════════════════════════════════════ */
    public function restore($id)
    {
        $post = Post::withTrashed()->findOrFail($id);
        $post->restore();

        return response()->json(['message' => 'Đã khôi phục bài viết thành công.', 'post' => $post]);
    }

    /* ══════════════════════════════════════════
     | PATCH /api/posts/{post}/toggle-featured
     ══════════════════════════════════════════ */
    public function toggleFeatured(Post $post)
    {
        $post->update(['is_featured' => !$post->is_featured]);

        return response()->json($post);
    }

    /* ══════════════════════════════════════════
     | PATCH /api/posts/{post}/publish
     ══════════════════════════════════════════ */
    public function publish(Post $post)
    {
        $post->update([
            'status'       => $post->status === 'published' ? 'draft' : 'published',
            'published_at' => $post->published_at ?? now(),
        ]);

        return response()->json($post);
    }

    /* ── helpers ── */
    private function generateSlug(?string $slug, string $title, ?int $excludeId = null): string
    {
        $base  = $slug ? Str::slug($slug) : Str::slug($title);
        $final = $base;
        $i     = 1;

        while (true) {
            $query = Post::where('slug', $final);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
            if (!$query->exists()) break;
            $final = $base . '-' . $i++;
        }

        return $final;
    }
}
