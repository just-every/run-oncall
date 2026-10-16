-- Retire local message storage without changing released migrations.
DROP TABLE IF EXISTS rer_mail_development_outbox;
