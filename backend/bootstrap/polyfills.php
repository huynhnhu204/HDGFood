<?php

if (!function_exists('mb_split')) {
    /**
     * Fallback for environments without ext-mbstring.
     * This keeps Laravel string helpers working for simple split patterns.
     */
    function mb_split(string $pattern, string $string, int $limit = -1): array|false
    {
        $delimiter = '/';
        $escapedPattern = str_replace($delimiter, '\\' . $delimiter, $pattern);
        $regex = $delimiter . $escapedPattern . $delimiter . 'u';

        return preg_split($regex, $string, $limit);
    }
}

