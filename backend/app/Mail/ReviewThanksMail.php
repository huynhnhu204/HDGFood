<?php

namespace App\Mail;

use App\Models\Review;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReviewThanksMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Review $review)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Cam on ban da gui danh gia cho HDG Food',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.review-thanks',
            with: [
                'name' => $this->review->user?->name ?? 'Quy khach',
                'productName' => $this->review->product?->name ?? 'san pham',
                'rating' => (int) $this->review->rating,
            ],
        );
    }
}
