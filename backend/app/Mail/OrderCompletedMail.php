<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderCompletedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Don hang cua ban da hoan thanh - HDG Food',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.order-completed',
            with: [
                'orderId' => $this->order->id,
                'customerName' => $this->order->delivery_name ?? 'Quy khach',
                'total' => (float) ($this->order->final_total ?? 0),
                'paidMethod' => $this->order->payment_method ?? 'cod',
            ],
        );
    }
}
