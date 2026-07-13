<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class FoodieAssistantController extends Controller
{
    private ?array $lastAiError = null;

    /** @var 'llm'|'heuristic' */
    private string $aiReplySource = 'llm';

    public function chat(Request $request): JsonResponse
    {
        $this->lastAiError = null;
        $this->aiReplySource = 'llm';
        $payload = $request->validate([
            'message' => 'required|string|max:2000',
            'recent_messages' => 'nullable|array|max:10',
            'recent_messages.*.role' => 'required_with:recent_messages|string|in:user,assistant',
            'recent_messages.*.content' => 'required_with:recent_messages|string|max:2000',
        ]);

        $user = $request->user();
        $now = now();
        $normalizedUserMessage = $this->normalizeUserMessage($payload['message']);
        $availableMenu = $this->getAvailableMenu();
        $userHistory = $this->buildUserHistory($user?->id);
        $extractedEntities = $this->extractEntities($normalizedUserMessage, $availableMenu);
        $handoff = $this->detectHandoffNeed($normalizedUserMessage);
        $shippingEstimate = $this->estimateShippingFee(
            address: $extractedEntities['address'],
            districtCode: null,
            wardCode: null,
            provinceCode: null
        );

        $systemPrompt = $this->buildSystemPrompt();
        $contextBlock = [
            'time' => $now->format('H:i'),
            'user' => [
                'name' => $user?->name ?? 'Khach',
                'preferences' => [],
            ],
            'user_history' => $userHistory,
            'available_menu' => $availableMenu,
            'extracted_entities' => $extractedEntities,
            'assistant_hints' => $this->buildAssistantHints($normalizedUserMessage, $extractedEntities, $availableMenu),
            'normalized_user_input' => $normalizedUserMessage,
            'shipping_estimate' => $shippingEstimate,
            'handoff_policy' => [
                'handoff_required' => $handoff['required'],
                'handoff_reason' => $handoff['reason'],
            ],
        ];

        $replyResult = $this->generateReply(
            userInput: $normalizedUserMessage,
            recentMessages: $payload['recent_messages'] ?? [],
            systemPrompt: $systemPrompt,
            contextBlock: $contextBlock,
            extractedEntities: $extractedEntities
        );
        $intentScore = $this->calculateIntentScore($normalizedUserMessage, $extractedEntities, $handoff);
        $topIntent = $this->resolveTopIntent($intentScore);
        $understanding = $this->buildUnderstandingPayload(
            normalizedInput: $normalizedUserMessage,
            entities: $extractedEntities,
            intentScore: $intentScore,
            topIntent: $topIntent,
            handoff: $handoff,
            shippingEstimate: $shippingEstimate,
            groundingStatus: $replyResult['grounding_status']
        );

        return response()->json([
            'reply' => $replyResult['reply'],
            'server_time' => $now->toIso8601String(),
            'handoff_required' => $handoff['required'],
            'handoff_reason' => $handoff['reason'],
            'entities' => $extractedEntities,
            'shipping_estimate' => $shippingEstimate,
            'intent_score' => $intentScore,
            'top_intent' => $topIntent,
            'grounding_status' => $replyResult['grounding_status'],
            'ai_status' => $this->buildAiStatusPayload(),
            'understanding' => $understanding,
        ]);
    }

    public function estimateShipping(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'address' => 'nullable|string|max:500',
            'province_code' => 'nullable|string|max:20',
            'district_code' => 'nullable|string|max:20',
            'ward_code' => 'nullable|string|max:20',
        ]);

        $estimate = $this->estimateShippingFee(
            address: $payload['address'] ?? null,
            districtCode: $payload['district_code'] ?? null,
            wardCode: $payload['ward_code'] ?? null,
            provinceCode: $payload['province_code'] ?? null
        );

        return response()->json(['data' => $estimate]);
    }

    private function getAvailableMenu(): array
    {
        return Cache::remember('foodie_assistant_menu_v1', 90, function () {
            return Product::query()
                ->where('is_active', true)
                ->where('is_available', true)
                ->where('stock', '>', 0)
                ->with('category:id,name')
                ->orderBy('price')
                ->limit(120)
                ->get()
                ->map(function (Product $product) {
                    $tags = [];
                    if (!empty($product->category?->name)) {
                        $tags[] = $product->category->name;
                    }
                    if ($product->is_featured) {
                        $tags[] = 'Noi bat';
                    }
                    if ($product->available_time && $product->available_time !== 'all') {
                        $tags[] = $product->available_time;
                    }
                    if ((float) $product->price <= 50000) {
                        $tags[] = 'Gia tot';
                    }

                    return [
                        'id' => $product->id,
                        'name' => $product->name,
                        'price' => (float) ($product->final_price ?? $product->price),
                        'category' => (string) ($product->category?->name ?? ''),
                        'description' => Str::limit(strip_tags((string) ($product->description ?? '')), 120),
                        'tags' => array_values(array_unique($tags)),
                        'status' => 'in_stock',
                    ];
                })
                ->values()
                ->all();
        });
    }

    private function buildUserHistory(?int $userId): array
    {
        if (!$userId) {
            return [];
        }

        return OrderItem::query()
            ->whereHas('order', fn ($q) => $q->where('user_id', $userId))
            ->whereNotNull('product_id')
            ->with('product:id,name,category_id')
            ->latest()
            ->limit(10)
            ->get()
            ->pluck('product.name')
            ->filter()
            ->unique()
            ->take(5)
            ->values()
            ->all();
    }

    private function buildSystemPrompt(): string
    {
        return <<<PROMPT
Bạn là Foodie Expert AI — chuyên viên tư vấn ẩm thực của HDG Food. Nhiệm vụ: đọc hiểu đúng ý khách (kể cả tiếng Việt không dấu, teen code) và gợi ý món từ menu thật bằng văn ngôn tự nhiên, ngon miệng, thân thiện.

BẮT BUỘC:
1) Trả lời tiếng Việt có dấu, xưng "em" với khách "mình", giọng ẩm thực tự nhiên (đậm đà, thanh nhẹ, giòn tan, thơm béo, nóng hổi…).
2) CHỈ gợi ý món có trong available_menu và còn hàng. Không bịa món, giá, topping.
3) Đọc kỹ normalized_user_input, extracted_entities và assistant_hints trước khi trả lời — phản hồi đúng ý khách đang hỏi.
4) Nếu khách hỏi tên món cụ thể: xác nhận món, nêu giá thật, mô tả ngắn hấp dẫn (1 câu), kèm SUGGESTION_CARD.
5) Nếu khách hỏi "rẻ nhất", "đắt nhất", "dưới 50k": dùng cheapest_items / expensive_items trong assistant_hints — KHÔNG chọn món đắt khi khách hỏi rẻ nhất.
6) Mỗi món gợi ý phải kèm block chính xác:
[SUGGESTION_CARD]{"id":1,"name":"Bún chả","price":50000}[/SUGGESTION_CARD]
(id, name, price phải khớp available_menu)
7) Có shipping_estimate thì nhắc phí ship thực tế. Có special_requests thì nhắc lại để xác nhận.
8) Không lặp lời chào nếu recent_messages vừa chào. Mở đầu tự nhiên: "Dạ em nghe đây mình ơi", "Vâng ạ"…
9) Cấu trúc: [Hiểu ý khách] + [Gợi ý món + mô tả ngắn] + [SUGGESTION_CARD] + [Câu hỏi gợi mở chốt đơn].

Theo khung giờ:
- Sáng: điểm tâm, cafe, đồ uống nhẹ
- Trưa: cơm, bún, phở, no bụng
- Chiều: trà sữa, ăn vặt
- Tối: món nóng, combo
- Khuya: món nhẹ, dễ tiêu

Output: 2–5 câu tự nhiên, 1–3 SUGGESTION_CARD, kết thúc bằng 1 câu hỏi.
PROMPT;
    }

    private function generateReply(string $userInput, array $recentMessages, string $systemPrompt, array $contextBlock, array $extractedEntities): array
    {
        if ($this->shouldSkipLlmCall($userInput, $contextBlock)) {
            $this->aiReplySource = 'heuristic';
            $fallbackReply = $this->fallbackReply($userInput, $recentMessages, $contextBlock, $extractedEntities);
            $dedupedFallback = $this->avoidRepeatedOpening($fallbackReply, $recentMessages);

            return [
                'reply' => $this->normalizeReply($dedupedFallback),
                'grounding_status' => [
                    'provider_cards' => 0,
                    'valid_cards' => 0,
                    'fallback_used' => false,
                ],
            ];
        }

        $providerReply = $this->callProvider($userInput, $recentMessages, $systemPrompt, $contextBlock);
        if ($providerReply !== null) {
            $grounded = $this->enforceGroundedReply($providerReply, $contextBlock, $userInput);
            $groundedReply = $grounded['reply'];
            $dedupedReply = $this->avoidRepeatedOpening($groundedReply, $recentMessages);
            return [
                'reply' => $this->normalizeReply($dedupedReply),
                'grounding_status' => $grounded['status'],
            ];
        }

        // Dự phòng: thiếu key, lỗi provider, 429, v.v. — tư vấn theo menu thật (products DB), không bịa món.
        $fallbackReply = $this->fallbackReply($userInput, $recentMessages, $contextBlock, $extractedEntities);
        $dedupedFallback = $this->avoidRepeatedOpening($fallbackReply, $recentMessages);
        return [
            'reply' => $this->normalizeReply($dedupedFallback),
            'grounding_status' => [
                'provider_cards' => 0,
                'valid_cards' => 0,
                'fallback_used' => true,
            ],
        ];
    }

    /**
     * Các tin nhắn đã có luồng dự phòng đủ tốt — bỏ qua LLM để giảm RPM/token và tránh 429.
     */
    private function shouldSkipLlmCall(string $userInput, array $contextBlock): bool
    {
        $handoff = $contextBlock['handoff_policy'] ?? [];
        if (($handoff['handoff_required'] ?? false) === true) {
            return true;
        }
        if ($this->isShortGreetingOnly($userInput)) {
            return true;
        }

        return false;
    }

    /**
     * Lấy API key qua config('services.foodie_ai.api_key') — map từ .env: FOODIE_AI_API_KEY (ưu tiên),
     * rồi GEMINI_API_KEY hoặc OPENAI_API_KEY tùy FOODIE_AI_PROVIDER. Sau đổi .env chạy: php artisan config:clear
     */
    private function callProvider(string $userInput, array $recentMessages, string $systemPrompt, array $contextBlock): ?string
    {
        $geminiKey = trim((string) config('services.foodie_ai.fallback_api_key'));
        $openaiKey = trim((string) config('services.foodie_ai.api_key'));
        $provider = strtolower((string) config('services.foodie_ai.provider', 'gemini'));

        if ($geminiKey === '' && $openaiKey === '') {
            $this->setAiError(
                code: 'AI_CONFIG_MISSING',
                message: 'Hệ thống tư vấn thông minh đang thiếu cấu hình. Vui lòng thử lại sau ít phút.'
            );
            return null;
        }

        // Ưu tiên Gemini khi có key — hiểu tiếng Việt tự nhiên tốt, tránh phụ thuộc keyword fallback.
        if ($geminiKey !== '') {
            $geminiReply = $this->callGeminiProvider(
                $geminiKey,
                $userInput,
                $recentMessages,
                $systemPrompt,
                $contextBlock,
                (string) config('services.foodie_ai.fallback_base_url'),
                (string) config('services.foodie_ai.fallback_model')
            );
            if ($geminiReply !== null) {
                $this->lastAiError = null;
                return $geminiReply;
            }
        }

        if ($provider === 'gemini' || $openaiKey === '') {
            return null;
        }

        $primaryError = $this->lastAiError;
        $this->lastAiError = null;
        $reply = $this->callOpenAICompatibleProvider($openaiKey, $userInput, $recentMessages, $systemPrompt, $contextBlock);
        if ($reply !== null) {
            return $reply;
        }

        if ($this->lastAiError === null && $primaryError !== null) {
            $this->lastAiError = $primaryError;
        }

        return null;
    }

    /**
     * OpenAI Chat Completions (hoặc API tương thích). Model lấy từ config services.foodie_ai.model:
     * ưu tiên FOODIE_AI_MODEL trong .env, sau đó OPENAI_MODEL, mặc định gpt-4o-mini — phù hợp chat tư vấn (rẻ, nhanh).
     */
    private function callOpenAICompatibleProvider(string $apiKey, string $userInput, array $recentMessages, string $systemPrompt, array $contextBlock): ?string
    {
        $baseUrl = rtrim((string) config('services.foodie_ai.base_url', 'https://api.openai.com/v1'), '/');
        $model = (string) config('services.foodie_ai.model', 'gpt-4o-mini');

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            [
                'role' => 'system',
                'content' => "SYSTEM_CONTEXT:\n" . json_encode($contextBlock, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ],
        ];

        foreach ($recentMessages as $msg) {
            $messages[] = [
                'role' => $msg['role'],
                'content' => $msg['content'],
            ];
        }

        $messages[] = ['role' => 'user', 'content' => $userInput];

        $payload = [
            'model' => $model,
            'temperature' => 0.7,
            'max_tokens' => 900,
            'messages' => $messages,
        ];

        $response = null;
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $response = Http::timeout(55)
                ->withToken($apiKey)
                ->post("{$baseUrl}/chat/completions", $payload);
            if ($response->successful()) {
                break;
            }
            if ($response->status() !== 429 || $attempt === 2) {
                break;
            }
            $retryAfter = $response->header('Retry-After');
            $seconds = is_numeric($retryAfter)
                ? min((int) $retryAfter, 60)
                : min(2 ** $attempt, 30);
            sleep(max(1, $seconds));
        }

        if (!$response->successful()) {
            $this->handleProviderHttpError($response->status(), $response->json());
            return null;
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        if (!is_string($content) || trim($content) === '') {
            $this->setAiError(
                code: 'AI_PROVIDER_ERROR',
                message: 'Phản hồi từ OpenAI không có nội dung. Hệ thống đã chuyển sang tư vấn dự phòng.'
            );
            return null;
        }

        return $content;
    }

    /**
     * Gemini yêu cầu luân phiên user/model và lượt đầu thường phải là user;
     * gộp các tin user liên tiếp để tránh 400 INVALID_ARGUMENT.
     */
    private function buildGeminiContents(array $recentMessages, string $userInput, array $contextBlock): array
    {
        $contextJson = json_encode($contextBlock, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $finalChunk = "SYSTEM_CONTEXT:\n{$contextJson}\n\nUSER_MESSAGE:\n" . trim($userInput);

        $turns = [];
        foreach ($recentMessages as $msg) {
            $role = ($msg['role'] ?? '') === 'assistant' ? 'model' : 'user';
            $text = trim((string) ($msg['content'] ?? ''));
            if ($text === '') {
                continue;
            }
            $turns[] = ['role' => $role, 'text' => $text];
        }

        $turns[] = ['role' => 'user', 'text' => $finalChunk];

        while (!empty($turns) && $turns[0]['role'] === 'model') {
            array_shift($turns);
        }

        if ($turns === []) {
            $turns[] = ['role' => 'user', 'text' => $finalChunk];
        }

        $merged = [];
        foreach ($turns as $t) {
            if ($merged === []) {
                $merged[] = $t;
                continue;
            }
            $lastIdx = count($merged) - 1;
            if ($merged[$lastIdx]['role'] === $t['role']) {
                $merged[$lastIdx]['text'] .= "\n\n" . $t['text'];
            } else {
                $merged[] = $t;
            }
        }

        return array_map(static fn (array $t) => [
            'role' => $t['role'],
            'parts' => [
                ['text' => $t['text']],
            ],
        ], $merged);
    }

    /**
     * Gọi Gemini generateContent; tối đa 2 lần khi 429 (tránh nhân RPM).
     */
    private function geminiGenerateContentWithRetry(string $apiKey, string $baseUrl, string $model, array $body): \Illuminate\Http\Client\Response
    {
        $url = "{$baseUrl}/models/{$model}:generateContent?key={$apiKey}";
        $response = null;
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $response = Http::timeout(55)->post($url, $body);
            if ($response->successful()) {
                return $response;
            }
            if ($response->status() !== 429) {
                return $response;
            }
            if ($attempt === 2) {
                return $response;
            }
            $retryAfter = $response->header('Retry-After');
            $seconds = is_numeric($retryAfter)
                ? min((int) $retryAfter, 60)
                : min(2 ** $attempt, 30);
            sleep(max(1, $seconds));
        }

        return $response;
    }

    private function callGeminiProvider(
        string $apiKey,
        string $userInput,
        array $recentMessages,
        string $systemPrompt,
        array $contextBlock,
        ?string $baseUrlOverride = null,
        ?string $modelOverride = null
    ): ?string {
        $baseUrl = rtrim($baseUrlOverride ?: (string) config('services.foodie_ai.base_url', 'https://generativelanguage.googleapis.com/v1beta'), '/');
        $model = $modelOverride ?: (string) config('services.foodie_ai.model', 'gemini-2.0-flash');

        $contents = $this->buildGeminiContents($recentMessages, $userInput, $contextBlock);

        $body = [
            'system_instruction' => [
                'parts' => [
                    ['text' => $systemPrompt],
                ],
            ],
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.7,
                'maxOutputTokens' => 900,
            ],
        ];

        $response = $this->geminiGenerateContentWithRetry($apiKey, $baseUrl, $model, $body);

        if (!$response->successful()) {
            $this->handleProviderHttpError($response->status(), $response->json());
            return null;
        }

        $json = $response->json();
        $text = data_get($json, 'candidates.0.content.parts.0.text');
        if (!is_string($text) || trim($text) === '') {
            $blockReason = data_get($json, 'promptFeedback.blockReason');
            $finish = data_get($json, 'candidates.0.finishReason');
            $extra = '';
            if (is_string($blockReason) && $blockReason !== '') {
                $extra = ' (blockReason: ' . Str::limit($blockReason, 80) . ')';
            } elseif (is_string($finish) && $finish !== '') {
                $extra = ' (finishReason: ' . Str::limit($finish, 80) . ')';
            }
            $this->setAiError(
                code: 'AI_PROVIDER_ERROR',
                message: 'Phản hồi AI không có nội dung (có thể bị chặn nội dung). Hệ thống đã chuyển sang tư vấn dự phòng.' . $extra
            );
            return null;
        }

        return $text;
    }

    private function fallbackReply(string $userInput, array $recentMessages, array $contextBlock, array $extractedEntities): string
    {
        $menu = collect($contextBlock['available_menu'] ?? []);
        $time = (string) ($contextBlock['time'] ?? now()->format('H:i'));
        [$hour] = array_map('intval', explode(':', $time));
        $handoff = $contextBlock['handoff_policy'] ?? ['handoff_required' => false, 'handoff_reason' => null];
        $shipping = $contextBlock['shipping_estimate'] ?? null;

        if (($handoff['handoff_required'] ?? false) === true) {
            $reason = (string) ($handoff['handoff_reason'] ?? 'Cần hỗ trợ thêm');
            return "Dạ mình ơi, em đã ghi nhận nội dung cần hỗ trợ kỹ hơn ({$reason}). Em xin phép chuyển ngay cho nhân viên CSKH để xử lý sát sao cho mình nhé, mình cho em xin thêm SĐT liên hệ thuận tiện ạ?";
        }

        if ($this->isShortGreetingOnly($userInput)) {
            $picked = $this->pickGroundedSuggestions($menu, $userInput, $extractedEntities)->take(3)->values();
            if ($picked->isEmpty()) {
                return 'Dạ em nghe đây mình ơi. Mình muốn ăn no bụng, ăn vặt hay uống gì mát để em gợi ý đúng món đang có sẵn cho mình ạ?';
            }
            $cards = $this->buildSuggestionCards($picked);
            $lines = $picked->map(fn ($item) => "• {$item['name']} — {$this->foodTasteHint($item)}, {$this->formatPriceVnd((float) $item['price'])}")->implode("\n");

            return "Dạ em nghe đây mình ơi — vài món đang sẵn bếp, mình thử xem gu nào hợp nha:\n{$lines}\n{$cards}\nMình muốn ăn no, ăn vặt hay uống gì mát để em lọc thêm cho đúng ạ?";
        }

        $ranking = $extractedEntities['ranking_intent'] ?? null;
        if (is_array($ranking) && !empty($ranking['type'])) {
            $selected = $this->applyRankingIntent($menu, $ranking)->take(3)->values();
            if ($selected->isNotEmpty()) {
                $cards = $this->buildSuggestionCards($selected);
                $lines = $selected->map(fn ($item) => "• {$item['name']} — {$this->formatPriceVnd((float) $item['price'])}")->implode("\n");
                $intro = match ($ranking['type']) {
                    'cheapest' => 'Dạ mình hỏi món rẻ nhất trên menu ạ — em lọc theo giá thấp nhất đang có sẵn:',
                    'expensive' => 'Dạ mình muốn món cao cấp nhất ạ — đây là các món giá cao nhất đang có:',
                    'under_price' => 'Dạ em lọc món dưới ' . $this->formatPriceVnd((float) ($ranking['max_price'] ?? 0)) . ' cho mình nè:',
                    default => 'Dạ em gợi ý món phù hợp theo yêu cầu của mình:',
                };

                return "{$intro}\n{$lines}\n{$cards}\nMình muốn em chốt món nào luôn hay xem thêm món cùng mức giá ạ?";
            }
        }

        $matched = $extractedEntities['product'] ?? null;
        if (is_array($matched) && !empty($matched['name'])) {
            $full = $menu->firstWhere('id', $matched['id']) ?? $matched;
            $taste = $this->foodTasteHint($full);
            $price = $this->formatPriceVnd((float) ($full['price'] ?? $matched['price']));
            $cards = $this->buildSuggestionCards(collect([$full]));
            $desc = trim((string) ($full['description'] ?? ''));
            $descLine = $desc !== '' ? " {$desc}." : " Món {$taste}, đang có sẵn trên menu.";

            return "Dạ mình hỏi {$matched['name']} ạ — giá {$price}.{$descLine}\n{$cards}\nMình muốn em thêm vào giỏ hay gợi ý món ăn kèm hợp gu không ạ?";
        }

        $preferred = $menu;
        if ($hour >= 5 && $hour < 10) {
            $preferred = $menu->filter(fn ($item) => Str::contains(Str::lower($item['name']), ['ca phe', 'cafe', 'banh', 'mi', 'diem tam', 'tra']));
        } elseif ($hour >= 10 && $hour <= 13) {
            $preferred = $menu->filter(fn ($item) => Str::contains(Str::lower($item['name']), ['com', 'bun', 'pho']));
        } elseif ($hour >= 14 && $hour <= 17) {
            $preferred = $menu->filter(fn ($item) => Str::contains(Str::lower($item['name']), ['tra sua', 'tra', 'nuoc', 'snack', 'an vat', 'banh', 'khoai', 'ga ran']));
        } elseif ($hour >= 21 || $hour < 1) {
            $preferred = $menu->filter(fn ($item) => (float) $item['price'] <= 60000);
        }

        if ($preferred->isEmpty()) {
            $preferred = $menu;
        }

        $selected = $this->pickGroundedSuggestions($preferred, $userInput, $extractedEntities)->take(3)->values();
        if ($selected->isEmpty()) {
            return 'Dạ mình ơi, hiện tại các món phù hợp đang tạm hết. Mình muốn em gợi ý nhóm món còn hàng gần gu của mình luôn không ạ?';
        }

        if ($this->isPriceOnlyQuery($userInput)) {
            $lines = $selected->map(fn ($item) => "• {$item['name']}: {$this->formatPriceVnd((float) $item['price'])}")->implode("\n");
            $cards = $this->buildSuggestionCards($selected);

            return "Dạ em gửi mình mức giá nhanh để mình chọn món hợp gu nhé:\n{$lines}\n{$cards}\nMình muốn em lọc thêm nhóm giá mềm hay món đậm vị hơn ạ?";
        }

        $shouldAvoidGreeting = $this->hasRecentGreeting($recentMessages);
        $intro = $shouldAvoidGreeting
            ? 'Dạ em đây ạ, em gợi ý luôn vài món đang sẵn bếp cho mình nhé.'
            : 'Dạ mình ơi, em gợi ý vài món đang sẵn bếp, vị tròn và dễ ăn nha.';
        if ($hour >= 5 && $hour < 10) {
            $intro = $shouldAvoidGreeting
                ? 'Em nghe đây mình ơi, buổi sáng em ưu tiên điểm tâm và đồ uống nhẹ cho mình ạ.'
                : 'Dạ buổi sáng mình dùng điểm tâm và cafe nhẹ sẽ rất hợp vị ạ.';
        } elseif ($hour >= 10 && $hour <= 13) {
            $intro = $shouldAvoidGreeting
                ? 'Dạ em lên ngay vài món trưa no bụng cho mình nhé.'
                : 'Dạ trưa nay mình có thể chọn vài món no lâu, vị đậm đà mà giá vẫn mềm ạ.';
        } elseif ($hour >= 14 && $hour <= 17) {
            $intro = $shouldAvoidGreeting
                ? 'Ngoài món đó ra, chiều nay mình dùng thêm ăn vặt hoặc trà sữa sẽ hợp lắm ạ.'
                : 'Vâng ạ, buổi chiều em ưu tiên món ăn vặt và đồ uống nhẹ cho mình nè.';
        } elseif ($hour >= 21 || $hour < 1) {
            $intro = $shouldAvoidGreeting
                ? 'Dạ em ưu tiên món nhẹ buổi khuya để mình ăn thoải mái mà không ngán ạ.'
                : 'Dạ giờ này em ưu tiên món nhẹ và dễ ăn để mình dùng khuya vẫn thoải mái ạ.';
        }

        $cards = $this->buildSuggestionCards($selected);
        $lines = $selected->map(fn ($item) => "• {$item['name']} — {$this->foodTasteHint($item)}, {$this->formatPriceVnd((float) $item['price'])}")->implode("\n");

        $userHint = Str::lower($userInput);
        $ending = 'Mình thích em chốt theo gu thanh nhẹ hay đậm vị hơn ạ?';
        if (Str::contains($userHint, ['re', 'rẻ', 'tiet kiem'])) {
            $ending = 'Dạ mình có muốn em lọc thêm combo dưới 50k để tiết kiệm hơn không ạ?';
        }
        if (is_array($shipping) && !empty($shipping['fee'])) {
            $fee = number_format((float) $shipping['fee'], 0, ',', '.');
            $eta = (int) ($shipping['eta_minutes'] ?? 30);
            $zone = (string) ($shipping['zone'] ?? 'inner_city');
            $ending = "Dạ phí ship khu vực {$zone} hiện khoảng {$fee}đ (tầm {$eta} phút). Mình muốn em chốt luôn combo tối ưu cả món lẫn phí ship không ạ?";
        }

        $specialRequests = $extractedEntities['special_requests'] ?? [];
        if (!empty($specialRequests)) {
            $joined = implode(', ', $specialRequests);
            $intro .= " Em đã ghi nhận yêu cầu {$joined} của mình rồi ạ.";
        }

        $prefs = $extractedEntities['preferences'] ?? [];
        if (!empty($prefs)) {
            $intro .= ' Em lọc theo gu ' . implode(', ', $prefs) . ' cho mình nè.';
        }

        return "{$intro}\n{$lines}\n{$cards}\n{$ending}";
    }

    private function normalizeReply(string $reply): string
    {
        $normalized = trim($reply);
        if ($normalized === '') {
            return 'Mình sẵn sàng gợi ý món ngon cho bạn ngay bây giờ. Bạn muốn ăn no lâu hay ăn nhẹ thôi?';
        }

        if (!preg_match('/\?$/u', $normalized)) {
            $normalized .= "\nBạn muốn mình gợi ý thêm vài lựa chọn cùng tầm giá không?";
        }

        return $normalized;
    }

    private function removeVietnameseAccents(string $text): string
    {
        $text = Str::lower(trim($text));
        if ($text === '') {
            return '';
        }

        $from = ['à','á','ạ','ả','ã','â','ầ','ấ','ậ','ẩ','ẫ','ă','ằ','ắ','ặ','ẳ','ẵ','è','é','ẹ','ẻ','ẽ','ê','ề','ế','ệ','ể','ễ','ì','í','ị','ỉ','ĩ','ò','ó','ọ','ỏ','õ','ô','ồ','ố','ộ','ổ','ỗ','ơ','ờ','ớ','ợ','ở','ỡ','ù','ú','ụ','ủ','ũ','ư','ừ','ứ','ự','ử','ữ','ỳ','ý','ỵ','ỷ','ỹ','đ'];
        $to   = ['a','a','a','a','a','a','a','a','a','a','a','a','a','a','a','a','a','e','e','e','e','e','e','e','e','e','e','e','i','i','i','i','i','o','o','o','o','o','o','o','o','o','o','o','o','o','o','o','o','o','u','u','u','u','u','u','u','u','u','u','u','y','y','y','y','y','d'];

        return str_replace($from, $to, $text);
    }

    private function buildAssistantHints(string $normalizedInput, array $entities, array $menu): array
    {
        $picked = $this->pickGroundedSuggestions(collect($menu), $normalizedInput, $entities);

        return [
            'intent_summary' => $this->summarizeUserIntent($normalizedInput, $entities),
            'matched_product' => $entities['product'] ?? null,
            'ranking_intent' => $entities['ranking_intent'] ?? null,
            'cheapest_items' => collect($menu)->sortBy('price')->take(5)->map(fn ($item) => [
                'id' => (int) $item['id'],
                'name' => (string) $item['name'],
                'price' => (float) $item['price'],
            ])->values()->all(),
            'expensive_items' => collect($menu)->sortByDesc('price')->take(3)->map(fn ($item) => [
                'id' => (int) $item['id'],
                'name' => (string) $item['name'],
                'price' => (float) $item['price'],
            ])->values()->all(),
            'top_suggestions' => $picked->map(fn ($item) => [
                'id' => (int) $item['id'],
                'name' => (string) $item['name'],
                'price' => (float) $item['price'],
                'category' => (string) ($item['category'] ?? ''),
                'taste_hint' => $this->foodTasteHint($item),
            ])->values()->all(),
        ];
    }

    private function summarizeUserIntent(string $input, array $entities): string
    {
        $parts = [];

        if (!empty($entities['product']['name'])) {
            $price = number_format((float) ($entities['product']['price'] ?? 0), 0, ',', '.');
            $parts[] = "Khách đang hỏi về món \"{$entities['product']['name']}\" (khoảng {$price}đ)";
        }

        if (!empty($entities['preferences'])) {
            $parts[] = 'Gu / nhu cầu: ' . implode(', ', $entities['preferences']);
        }

        if (!empty($entities['special_requests'])) {
            $parts[] = 'Yêu cầu đặc biệt: ' . implode(', ', $entities['special_requests']);
        }

        if (!empty($entities['quantity'])) {
            $parts[] = 'Số lượng dự kiến: ' . (int) $entities['quantity'];
        }

        if ($this->isPriceOnlyQuery($input)) {
            $parts[] = 'Khách muốn biết giá món';
        } elseif (!empty($entities['ranking_intent']['type'])) {
            $rankLabels = [
                'cheapest' => 'Khách muốn món rẻ nhất trên menu',
                'expensive' => 'Khách muốn món đắt nhất / cao cấp',
                'under_price' => 'Khách muốn món dưới mức giá nhất định',
            ];
            $parts[] = $rankLabels[$entities['ranking_intent']['type']] ?? 'Khách hỏi theo mức giá';
        } elseif (Str::contains($input, ['an gi', 'mon gi', 'goi y', 'doi qua', 'ngon'])) {
            $parts[] = 'Khách cần gợi ý món phù hợp';
        }

        return $parts !== []
            ? implode('. ', $parts) . '.'
            : 'Khách cần tư vấn món từ menu đang có sẵn.';
    }

    private function detectPreferences(string $normalized): array
    {
        $prefs = [];
        $map = [
            '/healthy|it calo|eat clean|an kieng|giam can|salad/u' => 'healthy / ít calo',
            '/chay|mon chay|quan chay/u' => 'ăn chay',
            '/cay|spicy|ot/u' => 'cay',
            '/re|tiet kiem|gia mem|duoi\s*\d/u' => 'giá mềm',
            '/ngot|tra sua|che|banh ngot/u' => 'ngọt / tráng miệng',
            '/uong|nuoc|cafe|ca phe|tra\b/u' => 'đồ uống',
            '/no|com trua|an trua|trua\b/u' => 'ăn no / bữa trưa',
            '/an vat|snack|xiên|nem/u' => 'ăn vặt',
            '/dem|khuya|dem khuya/u' => 'ăn khuya nhẹ',
        ];

        foreach ($map as $pattern => $label) {
            if (preg_match($pattern, $normalized)) {
                $prefs[] = $label;
            }
        }

        return array_values(array_unique($prefs));
    }

    private function menuMatchStopwords(): array
    {
        return [
            'menu', 'thuc', 'don', 'mon', 'an', 'gia', 're', 'nhat', 'dat', 'cao',
            'cap', 'bao', 'nhieu', 'tien', 'cho', 'minh', 'em', 'shop', 'nha', 'hang',
            'hdg', 'food', 'giup', 'tu', 'van', 'goi', 'y', 'xin', 'vui', 'long',
            'muon', 'can', 'co', 'khong', 'nhu', 'the', 'nao', 'gi', 'j', 'ak',
        ];
    }

    private function detectRankingIntent(string $normalized): ?array
    {
        $text = $this->removeVietnameseAccents(Str::lower(trim($normalized)));

        if (preg_match('/duoi\s*(\d+)\s*k/u', $text, $m)) {
            return ['type' => 'under_price', 'max_price' => (int) $m[1] * 1000];
        }

        if (preg_match('/(dat nhat|gia cao nhat|cao cap nhat|mon dat nhat)/u', $text)) {
            return ['type' => 'expensive'];
        }

        if (preg_match('/(re nhat|gia re nhat|mon re nhat|re tren menu|re trong menu|menu re nhat|re nhat menu)/u', $text)) {
            return ['type' => 'cheapest'];
        }

        if (preg_match('/\bre nhat\b/u', $text) || preg_match('/\bgia re\b/u', $text)) {
            return ['type' => 'cheapest'];
        }

        return null;
    }

    private function applyRankingIntent(\Illuminate\Support\Collection $menu, array $ranking): \Illuminate\Support\Collection
    {
        return match ($ranking['type'] ?? '') {
            'expensive' => $menu->sortByDesc('price')->values(),
            'under_price' => $menu
                ->filter(fn ($item) => (float) ($item['price'] ?? 0) <= (float) ($ranking['max_price'] ?? PHP_FLOAT_MAX))
                ->sortBy('price')
                ->values(),
            default => $menu->sortBy('price')->values(),
        };
    }

    private function foodTasteHint(array $item): string
    {
        $name = $this->removeVietnameseAccents((string) ($item['name'] ?? ''));
        $category = $this->removeVietnameseAccents((string) ($item['category'] ?? ''));

        if (Str::contains($name, ['tra sua', 'ca phe', 'nuoc', 'sinh to', 'tra '])) {
            return 'thơm mát, dễ uống';
        }
        if (Str::contains($name, ['pho', 'bun', 'mi', 'hu tieu'])) {
            return 'nóng hổi, đậm vị nước dùng';
        }
        if (Str::contains($name, ['com', 'cơm'])) {
            return 'no bụng, tròn vị';
        }
        if (Str::contains($name, ['banh', 'flan', 'che'])) {
            return 'ngọt nhẹ, dễ ăn';
        }
        if (Str::contains($name, ['goi cuon', 'salad', 'healthy'])) {
            return 'thanh mát, nhẹ bụng';
        }
        if (Str::contains($category, ['do uong', 'nuoc'])) {
            return 'giải khát, mát lạnh';
        }

        return 'đang sẵn bếp, giao nhanh';
    }

    private function formatPriceVnd(float $price): string
    {
        return number_format($price, 0, ',', '.') . 'đ';
    }

    private function buildSuggestionCards(\Illuminate\Support\Collection $items): string
    {
        return $items->map(function ($item) {
            $card = json_encode([
                'id' => (int) $item['id'],
                'name' => (string) $item['name'],
                'price' => (float) $item['price'],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            return "[SUGGESTION_CARD]{$card}[/SUGGESTION_CARD]";
        })->implode("\n");
    }

    /**
     * Khớp món trong tin nhắn — tránh lỗi 1 ký tự (vd: "ê" khớp "phê" trong "Cà phê").
     */
    private function matchMenuProduct(string $normalized, array $availableMenu): ?array
    {
        $text = $this->removeVietnameseAccents(trim($normalized));
        if ($text === '') {
            return null;
        }

        if (mb_strlen($text) === 1) {
            return null;
        }

        if ($this->isShortGreetingOnly($text)) {
            return null;
        }

        if ($this->detectRankingIntent($normalized) !== null) {
            return null;
        }

        $minReverseLen = 4;

        foreach ($availableMenu as $item) {
            $name = $this->removeVietnameseAccents((string) ($item['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            if (Str::contains($text, $name)) {
                return $item;
            }
            if (mb_strlen($text) >= $minReverseLen && Str::contains($name, $text)) {
                return $item;
            }
        }

        $stopwords = $this->menuMatchStopwords();
        $tokens = array_values(array_filter(
            preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [],
            static fn ($t) => mb_strlen((string) $t) >= 4
        ));

        foreach ($tokens as $token) {
            if (in_array($token, $stopwords, true)) {
                continue;
            }
            foreach ($availableMenu as $item) {
                $name = $this->removeVietnameseAccents((string) ($item['name'] ?? ''));
                if ($name !== '' && Str::contains($name, $token)) {
                    return $item;
                }
            }
        }

        return null;
    }

    private function extractEntities(string $message, array $availableMenu): array
    {
        $normalized = Str::lower($message);
        $quantity = null;
        if (preg_match('/(?:^|\s)(\d+)(?:\s|$)/u', $normalized, $matches)) {
            $quantity = (int) $matches[1];
        }

        $specialRequests = [];
        $specialPatterns = [
            '/khong\s+hanh|ko\s+hanh|k\s+hanh/u' => 'không hành',
            '/it\s+cay|bot\s+cay/u' => 'ít cay',
            '/khong\s+cay|ko\s+cay|k\s+cay/u' => 'không cay',
            '/it\s+duong|bot\s+duong/u' => 'ít đường',
            '/khong\s+da|ko\s+da|k\s+da/u' => 'không đá',
        ];

        foreach ($specialPatterns as $pattern => $label) {
            if (preg_match($pattern, $normalized)) {
                $specialRequests[] = $label;
            }
        }

        $address = null;
        if (preg_match('/(\d+\s+[^\n,]{4,80})/u', $message, $addressMatch)) {
            $address = trim($addressMatch[1]);
        }

        $menuMatch = $this->detectRankingIntent($normalized) === null
            ? $this->matchMenuProduct($normalized, $availableMenu)
            : null;

        return [
            'product' => is_array($menuMatch) ? [
                'id' => $menuMatch['id'],
                'name' => $menuMatch['name'],
                'price' => $menuMatch['price'],
                'category' => $menuMatch['category'] ?? '',
            ] : null,
            'ranking_intent' => $this->detectRankingIntent($normalized),
            'quantity' => $quantity,
            'preferences' => $this->detectPreferences($normalized),
            'special_requests' => array_values(array_unique($specialRequests)),
            'address' => $address,
        ];
    }

    private function detectHandoffNeed(string $message): array
    {
        $normalized = Str::lower($message);
        $hardComplaintPatterns = [
            '/khieu\s*nai/u' => 'Khiếu nại dịch vụ',
            '/thuc\s*an\s*hong|oiu|thiu|nghi\s*ngo\s*ngo\s*doc/u' => 'Phản ánh chất lượng món',
            '/hoan\s*tien|refund/u' => 'Yêu cầu hoàn tiền',
            '/to\s*cao|bao\s*cong\s*an|kien/u' => 'Rủi ro pháp lý',
            '/nhan\s*vien\s*thai\s*do|phuc\s*vu\s*te/u' => 'Khiếu nại thái độ phục vụ',
        ];

        foreach ($hardComplaintPatterns as $pattern => $reason) {
            if (preg_match($pattern, $normalized)) {
                return ['required' => true, 'reason' => $reason];
            }
        }

        return ['required' => false, 'reason' => null];
    }

    private function estimateShippingFee(?string $address, ?string $districtCode, ?string $wardCode, ?string $provinceCode): array
    {
        $baseFee = 15000.0;
        $eta = 25;
        $zone = 'inner_city';
        $addressText = Str::lower((string) $address);

        if ($provinceCode && !in_array($provinceCode, ['79', '01'], true)) {
            $zone = 'outer_city';
            $baseFee = 32000.0;
            $eta = 55;
        }

        if ($districtCode && in_array($districtCode, ['760', '761', '764', '765'], true)) {
            $zone = 'inner_city';
            $baseFee = 15000.0;
            $eta = 25;
        } elseif ($districtCode) {
            $zone = 'suburban';
            $baseFee = 25000.0;
            $eta = 40;
        }

        if ($addressText !== '') {
            if (preg_match('/thu\s*duc|quan\s*9|quan\s*12|hoc\s*mon|binh\s*chanh|nha\s*be|cu\s*chi|go\s*vap/u', $addressText)) {
                $zone = 'suburban';
                $baseFee = 25000.0;
                $eta = 40;
            }
            if (preg_match('/quan\s*1|quan\s*3|quan\s*4|quan\s*5|quan\s*10|phu\s*nhuan|binh\s*thanh/u', $addressText)) {
                $zone = 'inner_city';
                $baseFee = 15000.0;
                $eta = 25;
            }
        }

        if ($wardCode) {
            $baseFee += 2000;
        }

        return [
            'address' => $address,
            'province_code' => $provinceCode,
            'district_code' => $districtCode,
            'ward_code' => $wardCode,
            'zone' => $zone,
            'fee' => $baseFee,
            'currency' => 'VND',
            'eta_minutes' => $eta,
            'note' => 'Phi ship uoc tinh theo khu vuc, se duoc xac nhan lai khi tao don.',
        ];
    }

    private function hasRecentGreeting(array $recentMessages): bool
    {
        $lastAssistant = collect($recentMessages)
            ->reverse()
            ->first(fn ($m) => ($m['role'] ?? null) === 'assistant');

        if (!$lastAssistant || !is_array($lastAssistant)) {
            return false;
        }

        $content = Str::lower((string) ($lastAssistant['content'] ?? ''));
        return Str::contains($content, ['xin chao', 'chao ban', 'chao minh', 'chao ban nhe', 'chao']);
    }

    private function normalizeUserMessage(string $message): string
    {
        $normalized = Str::lower(trim($message));
        $replacements = [
            '/\bj\b/u' => 'gi',
            '/\bko\b/u' => 'khong',
            '/\bk\b/u' => 'khong',
            '/\bhok\b/u' => 'khong',
            '/\bt\b/u' => 'toi',
            '/\bm\b/u' => 'minh',
            '/\bnhe\b/u' => 'nhe',
            '/\bnhiu\b/u' => 'nhieu',
            '/\bship toi\b/u' => 'giao toi',
            '/\bship t\b/u' => 'giao toi',
            '/\bshipp\b/u' => 'giao',
            '/\bship\b/u' => 'giao',
            '/\bdc\b/u' => 'duoc',
            '/\bkg\b/u' => 'khong',
            '/\bhum nay\b/u' => 'hom nay',
            '/\bhnay\b/u' => 'hom nay',
            '/\bngon ko\b/u' => 'ngon khong',
            '/\bmon j\b/u' => 'mon gi',
            '/\ban gi\b/u' => 'an gi',
            '/\bdoi qua\b/u' => 'doi qua',
            '/\bgoi y\b/u' => 'goi y',
            '/\bhealthy\b/u' => 'healthy',
            '/\bit calo\b/u' => 'it calo',
            '/\ban vat\b/u' => 'an vat',
            '/\btra sua\b/u' => 'tra sua',
            '/\bca phe\b/u' => 'ca phe',
            '/\bko hanh\b/u' => 'khong hanh',
            '/\bnguoi ta\b/u' => 'nguoi ta',
            '/\bcho minh\b/u' => 'cho minh',
        ];

        foreach ($replacements as $pattern => $replacement) {
            $normalized = preg_replace($pattern, $replacement, $normalized) ?? $normalized;
        }

        $normalized = preg_replace('/\s+/u', ' ', $normalized) ?? $normalized;
        return trim($normalized);
    }

    private function isShortGreetingOnly(string $normalizedMessage): bool
    {
        $text = trim($normalizedMessage);
        if ($text === '') {
            return true;
        }
        if (mb_strlen($text) > 16) {
            return false;
        }

        $shortGreetings = [
            'hi', 'hello', 'helo', 'alo', 'a lo', 'chao', 'chao shop', 'shop oi', 'em oi', 'ad oi', 'xin chao',
            'e', 'ê', 'oi', 'ơi', 'a', 'ạ', 'dạ', 'he', 'hế', 'hè', 'hả', 'hm', 'uhm',
        ];

        return in_array($text, $shortGreetings, true);
    }

    private function isPriceOnlyQuery(string $normalizedMessage): bool
    {
        $text = Str::lower(trim($normalizedMessage));
        if ($text === '') {
            return false;
        }

        $priceSignals = [
            'gia',
            'bao nhieu',
            'bao nhieu tien',
            'bn',
            'bn tien',
            'nhiu tien',
            'giá',
        ];

        $hasPriceSignal = Str::contains($text, $priceSignals);
        if (!$hasPriceSignal) {
            return false;
        }

        $nonPriceSignals = [
            'ship',
            'giao',
            'dia chi',
            'khong hanh',
            'it cay',
            'hoan tien',
            'khieu nai',
            'dat mon',
        ];

        return !Str::contains($text, $nonPriceSignals);
    }

    private function avoidRepeatedOpening(string $reply, array $recentMessages): string
    {
        $normalized = trim($reply);
        if ($normalized === '' || !$this->hasRecentGreeting($recentMessages)) {
            return $normalized;
        }

        $openers = [
            '/^d[ạa]\s*m[ìi]nh\s*ơi[,\s]*/iu',
            '/^ch[aà]o\s*b[ạa]n[,\s]*/iu',
            '/^xin\s*ch[aà]o[,\s]*/iu',
            '/^v[âa]ng\s*ạ[,\s]*/iu',
        ];

        $adjusted = $normalized;
        foreach ($openers as $pattern) {
            $adjusted = preg_replace($pattern, '', $adjusted) ?? $adjusted;
        }

        $adjusted = ltrim($adjusted);
        if ($adjusted === '') {
            return 'Dạ em nghe đây ạ, mình muốn em hỗ trợ món nào để em chốt nhanh cho mình nhé?';
        }

        return "Dạ em nghe đây ạ, {$adjusted}";
    }

    private function enforceGroundedReply(string $reply, array $contextBlock, string $userInput): array
    {
        $menu = collect($contextBlock['available_menu'] ?? [])->values();
        if ($menu->isEmpty()) {
            return [
                'reply' => $reply,
                'status' => [
                    'provider_cards' => 0,
                    'valid_cards' => 0,
                    'fallback_used' => false,
                ],
            ];
        }

        $menuById = $menu->keyBy('id');
        $pattern = '/\[SUGGESTION_CARD\](\{.*?\})\[\/SUGGESTION_CARD\]/su';
        preg_match_all($pattern, $reply, $matches, PREG_SET_ORDER);
        $providerCards = count($matches);

        $validCards = [];
        foreach ($matches as $match) {
            $decoded = json_decode($match[1], true);
            if (!is_array($decoded)) {
                continue;
            }
            $id = (int) ($decoded['id'] ?? 0);
            if ($id > 0 && $menuById->has($id)) {
                $real = $menuById->get($id);
                $validCards[] = [
                    'id' => (int) $real['id'],
                    'name' => (string) $real['name'],
                    'price' => (float) $real['price'],
                ];
            }
        }

        $textBody = trim((string) (preg_replace($pattern, '', $reply) ?? $reply));
        $fallbackUsed = false;
        if (empty($validCards)) {
            $picked = $this->pickGroundedSuggestions($menu, $userInput, $this->extractEntities($userInput, $menu->all()));
            $validCards = $picked->map(fn ($item) => [
                'id' => (int) $item['id'],
                'name' => (string) $item['name'],
                'price' => (float) $item['price'],
            ])->values()->all();
            $fallbackUsed = true;

            if ($textBody !== '') {
                $hints = $this->buildAssistantHints($userInput, $this->extractEntities($userInput, $menu->all()), $menu->all());
                $names = collect($hints['top_suggestions'] ?? [])->pluck('name')->take(3)->implode(', ');
                if ($names !== '') {
                    $textBody .= "\nDạ em gợi ý món đang có sẵn: {$names}.";
                }
            }
        }

        $cardsText = collect($validCards)->take(3)->map(function ($card) {
            return '[SUGGESTION_CARD]' . json_encode($card, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '[/SUGGESTION_CARD]';
        })->implode("\n");

        return [
            'reply' => trim($textBody . "\n" . $cardsText),
            'status' => [
                'provider_cards' => $providerCards,
                'valid_cards' => count($validCards),
                'fallback_used' => $fallbackUsed,
            ],
        ];
    }

    private function pickGroundedSuggestions(\Illuminate\Support\Collection $menu, string $userInput, array $entities = []): \Illuminate\Support\Collection
    {
        $ranking = $entities['ranking_intent'] ?? $this->detectRankingIntent($userInput);
        if (is_array($ranking) && !empty($ranking['type'])) {
            return $this->applyRankingIntent($menu, $ranking);
        }

        $text = $this->removeVietnameseAccents(Str::lower($userInput));
        $prefs = $entities['preferences'] ?? $this->detectPreferences($text);
        $stopwords = $this->menuMatchStopwords();

        $scored = $menu->map(function ($item) use ($text, $prefs, $entities, $stopwords) {
            $score = 0;
            $name = $this->removeVietnameseAccents(Str::lower((string) ($item['name'] ?? '')));
            $category = $this->removeVietnameseAccents(Str::lower((string) ($item['category'] ?? '')));
            $tags = collect($item['tags'] ?? [])->map(fn ($t) => $this->removeVietnameseAccents(Str::lower((string) $t)))->all();

            if (Str::contains($text, ['cafe', 'ca phe', 'diem tam', 'sang']) && Str::contains($name, ['ca phe', 'tra', 'banh', 'mi'])) {
                $score += 4;
            }
            if (Str::contains($text, ['trua', 'com', 'bun', 'pho', 'no']) && Str::contains($name, ['com', 'bun', 'pho', 'mi'])) {
                $score += 4;
            }
            if (Str::contains($text, ['chieu', 'toi', 'an vat', 'tra sua', 'lau']) && Str::contains($name, ['tra sua', 'an vat', 'lau', 'nuoc', 'banh'])) {
                $score += 4;
            }

            foreach ($prefs as $pref) {
                $p = $this->removeVietnameseAccents(Str::lower($pref));
                if (Str::contains($p, 'healthy') && (Str::contains($name, ['goi', 'salad', 'healthy', 'rau']) || Str::contains($category, ['healthy', 'salad']))) {
                    $score += 5;
                }
                if (Str::contains($p, 'do uong') && Str::contains($name, ['tra', 'ca phe', 'nuoc', 'sinh to'])) {
                    $score += 5;
                }
                if (Str::contains($p, 'gia mem') && (float) ($item['price'] ?? 0) <= 50000) {
                    $score += 4;
                }
                if (Str::contains($p, 'an vat') && Str::contains($name, ['nem', 'xiên', 'banh', 'khoai', 'ga ran'])) {
                    $score += 4;
                }
            }

            if (!empty($entities['product']['id']) && (int) $entities['product']['id'] === (int) ($item['id'] ?? 0)) {
                $score += 10;
            }

            foreach (preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $token) {
                if (mb_strlen($token) < 4 || in_array($token, $stopwords, true)) {
                    continue;
                }
                if (Str::contains($name, $token)) {
                    $score += 2;
                }
            }

            if (in_array('noi bat', $tags, true)) {
                $score += 1;
            }

            return ['item' => $item, 'score' => $score];
        });

        $ranked = $scored->sortByDesc('score')->values();
        $top = $ranked->filter(fn ($row) => $row['score'] > 0)->take(3);

        if ($top->isNotEmpty()) {
            return $top->pluck('item')->values();
        }

        return $menu->sortBy('price')->take(3)->values();
    }

    private function calculateIntentScore(string $normalizedMessage, array $entities, array $handoff): array
    {
        $text = Str::lower($normalizedMessage);
        $score = [
            'greeting' => 0.0,
            'order' => 0.0,
            'shipping' => 0.0,
            'complaint' => 0.0,
        ];

        if ($this->isShortGreetingOnly($text) || Str::contains($text, ['chao', 'hi', 'hello', 'alo'])) {
            $score['greeting'] += 0.75;
        }

        if (mb_strlen(trim($text)) <= 2 && $score['greeting'] < 0.5) {
            $score['greeting'] += 0.55;
        }

        if (
            !$this->isShortGreetingOnly($text) &&
            (
                !empty($entities['product']) ||
                !empty($entities['quantity']) ||
                !empty($entities['special_requests']) ||
                Str::contains($text, ['dat mon', 'goi mon', 'them vao gio', 'an gi', 'mon nao'])
            )
        ) {
            $score['order'] += 0.65;
        }

        if (
            !empty($entities['address']) ||
            Str::contains($text, ['ship', 'giao', 'phi ship', 'freeship', 'dia chi', 'bao lau'])
        ) {
            $score['shipping'] += 0.7;
        }

        if (($handoff['required'] ?? false) === true) {
            $score['complaint'] = 0.95;
        } elseif (Str::contains($text, ['khieu nai', 'hoan tien', 'do an hong', 'thai do'])) {
            $score['complaint'] += 0.7;
        }

        foreach ($score as $key => $value) {
            $score[$key] = min(1.0, round($value, 2));
        }

        return $score;
    }

    private function resolveTopIntent(array $intentScore): string
    {
        $max = max($intentScore);
        if ($max <= 0) {
            return 'greeting';
        }

        arsort($intentScore);
        $top = array_key_first($intentScore);
        return is_string($top) ? $top : 'greeting';
    }

    private function setAiError(string $code, string $message): void
    {
        if ($this->lastAiError !== null) {
            return;
        }
        $this->lastAiError = [
            'code' => $code,
            'message' => $message,
        ];
    }

    private function formatProviderApiErrorHint(?array $errorBody): string
    {
        if (!is_array($errorBody)) {
            return '';
        }
        $msg = data_get($errorBody, 'error.message');
        if (!is_string($msg) || trim($msg) === '') {
            return '';
        }

        return ' Chi tiết: ' . Str::limit(trim($msg), 240);
    }

    private function handleProviderHttpError(int $status, ?array $errorBody = null): void
    {
        $hint = $this->formatProviderApiErrorHint($errorBody);

        if (in_array($status, [401, 403], true)) {
            $this->setAiError(
                code: 'AI_AUTH_FAILED',
                message: 'Kết nối AI chưa hợp lệ. Hệ thống đang dùng chế độ tư vấn dự phòng.' . $hint
            );
            return;
        }

        if ($status === 404) {
            $this->setAiError(
                code: 'AI_MODEL_NOT_FOUND',
                message: 'Model AI không khả dụng hoặc sai tên (404). Gemini: dùng gemini-2.0-flash (gemini-1.5-flash thường không còn trên API v1beta). OpenAI: gpt-4o-mini / gpt-4o. Gọi ListModels hoặc xem https://ai.google.dev/gemini-api/docs/models — cập nhật FOODIE_AI_MODEL và php artisan config:clear.' . $hint
            );
            return;
        }

        if ($status === 429) {
            $prov = strtolower((string) config('services.foodie_ai.provider', 'gemini'));
            $isOpenAi = in_array($prov, ['openai', 'chatgpt'], true);
            // Tin ngắn cho toast/UI — tránh bị cắt chữ
            $message = $isOpenAi
                ? 'OpenAI báo 429 (hết hạn mức hoặc gọi quá nhanh). Xem usage/billing trên platform.openai.com. HDG vẫn gợi ý món theo menu thực tế của cửa hàng.'
                : 'Gemini báo 429 (quota hoặc RPM). Đợi vài phút, kiểm tra aistudio.google.com, hoặc đổi API key. HDG vẫn gợi ý món theo menu thực tế của cửa hàng.';
            $this->setAiError(
                code: 'AI_QUOTA_EXCEEDED',
                message: $message
            );
            return;
        }

        if ($status >= 500) {
            $this->setAiError(
                code: 'AI_PROVIDER_UNAVAILABLE',
                message: 'Dịch vụ AI đang bận. Mình vẫn tư vấn theo dữ liệu thực tế để không gián đoạn.' . $hint
            );
            return;
        }

        $this->setAiError(
            code: 'AI_PROVIDER_ERROR',
            message: 'Kết nối AI tạm thời chưa ổn định (HTTP ' . $status . '). Hệ thống đã chuyển sang tư vấn dự phòng.' . $hint
        );
    }

    private function buildAiStatusPayload(): array
    {
        if ($this->lastAiError === null) {
            return [
                'ok' => true,
                'code' => null,
                'message' => null,
                'source' => $this->aiReplySource === 'heuristic' ? 'menu_heuristic' : 'llm',
            ];
        }

        return [
            'ok' => false,
            'code' => $this->lastAiError['code'] ?? 'AI_PROVIDER_ERROR',
            'message' => $this->lastAiError['message'] ?? 'Kết nối AI tạm thời chưa ổn định.',
            'source' => 'llm',
        ];
    }

    private function buildUnderstandingPayload(
        string $normalizedInput,
        array $entities,
        array $intentScore,
        string $topIntent,
        array $handoff,
        array $shippingEstimate,
        array $groundingStatus
    ): array {
        $constraintsApplied = [
            'menu_grounded' => true,
            'out_of_stock_blocked' => true,
            'shipping_estimated' => !empty($shippingEstimate['fee']),
            'special_request_detected' => !empty($entities['special_requests']),
            'handoff_required' => (bool) ($handoff['required'] ?? false),
            'fallback_grounding_used' => (bool) ($groundingStatus['fallback_used'] ?? false),
        ];

        return [
            'normalized_input' => $normalizedInput,
            'intent' => [
                'top' => $topIntent,
                'score' => $intentScore,
            ],
            'entities' => $entities,
            'constraints_applied' => $constraintsApplied,
        ];
    }
}
