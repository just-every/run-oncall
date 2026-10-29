CREATE TABLE oc_agent_deadlines (
  deadline TEXT PRIMARY KEY,
  principal TEXT NOT NULL CHECK(json_valid(principal))
);

-- Existing machine coordination remains bound to its creating native admin.
-- No credential, email inference or new native capability is introduced.
INSERT OR IGNORE INTO oc_agent_outbox(outbox,principal)
SELECT o.id,json_object('person',json_object('id',json_extract(c.data,'$.owner')),
 'agent',json_object('id','oncall-client:'||c.id,'name',json_extract(c.data,'$.name'),'specialist','oncall-responder'),
 'scopes',json(json_insert(json_extract(c.data,'$.permissions'),'$[#]','automation:write','$[#]','oncall-client-revision:'||json_extract(c.data,'$.revision'))),
 'clientId',c.id)
FROM oc_api_outbox o JOIN oc_incidents i ON i.id=json_extract(o.data,'$.incident')
JOIN json_each(i.data,'$.timeline') e ON json_extract(e.value,'$.id')=json_extract(o.data,'$.entry')
JOIN oc_api_clients c ON c.id=json_extract(e.value,'$.actor') AND c.id=json_extract(o.data,'$.client');

INSERT OR IGNORE INTO oc_agent_deadlines(deadline,principal)
SELECT json_extract(d.value,'$.id'),json_object('person',json_object('id',json_extract(c.data,'$.owner')),
 'agent',json_object('id','oncall-client:'||c.id,'name',json_extract(c.data,'$.name'),'specialist','oncall-responder'),
 'scopes',json(json_insert(json_extract(c.data,'$.permissions'),'$[#]','oncall-client-revision:'||json_extract(c.data,'$.revision'))),
 'clientId',c.id)
FROM oc_incidents i JOIN json_each(i.data,'$.deadlines') d
JOIN oc_api_clients c ON c.id=json_extract(d.value,'$.actor');

-- Give the already retained machine deadline entry its explicit native sponsor.
-- Historical credential revisions are not invented.
UPDATE oc_incidents SET data=json_set(data,'$.timeline',json((
 SELECT json_group_array(json(attributed)) FROM (
  SELECT CASE WHEN c.id IS NOT NULL AND json_extract(e.value,'$.kind')='incident-deadline'
    AND json_extract(e.value,'$.id') LIKE 'deadline:%' AND json_type(e.value,'$.metadata.agent') IS NULL
   THEN json_set(e.value,'$.metadata.agent',json_object(
    'agent',json_object('id','oncall-client:'||c.id,'name',json_extract(c.data,'$.name')),
    'for',json_object('id',m.id,'name',json_extract(m.data,'$.name')),
    'label',json_extract(c.data,'$.name')||' for '||json_extract(m.data,'$.name'),'sponsor',m.id,'client',c.id))
   ELSE e.value END AS attributed
  FROM json_each(oc_incidents.data,'$.timeline') e
  LEFT JOIN oc_api_clients c ON c.id=json_extract(e.value,'$.actor')
  LEFT JOIN oc_members m ON m.id=json_extract(c.data,'$.owner')
  ORDER BY CAST(e.key AS INTEGER)
 )
))) WHERE EXISTS(SELECT 1 FROM json_each(data,'$.deadlines') d JOIN oc_api_clients c ON c.id=json_extract(d.value,'$.actor'));
