-- Held timers become historical records while paging is OFF.
-- Capacity refusal preserves the old store instead of dropping history.
SELECT CASE WHEN EXISTS(SELECT 1 FROM paging_jobs WHERE status='pending' AND json_array_length(data,'$.history')>=500) THEN json('Held timer history capacity exceeded; archive and review before upgrading') ELSE 1 END;
UPDATE paging_jobs SET revision=revision+1,status='paused',next_due=NULL,
 data=json_insert(json_set(data,'$.revision',revision+1,'$.status','paused','$.nextDue',NULL),'$.history[#]',json_object('type','paused','at',json_extract(data,'$.lastEvaluatedAt'),'actor',NULL,'reason','Activation upgrade; paging OFF','attempt',NULL))
 WHERE status='pending';
