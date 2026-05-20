<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\UserController;
use App\Models\Menu;
use App\Models\ProductImage;
use App\Models\User;
use App\Support\AdminTrashRegistry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
class TrashController extends Controller
{
    public function summary()
    {
        $counts = [];
        foreach (AdminTrashRegistry::types() as $type => $config) {
            $counts[$type] = AdminTrashRegistry::trashQuery($type, $config)->count();
        }

        return response()->json([
            'counts' => $counts,
            'total' => array_sum($counts),
            'types' => collect(AdminTrashRegistry::types())->map(fn ($c, $k) => [
                'type' => $k,
                'label' => $c['label'],
                'admin_path' => $c['admin_path'],
            ])->values(),
        ]);
    }

    public function index(Request $request)
    {
        $request->validate([
            'type' => 'nullable|string',
            'q' => 'nullable|string|max:200',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $type = $request->input('type');
        $q = trim((string) $request->input('q', ''));
        $perPage = (int) ($request->input('per_page', 20));
        $page = (int) ($request->input('page', 1));

        if ($type) {
            if (! AdminTrashRegistry::isValidType($type)) {
                return response()->json(['message' => 'Loại thùng rác không hợp lệ.'], 422);
            }

            return $this->paginateType($type, $q, $page, $perPage);
        }

        return $this->paginateAll($q, $page, $perPage);
    }

    public function restore(Request $request, string $type, int $id)
    {
        $config = AdminTrashRegistry::resolve($type);
        if (! $config) {
            return response()->json(['message' => 'Loại không hợp lệ.'], 422);
        }

        return match ($config['kind']) {
            'menu' => $this->restoreMenu($id),
            'user' => app(UserController::class)->restore(
                User::onlyTrashed()->where('role', 'user')->findOrFail($id)
            ),
            'product_image' => $this->restoreProductImage($id),
            default => $this->restoreSoft($type, $config, $id),
        };
    }

    public function forceDelete(string $type, int $id)
    {
        $config = AdminTrashRegistry::resolve($type);
        if (! $config) {
            return response()->json(['message' => 'Loại không hợp lệ.'], 422);
        }

        return match ($config['kind']) {
            'menu' => app(MenuController::class)->purge($id),
            'user' => response()->json([
                'message' => 'Thành viên đã đóng không xóa vĩnh viễn từ thùng rác. Hệ thống tự dọn sau thời hạn cấu hình.',
            ], 422),
            'product_image' => $this->purgeProductImage($id),
            default => $this->forceDeleteSoft($type, $config, $id),
        };
    }

    protected function paginateType(string $type, string $q, int $page, int $perPage)
    {
        $config = AdminTrashRegistry::resolve($type);
        $query = AdminTrashRegistry::trashQuery($type, $config);
        $this->applySearch($query, $config, $q);

        $paginator = $query->orderByDesc('updated_at')->paginate($perPage, ['*'], 'page', $page);
        $items = $paginator->getCollection()->map(
            fn (Model $row) => AdminTrashRegistry::formatItem($type, $config, $row)
        )->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    protected function paginateAll(string $q, int $page, int $perPage)
    {
        $all = collect();
        foreach (AdminTrashRegistry::types() as $type => $config) {
            $query = AdminTrashRegistry::trashQuery($type, $config);
            $this->applySearch($query, $config, $q);
            $rows = $query->orderByDesc('updated_at')->limit(200)->get();
            foreach ($rows as $row) {
                $item = AdminTrashRegistry::formatItem($type, $config, $row);
                $item['_sort'] = $item['deleted_at'] ?? '';
                $all->push($item);
            }
        }

        $sorted = $all->sortByDesc('_sort')->values()->map(function ($item) {
            unset($item['_sort']);

            return $item;
        });

        $total = $sorted->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($page, $lastPage);
        $slice = $sorted->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $slice,
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    /** @param  array<string, mixed>  $config */
    protected function applySearch($query, array $config, string $q): void
    {
        if ($q === '') {
            return;
        }
        $like = '%'.$q.'%';
        $title = $config['title'];
        $query->where(function ($builder) use ($like, $title, $config) {
            $builder->where($title, 'like', $like);
            if (! empty($config['subtitle'])) {
                $builder->orWhere($config['subtitle'], 'like', $like);
            }
        });
    }

    /** @param  array<string, mixed>  $config */
    protected function restoreSoft(string $type, array $config, int $id)
    {
        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];
        $row = $modelClass::onlyTrashed()->findOrFail($id);
        $row->restore();

        return response()->json([
            'message' => 'Đã khôi phục.',
            'item' => AdminTrashRegistry::formatItem($type, $config, $row->fresh()),
        ]);
    }

    /** @param  array<string, mixed>  $config */
    protected function forceDeleteSoft(string $type, array $config, int $id)
    {
        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];
        $row = $modelClass::onlyTrashed()->findOrFail($id);

        if ($type === 'category' && (int) $row->getKey() === 1) {
            return response()->json(['message' => 'Không thể xóa vĩnh viễn danh mục mặc định.'], 422);
        }

        $row->forceDelete();

        return response()->json(['message' => 'Đã xóa vĩnh viễn.']);
    }

    protected function restoreMenu(int $id)
    {
        $menu = Menu::findOrFail($id);
        $menu->update(['status' => 'active']);

        return response()->json(['message' => 'Đã khôi phục menu.']);
    }

    protected function restoreProductImage(int $id)
    {
        $image = ProductImage::where('status', 'archived')->findOrFail($id);
        $image->update(['status' => 'active']);

        return response()->json(['message' => 'Đã khôi phục ảnh.']);
    }

    protected function purgeProductImage(int $id)
    {
        $image = ProductImage::where('status', 'archived')->findOrFail($id);
        $image->delete();

        return response()->json(['message' => 'Đã xóa ảnh vĩnh viễn.']);
    }
}
