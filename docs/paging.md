# Paging by text message

**Paging is OFF by default.** Out of the box Oncall texts nobody and your existing pager stays in charge. Text-message paging is an optional, small sender that works beside it. It needs two things, and does nothing until both are true:

1. The installation has a sender: Twilio credentials, declared at deploy time (below).
2. An administrator has switched paging on for a rota.

## What it does

For a rota with paging on, when a **high-urgency** alert arrives and the service's escalation policy puts a person on call:

- Oncall sends **one text** to the primary on call. Delivering the same alert again, a retried scheduled run or two overlapping runs never send a second one.
- If nobody acknowledges before the policy's **primary wait** ends, Oncall sends **one text** to the second person (the backup, or the primary again, as the policy says). Set the primary wait to `1200` seconds for 20 minutes.
- **Acknowledging** the incident or alert, resolving it, or the source recovering ends the run: the next text and any pending retry are not sent.
- A send that fails for a transient reason (Twilio unavailable or rate limiting) is tried again a minute and then two minutes later, three attempts in all. A permanent refusal (for example an invalid number) is not retried.
- Switching paging on does not text about an alert that was already open. Low-urgency alerts are never texted.

Every page leaves a log line on the alert's page under **Who this alert goes to**: the step, the person, the last four digits of the number, and **Sent**, **Will retry**, **Failed: twilio 400 code 21211** or **Not sent: no text-message number for this person**. A failed page is visible there; it is never silent. The provider's message text, the number and the credentials are not stored or logged.

## Who is texted

A person's own **text message** contact (Settings → Team → Contact methods), or their **phone** contact if they have no text-message one. The installation owner, if they have neither, is texted at `TWILIO_TO_NUMBER`. Anyone with no number is skipped and the log line says so.

## Turn it on

Declare the sender when you deploy, from your own environment or an owned `0600` env file. All values are optional secrets; none is ever written to the repository.

| Input | Meaning |
|---|---|
| `TWILIO_ACCOUNT_SID` | Your Twilio account SID. |
| `TWILIO_AUTH_TOKEN` | The account auth token. Or use an API key instead: |
| `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` | A Twilio API key and its secret (used instead of the auth token when both are set). |
| `TWILIO_FROM_NUMBER` | A Twilio number that can send texts, as `+15551234567`. |
| `TWILIO_TO_NUMBER` | The owner's own number, as `+15551234567`. |

```sh
"$HOME/.local/bin/rer" deploy --environment production --env-file "$HOME/.config/oncall/production.env" \
  --set-secret TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,TWILIO_FROM_NUMBER,TWILIO_TO_NUMBER
```

Then, as an administrator, open **On call**, choose the rota, expand **Paging is off** and tick the box. It cannot be ticked while the installation has no sender. Untick it to turn paging off again for that rota; this installation-local switch is not part of an export, so an imported archive starts with paging off.

You need your own Twilio account and a sending number. For US numbers Twilio requires carrier registration (A2P 10DLC) before texts are delivered reliably; that registration is yours to complete and Oncall cannot do it for you.

## First check: one test page

Before relying on it, expand **Paging is on** and choose **Send me a test page**. Oncall texts your own number once through the configured sender and logs the result. Do this once after every change to the Twilio inputs. Real paging is not proven until that text arrives on your phone and an unacknowledged test alert escalates; local tests use a fake Twilio and send nothing.

Keep your existing pager. This sender has no second provider, no voice call, no standby and no delivery guarantee: Twilio accepting a text is not the person reading it.
