# WhatsApp via click-to-chat (wa.me); Activity logs intent, not delivery

The mandatory WhatsApp feature is implemented with click-to-chat links (`https://wa.me/<phone>?text=<encoded message>`), not the Meta WhatsApp Business API. The competition brief ("auto-fill a message template, open WhatsApp Web/App") describes click-to-chat exactly, and the Business API requires Meta business verification and template pre-approval that cannot fit the 4-day timeline.

Consequence: the app cannot know whether the message was actually sent. A **WhatsApp Contact** Activity is therefore recorded at the moment the user clicks the button — it logs *intent to contact*, not proof of delivery. This is documented as a known limitation in Risk Management, with the Business API (delivery receipts, server-side sending) as the stated upgrade path.
