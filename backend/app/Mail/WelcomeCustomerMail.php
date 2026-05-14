<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeCustomerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Chao mung ban den voi HDG Food',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome-customer',
            with: [
                'name' => $this->user->name,
                'email' => $this->user->email,
            ],
        );
    }
}
