<?php

namespace App\Http\Controllers;

use App\Models\PostTopic;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

class PostTopicController extends Controller
{
    public function index(Request $request)
    {
        $query = PostTopic::query()->orderBy('id', 'desc');

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if (Schema::hasTable('posts')) {
            $query->withCount('posts');
        }

        $perPage = $request->per_page ?? 20;
        $paginator = $query->paginate($perPage);

        if (!Schema::hasTable('posts')) {
            $paginator->getCollection()->transform(function ($topic) {
                $topic->posts_count = 0;
                return $topic;
            });
        }

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'slug'             => 'nullable|string|max:255|unique:post_topics',
            'description'      => 'nullable|string',
            'status'           => 'in:active,inactive',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'image_url'        => 'nullable|string',
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
            // Đảm bảo slug không bị trùng
            $count = PostTopic::where('slug', $data['slug'])->count();
            if ($count > 0) {
                $data['slug'] = $data['slug'] . '-' . time();
            }
        }

        $postTopic = PostTopic::create($data);

        return response()->json($postTopic, 201);
    }

    public function show(PostTopic $postTopic)
    {
        $totalViews = 0;
        $latestPosts = [];

        if (Schema::hasTable('posts') && class_exists(\App\Models\Post::class)) {
            $postTopic->loadCount('posts');

            $viewColumn = Schema::hasColumn('posts', 'views') ? 'views' : (Schema::hasColumn('posts', 'view_count') ? 'view_count' : null);
            if ($viewColumn) {
                $totalViews = $postTopic->posts()->sum($viewColumn) ?? 0;
            }

            $latestPosts = $postTopic->posts()
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get();
        } else {
            $postTopic->setAttribute('posts_count', 0);
        }

        $postTopic->setAttribute('total_views', (int) $totalViews);
        $postTopic->setAttribute('latest_posts', $latestPosts);

        return response()->json($postTopic);
    }

    public function update(Request $request, PostTopic $postTopic)
    {
        $data = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'slug'             => 'nullable|string|max:255|unique:post_topics,slug,' . $postTopic->id,
            'description'      => 'nullable|string',
            'status'           => 'in:active,inactive',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'image_url'        => 'nullable|string',
        ]);

        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
            if (PostTopic::where('slug', $data['slug'])->where('id', '!=', $postTopic->id)->exists()) {
                $data['slug'] = $data['slug'] . '-' . time();
            }
        }

        $postTopic->update($data);

        return response()->json($postTopic);
    }

    public function destroy(PostTopic $postTopic)
    {
        if (Schema::hasTable('posts')) {
            $postsCount = $postTopic->posts()->count();
            if ($postsCount > 0) {
                return response()->json([
                    'message' => 'Chủ đề này đang có ' . $postsCount . ' bài viết. Vui lòng chuyển các bài viết sang chủ đề khác trước khi xóa.',
                    'requires_action' => true
                ], 422);
            }
        }

        $postTopic->delete();

        return response()->json(['message' => 'Xóa chủ đề thành công.']);
    }

    public function toggle(PostTopic $postTopic)
    {
        $postTopic->update([
            'status' => $postTopic->status === 'active' ? 'inactive' : 'active'
        ]);

        return response()->json($postTopic);
    }
}
