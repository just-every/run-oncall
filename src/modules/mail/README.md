# Mail runtime

Oncall carries Base's portable mail sender, provider adapters, event intake, inbound parsing, unsubscribe headers and setup diagnostics. This edition sends through an explicitly configured remote provider.

## Sending

```js
import { createMailSender } from './index.mjs';

const sender = createMailSender({
  provider: 'sendgrid',
  mode: 'production',
  apiKey: settings.MAIL_API_KEY,
});
await sender.send({
  deliveryId: crypto.randomUUID(),
  from: settings.MAIL_FROM,
  to: 'person@example.com',
  subject: 'Your sign-in link',
  text: messageText,
});
```

Providers are `sendgrid`, `resend`, `cloudflare`, and the optional signed `messaging` service adapter. Cloudflare requires an `accountId`; Messaging requires its own signed service configuration. Oncall does not configure Messaging automatically. Remote providers make real network requests in every mode, including `development` and `test`. Missing credentials and provider failures never select a substitute transport.

`createMailSender(config, dependencies?)` accepts a standard `fetch`, a clock and a bounded remote timeout. Configuration and messages reject unknown fields. Messages support text and HTML bodies, recipients, attachments, unsubscribe settings, and provider-specific options where supported. The sender snapshots each message before sending.

Results contain `provider`, `status`, `providerMessageId` and optional structured rejection information. Status is `accepted`, `rejected`, `rate_limited` or `uncertain`. Provider acceptance is not proof of inbox delivery. Errors and results redact credentials and provider response bodies. No automatic retry or replay occurs. See each [adapter's source](src/adapters/) for its precise provider contract.

## Other exports

- `verifyWebhook`, `createDeliveryEventIntake` and `createD1EventStore` verify and durably ingest delivery events. See [events](src/events/README.md).
- `normalizeInbound` and `createResendAttachmentFetcher` handle inbound provider messages. See [inbound](src/inbound/README.md).
- `applyUnsubscribeHeaders` adds explicitly requested unsubscribe headers.
- `mailDoctor` reports DNS and provider setup. It performs network operations only with `live: true` and explicitly configured test recipients. See [doctor](src/doctor/README.md).

## Running Oncall locally

Use `rer dev` and open its private `RER_OPEN` link to enter as the local owner. The app does not retain messages or expose a mail viewer. Ordinary email sign-in requires a configured remote sender and delivers to the recipient's mailbox. The root [installation guide](../../../docs/install.md) describes the local setup and owner confirmation.

Module test paths from upstream are not shipped in this edition. Run this checkout's root test commands.
