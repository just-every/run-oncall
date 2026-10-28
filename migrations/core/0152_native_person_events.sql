-- Native person changes and their retained resource events commit together.

-- Agent calls emit through the shared runtime; these triggers cover native person UI.

CREATE TRIGGER oc_agent_event_oc_services_insert AFTER INSERT ON oc_services
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member')
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://services/'||NEW.id,json_object(
  'id','','type','services.created','uri','oncall://services/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_services_update AFTER UPDATE ON oc_services
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member') AND OLD.data<>NEW.data
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://services/'||NEW.id,json_object(
  'id','','type','services.updated','uri','oncall://services/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_incidents_insert AFTER INSERT ON oc_incidents
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member')
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://incidents/'||NEW.id,json_object(
  'id','','type','incidents.created','uri','oncall://incidents/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_incidents_update AFTER UPDATE ON oc_incidents
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member') AND OLD.data<>NEW.data
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://incidents/'||NEW.id,json_object(
  'id','','type','incidents.updated','uri','oncall://incidents/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_members_insert AFTER INSERT ON oc_members
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member')
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://members/'||NEW.id,json_object(
  'id','','type','members.created','uri','oncall://members/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_members_update AFTER UPDATE ON oc_members
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member') AND OLD.data<>NEW.data
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://members/'||NEW.id,json_object(
  'id','','type','members.updated','uri','oncall://members/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_teams_insert AFTER INSERT ON oc_teams
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member')
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://teams/'||NEW.id,json_object(
  'id','','type','teams.created','uri','oncall://teams/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_teams_update AFTER UPDATE ON oc_teams
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member') AND OLD.data<>NEW.data
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://teams/'||NEW.id,json_object(
  'id','','type','teams.updated','uri','oncall://teams/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_api_clients_insert AFTER INSERT ON oc_api_clients
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member')
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://automation/clients/'||NEW.id,json_object(
  'id','','type','clients.created','uri','oncall://automation/clients/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_api_clients_update AFTER UPDATE ON oc_api_clients
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member') AND OLD.data<>NEW.data
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://automation/clients/'||NEW.id,json_object(
  'id','','type','clients.updated','uri','oncall://automation/clients/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_api_endpoints_insert AFTER INSERT ON oc_api_endpoints
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member')
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://automation/endpoints/'||NEW.id,json_object(
  'id','','type','endpoints.created','uri','oncall://automation/endpoints/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_api_endpoints_update AFTER UPDATE ON oc_api_endpoints
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member') AND OLD.data<>NEW.data
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://automation/endpoints/'||NEW.id,json_object(
  'id','','type','endpoints.updated','uri','oncall://automation/endpoints/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_api_outbox_insert AFTER INSERT ON oc_api_outbox
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member')
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://automation/outbox/'||NEW.id,json_object(
  'id','','type','automation.created','uri','oncall://automation/outbox/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_oc_api_outbox_update AFTER UPDATE ON oc_api_outbox
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member') AND OLD.data<>NEW.data
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://automation/outbox/'||NEW.id,json_object(
  'id','','type','automation.updated','uri','oncall://automation/outbox/'||NEW.id,
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_paging_schedules_insert AFTER INSERT ON paging_schedules
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member')
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://schedules/'||NEW.id||'/coverage',json_object(
  'id','','type','schedule.created','uri','oncall://schedules/'||NEW.id||'/coverage',
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;

CREATE TRIGGER oc_agent_event_paging_schedules_update AFTER UPDATE ON paging_schedules
WHEN EXISTS(SELECT 1 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id WHERE c.id=1 AND i.kind='member') AND OLD.data<>NEW.data
BEGIN
 INSERT INTO agent_door_events(id,uri,event)
 SELECT lower(hex(randomblob(16))),'oncall://schedules/'||NEW.id||'/coverage',json_object(
  'id','','type','schedule.updated','uri','oncall://schedules/'||NEW.id||'/coverage',
  'actor',json_object('kind','person','person',json_object('id',i.entity_id,'name',json_extract(m.data,'$.name'))),
  'at',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'native_revision',json_extract(NEW.data,'$.revision'))
 FROM oc_audit_clock c JOIN oc_audit_identities i ON i.label=c.actor_label JOIN oc_members m ON m.id=i.entity_id
 WHERE c.id=1 AND i.kind='member';
 UPDATE agent_door_events SET event=json_set(event,'$.id',id) WHERE sequence=last_insert_rowid();
END;
