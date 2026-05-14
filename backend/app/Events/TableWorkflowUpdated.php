<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TableWorkflowUpdated implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $tableId,
        public string $tableName,
        public string $status,
        public string $action,
        public ?int $orderId = null,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('hdg.tables');
    }

    public function broadcastAs(): string
    {
        return 'table.workflow.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'table_id' => $this->tableId,
            'table_name' => $this->tableName,
            'status' => $this->status,
            'action' => $this->action,
            'order_id' => $this->orderId,
            'at' => now()->toIso8601String(),
        ];
    }
}
