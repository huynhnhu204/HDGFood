<?php

namespace App\Mail;

use App\Models\Contact;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactThanksMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Contact $contact)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'HDG Food da nhan duoc lien he cua ban',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.contact-thanks',
            with: [
                'name' => $this->contact->name,
                'message' => $this->contact->message,
            ],
        );
    }
}
