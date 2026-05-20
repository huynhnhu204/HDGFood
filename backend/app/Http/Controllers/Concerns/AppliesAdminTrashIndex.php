<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait AppliesAdminTrashIndex
{
    protected function applyAdminTrashIndexScope(Builder $query, Request $request): Builder
    {
        if ($request->boolean('only_trashed')) {
            $query->onlyTrashed();
        }

        return $query;
    }
}
