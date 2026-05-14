<?php

namespace App\Http\Controllers;

use App\Models\ImportReceipt;
use App\Models\InventoryLog;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportReceiptController extends Controller
{
    public function index(Request $request)
    {
        \Log::info('ImportReceiptController@index called', [
            'search' => $request->search,
            'page' => $request->page,
            'per_page' => $request->per_page,
        ]);

        $receipts = ImportReceipt::with('user:id,name')
            ->when($request->search, fn($q) => $q->where('code', 'like', "%{$request->search}%")
                ->orWhereHas('items.product', fn($q2) => $q2->where('name', 'like', "%{$request->search}%")))
            ->when($request->supplier, fn($q) => $q->where('supplier', 'like', "%{$request->supplier}%"))
            ->when($request->date_from, fn($q) => $q->whereDate('imported_at', '>=', $request->date_from))
            ->when($request->date_to,   fn($q) => $q->whereDate('imported_at', '<=', $request->date_to))
            ->latest('imported_at')
            ->paginate($request->per_page ?? 20);

        \Log::info('ImportReceiptController@index result', [
            'count' => $receipts->count(),
            'total' => $receipts->total(),
        ]);

        return response()->json([
            'data' => $receipts->items(),
            'meta' => [
                'current_page' => $receipts->currentPage(),
                'last_page' => $receipts->lastPage(),
                'per_page' => $receipts->perPage(),
                'total' => $receipts->total(),
            ],
        ]);
    }

    public function show(ImportReceipt $importReceipt)
    {
        $importReceipt->load(['user:id,name', 'items.product:id,name,image,price']);
        return response()->json(['data' => $importReceipt]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier'    => 'nullable|string|max:255',
            'note'        => 'nullable|string',
            'imported_at' => 'sometimes|date',
            'items'       => 'required|array|min:1',
            'items.*.product_id'   => 'required|exists:products,id',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.import_price' => 'required|numeric|gt:0',
        ], [
            'items.*.import_price.gt' => 'Giá nhập phải lớn hơn 0',
            'items.*.quantity.min' => 'Số lượng phải lớn hơn 0',
        ]);

        $receipt = $this->createReceiptWithItems($data, $request->user()->id);
        return response()->json(['data' => $receipt], 201);
    }

    private function createReceiptWithItems(array $data, int $userId): ImportReceipt
    {
        return DB::transaction(function () use ($data, $userId) {
            $costService = app(\App\Services\WeightedAverageCostService::class);
            
            // Tạo mã phiếu tự động
            $lastCode = ImportReceipt::orderByDesc('id')->value('code') ?? 'INV000';
            $num      = (int) substr($lastCode, 3) + 1;
            $code     = 'INV' . str_pad($num, 3, '0', STR_PAD_LEFT);

            $total = collect($data['items'])->sum(fn($i) => $i['quantity'] * $i['import_price']);

            $receipt = ImportReceipt::create([
                'code'         => $code,
                'user_id'      => $userId,
                'supplier'     => $data['supplier'] ?? null,
                'note'         => $data['note'] ?? null,
                'total_amount' => $total,
                'imported_at'  => $data['imported_at'] ?? now(),
            ]);

            foreach ($data['items'] as $item) {
                // Lock product để tránh race condition
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                // Tính giá vốn mới
                $newCostPrice = $costService->calculateCostPrice(
                    $product,
                    $item['quantity'],
                    $item['import_price']
                );

                // Cập nhật stock và cost_price
                $stockBefore = $product->stock;
                $newStock = $product->stock + $item['quantity'];
                $product->update([
                    'stock' => $newStock,
                    'cost_price' => $newCostPrice,
                ]);

                // Tạo import_receipt_item
                $receipt->items()->create([
                    'product_id'   => $item['product_id'],
                    'quantity'     => $item['quantity'],
                    'import_price' => $item['import_price'],
                    'subtotal'     => $item['quantity'] * $item['import_price'],
                ]);

                // Ghi inventory log
                InventoryLog::create([
                    'product_id'   => $product->id,
                    'user_id'      => $userId,
                    'type'         => 'in',
                    'quantity'     => $item['quantity'],
                    'stock_before' => $stockBefore,
                    'stock_after'  => $newStock,
                    'note'         => "Nhập kho — Phiếu {$code}",
                ]);
            }

            return $receipt->load(['user:id,name', 'items.product:id,name']);
        });
    }

    public function destroy(ImportReceipt $importReceipt)
    {
        return DB::transaction(function () use ($importReceipt) {
            $costService = app(\App\Services\WeightedAverageCostService::class);

            foreach ($importReceipt->items as $item) {
                // Lock product để tránh race condition
                $product = Product::lockForUpdate()->findOrFail($item->product_id);

                // Tính lại giá vốn sau khi trừ
                $newCostPrice = $costService->recalculateCostPriceOnReturn(
                    $product,
                    $item->quantity,
                    $item->import_price
                );

                // Trừ stock và cập nhật cost_price
                $stockBefore = $product->stock;
                $newStock = max(0, $product->stock - $item->quantity);
                $product->update([
                    'stock' => $newStock,
                    'cost_price' => $newCostPrice,
                ]);

                // Ghi inventory_log với type='adjust' và quantity âm
                InventoryLog::create([
                    'product_id'   => $product->id,
                    'user_id'      => $importReceipt->user_id,
                    'type'         => 'adjust',
                    'quantity'     => -$item->quantity,
                    'stock_before' => $stockBefore,
                    'stock_after'  => $newStock,
                    'note'         => "Hủy phiếu nhập {$importReceipt->code}",
                ]);
            }

            $importReceipt->delete();
            return response()->json(['message' => 'Đã xóa phiếu nhập.']);
        });
    }

    /**
     * POST /api/admin/inventory/imports/import
     * Import phiếu nhập từ dữ liệu Excel đã parse ở frontend.
     */
    public function import(Request $request)
    {
        $data = $request->validate([
            'supplier' => 'nullable|string|max:255',
            'note' => 'nullable|string',
            'imported_at' => 'nullable|date',
            'rows' => 'required|array|min:1|max:2000',
            'rows.*.product_id' => 'nullable|integer|exists:products,id',
            'rows.*.product_name' => 'nullable|string|max:255',
            'rows.*.quantity' => 'required',
            'rows.*.import_price' => 'required',
        ]);

        $invalidRows = [];
        $items = [];
        $productNameMap = Product::query()
            ->get(['id', 'name'])
            ->mapWithKeys(fn ($p) => [Str::lower(trim($p->name)) => $p->id]);

        foreach ($data['rows'] as $idx => $row) {
            $line = $idx + 2;
            $quantity = $this->toPositiveInt($row['quantity'] ?? null);
            $importPrice = $this->toPositiveNumber($row['import_price'] ?? null);
            $productId = $row['product_id'] ?? null;

            if (! $productId && ! empty($row['product_name'])) {
                $productId = $productNameMap[Str::lower(trim((string) $row['product_name']))] ?? null;
            }

            if (! $productId || ! $quantity || ! $importPrice) {
                $invalidRows[] = ['row' => $line, 'message' => 'Thiếu product_id/product_name hoặc quantity/import_price không hợp lệ.'];
                continue;
            }

            $items[] = [
                'product_id' => (int) $productId,
                'quantity' => $quantity,
                'import_price' => $importPrice,
            ];
        }

        if (empty($items)) {
            return response()->json([
                'message' => 'Không có dòng hợp lệ để import.',
                'created' => false,
                'invalid_rows' => $invalidRows,
            ], 422);
        }

        // Gộp dòng trùng product_id để tránh duplicate item trong 1 phiếu
        $grouped = collect($items)
            ->groupBy('product_id')
            ->map(function ($rows, $productId) {
                $totalQty = $rows->sum('quantity');
                $weightedTotal = $rows->sum(fn ($r) => $r['quantity'] * $r['import_price']);
                return [
                    'product_id' => (int) $productId,
                    'quantity' => (int) $totalQty,
                    'import_price' => round($weightedTotal / max(1, $totalQty), 2),
                ];
            })
            ->values()
            ->all();

        $payload = [
            'supplier' => $data['supplier'] ?? null,
            'note' => $data['note'] ?? null,
            'imported_at' => $data['imported_at'] ?? now(),
            'items' => $grouped,
        ];

        $receipt = $this->createReceiptWithItems($payload, $request->user()->id);

        return response()->json([
            'message' => 'Import Excel thành công.',
            'created' => true,
            'invalid_rows' => $invalidRows,
            'data' => $receipt,
        ], 201);
    }

    private function toPositiveInt(mixed $value): ?int
    {
        if ($value === null || $value === '') return null;
        if (is_numeric($value)) {
            $n = (int) $value;
            return $n > 0 ? $n : null;
        }
        $normalized = preg_replace('/[^\d]/', '', (string) $value);
        if ($normalized === '') return null;
        $n = (int) $normalized;
        return $n > 0 ? $n : null;
    }

    private function toPositiveNumber(mixed $value): ?float
    {
        if ($value === null || $value === '') return null;
        if (is_numeric($value)) {
            $n = (float) $value;
            return $n > 0 ? $n : null;
        }
        $normalized = str_replace([' ', ','], ['', '.'], (string) $value);
        if (! is_numeric($normalized)) return null;
        $n = (float) $normalized;
        return $n > 0 ? $n : null;
    }
}
