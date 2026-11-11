# Duplicated SendGrid hint

Observed in the public setup and deploy --dry-run output on pinned @runeditrun/rer 0.2.108:

`SENDGRID_API_KEY (or SENDGRID_API_KEY)`

The seed's deploy.json declares one MAIL_API_KEY Worker secret, sourced from SENDGRID_API_KEY. MAIL_PROVIDER is sendgrid. This mapping is valid and is also documented for secret rotation; there are no duplicated key declarations to remove.

The installed package's cli/production-mail.mjs:119–122 builds a credential hint `MAIL_API_KEY (or SENDGRID_API_KEY)`. Its cli/deploy-needs.mjs:48 then rewrites binding names to environment names using the declaration, so MAIL_API_KEY becomes SENDGRID_API_KEY and the two alternatives become identical. This is a rer hint-formatting issue. No rer, deploy-kit or seed declaration was changed, per the brief's upstream-source exception.

The installed package's cli/deploy-command.mjs:91 emits the local-only completion message. cli/contract.mjs describes dry-run as making no Cloudflare requests, including when --env-file is supplied. It states that target secrets, permissions and remote readiness are checked only by a real deploy. The revised guides describe that behavior and do not invent a credentialed read-only preflight.
