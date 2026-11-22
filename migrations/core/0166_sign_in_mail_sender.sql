-- Earlier confirmations and links have no recorded sender configuration.
ALTER TABLE oa_tokens ADD COLUMN mail_sender_digest TEXT;
