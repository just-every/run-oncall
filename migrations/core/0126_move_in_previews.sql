-- Door plans the owner's move-in screen made as previews. While unconfirmed, a
-- preview of another file in the same source replaces it, as previews always did;
-- Business proposals are never listed here. Plan ids only, no source content.
CREATE TABLE IF NOT EXISTS move_in_previews (plan_id TEXT PRIMARY KEY);
