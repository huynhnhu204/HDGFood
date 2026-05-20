<?php

namespace App\Support;

use App\Models\Banner;
use App\Models\Category;
use App\Models\Combo;
use App\Models\LoyaltyRewardCatalog;
use App\Models\Menu;
use App\Models\Policy;
use App\Models\Post;
use App\Models\PostTopic;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Promotion;
use App\Models\Review;
use App\Models\Table;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdminTrashRegistry
{
    /**
     * @return array<string, array{
     *   label: string,
     *   model: class-string<Model>,
     *   title: string,
     *   subtitle?: string|null,
     *   admin_path: string,
     *   kind: 'soft'|'menu'|'user'|'product_image'
     * }>
     */
    public static function types(): array
    {
        return [
            'product' => [
                'label' => 'Sản phẩm',
                'model' => Product::class,
                'title' => 'name',
                'subtitle' => 'sku',
                'admin_path' => '/admin/products',
                'kind' => 'soft',
            ],
            'category' => [
                'label' => 'Danh mục',
                'model' => Category::class,
                'title' => 'name',
                'subtitle' => 'slug',
                'admin_path' => '/admin/categories',
                'kind' => 'soft',
            ],
            'combo' => [
                'label' => 'Combo',
                'model' => Combo::class,
                'title' => 'name',
                'subtitle' => null,
                'admin_path' => '/admin/combos',
                'kind' => 'soft',
            ],
            'promotion' => [
                'label' => 'Khuyến mãi',
                'model' => Promotion::class,
                'title' => 'name',
                'subtitle' => null,
                'admin_path' => '/admin/promotions',
                'kind' => 'soft',
            ],
            'voucher' => [
                'label' => 'Voucher',
                'model' => Voucher::class,
                'title' => 'code',
                'subtitle' => 'name',
                'admin_path' => '/admin/vouchers',
                'kind' => 'soft',
            ],
            'banner' => [
                'label' => 'Banner',
                'model' => Banner::class,
                'title' => 'title',
                'subtitle' => null,
                'admin_path' => '/admin/banners',
                'kind' => 'soft',
            ],
            'post' => [
                'label' => 'Bài viết',
                'model' => Post::class,
                'title' => 'title',
                'subtitle' => null,
                'admin_path' => '/admin/posts',
                'kind' => 'soft',
            ],
            'post_topic' => [
                'label' => 'Chủ đề bài viết',
                'model' => PostTopic::class,
                'title' => 'name',
                'subtitle' => 'slug',
                'admin_path' => '/admin/post-topics',
                'kind' => 'soft',
            ],
            'table' => [
                'label' => 'Bàn',
                'model' => Table::class,
                'title' => 'name',
                'subtitle' => 'slug',
                'admin_path' => '/admin/tables',
                'kind' => 'soft',
            ],
            'review' => [
                'label' => 'Đánh giá',
                'model' => Review::class,
                'title' => 'id',
                'subtitle' => 'content',
                'admin_path' => '/admin/reviews',
                'kind' => 'soft',
            ],
            'policy' => [
                'label' => 'Chính sách',
                'model' => Policy::class,
                'title' => 'title',
                'subtitle' => 'slug',
                'admin_path' => '/admin/policies',
                'kind' => 'soft',
            ],
            'loyalty_reward' => [
                'label' => 'Loyalty reward',
                'model' => LoyaltyRewardCatalog::class,
                'title' => 'name',
                'subtitle' => null,
                'admin_path' => '/admin/loyalty-rewards',
                'kind' => 'soft',
            ],
            'menu' => [
                'label' => 'Menu',
                'model' => Menu::class,
                'title' => 'name',
                'subtitle' => 'position',
                'admin_path' => '/admin/menus',
                'kind' => 'menu',
            ],
            'member' => [
                'label' => 'Thành viên',
                'model' => User::class,
                'title' => 'name',
                'subtitle' => 'deleted_original_email',
                'admin_path' => '/admin/members',
                'kind' => 'user',
            ],
            'product_image' => [
                'label' => 'Ảnh sản phẩm',
                'model' => ProductImage::class,
                'title' => 'id',
                'subtitle' => 'url',
                'admin_path' => '/admin/product-images',
                'kind' => 'product_image',
            ],
        ];
    }

    public static function resolve(string $type): ?array
    {
        $types = self::types();

        return $types[$type] ?? null;
    }

    public static function isValidType(string $type): bool
    {
        return isset(self::types()[$type]);
    }

    /** @param  array<string, mixed>  $config */
    public static function trashQuery(string $type, array $config): Builder
    {
        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];

        return match ($config['kind']) {
            'menu' => $modelClass::query()->where(function ($q) {
                $q->where('status', 'inactive')
                    ->orWhere('status', 0)
                    ->orWhere('status', '0');
            }),
            'user' => $modelClass::onlyTrashed()->where('role', 'user'),
            'product_image' => $modelClass::query()->where('status', 'archived'),
            default => self::softDeleteQuery($modelClass),
        };
    }

    /** @param  class-string<Model>  $modelClass */
    protected static function softDeleteQuery(string $modelClass): Builder
    {
        if (! in_array(SoftDeletes::class, class_uses_recursive($modelClass), true)) {
            throw new \RuntimeException("Model {$modelClass} does not use SoftDeletes.");
        }

        return $modelClass::onlyTrashed();
    }

    /** @param  array<string, mixed>  $config */
    public static function formatItem(string $type, array $config, Model $row): array
    {
        $titleField = $config['title'];
        $title = (string) ($row->{$titleField} ?? $row->getKey());

        if ($type === 'review' && $title === (string) $row->getKey()) {
            $title = 'Đánh giá #'.$row->getKey();
        }
        if ($type === 'product_image') {
            $title = 'Ảnh #'.$row->getKey();
        }

        $subtitle = null;
        if (! empty($config['subtitle'])) {
            $sub = $row->{$config['subtitle']} ?? null;
            if ($sub !== null && $sub !== '') {
                $subtitle = (string) $sub;
            }
        }
        if ($type === 'member') {
            $subtitle = (string) ($row->deleted_original_email ?? $row->email ?? '');
        }

        $deletedAt = $row->deleted_at ?? $row->updated_at ?? $row->created_at;

        return [
            'type' => $type,
            'type_label' => $config['label'],
            'id' => (int) $row->getKey(),
            'title' => $title,
            'subtitle' => $subtitle,
            'deleted_at' => $deletedAt?->toIso8601String(),
            'admin_path' => $config['admin_path'],
        ];
    }
}
