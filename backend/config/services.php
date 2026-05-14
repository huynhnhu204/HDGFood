<?php

$foodieProvider = strtolower((string) env('FOODIE_AI_PROVIDER', 'gemini'));
$foodieIsOpenAi = in_array($foodieProvider, ['openai', 'chatgpt'], true);

return [
    'mailgun' => [
        'domain'   => env('MAILGUN_DOMAIN'),
        'secret'   => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme'   => 'https',
    ],
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],
    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],
    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect'      => env('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/auth/google/callback'),
    ],
    'foodie_ai' => [
        'provider' => $foodieProvider,
        // callProvider dùng config này: ưu tiên FOODIE_AI_API_KEY, sau đó OPENAI_API_KEY | GEMINI_API_KEY
        'api_key' => env('FOODIE_AI_API_KEY')
            ?: ($foodieIsOpenAi ? env('OPENAI_API_KEY') : env('GEMINI_API_KEY')),
        'base_url' => env('FOODIE_AI_BASE_URL') ?: (
            $foodieIsOpenAi
                ? 'https://api.openai.com/v1'
                : 'https://generativelanguage.googleapis.com/v1beta'
        ),
        // Gemini: FOODIE_AI_MODEL / GEMINI_MODEL — mặc định gemini-2.0-flash (1.5-flash thường không còn trên v1beta).
        'model' => env('FOODIE_AI_MODEL') ?: (
            $foodieIsOpenAi
                ? env('OPENAI_MODEL', 'gpt-4o-mini')
                : env('GEMINI_MODEL', 'gemini-2.0-flash')
        ),
    ],
];
