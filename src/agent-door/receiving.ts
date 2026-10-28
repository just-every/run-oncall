/** Restore keeps history, and retires every pending execution authority atomically. */
export function holdAgentReceiving(db:D1Database,token:string):D1PreparedStatement[] {
 const gate='EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)'
 return [
  db.prepare('DELETE FROM oc_agent_outbox WHERE '+gate).bind(token),
  db.prepare('DELETE FROM oc_agent_deadlines WHERE '+gate).bind(token),
  db.prepare('DELETE FROM oc_agent_transport WHERE '+gate).bind(token),
  db.prepare('UPDATE agent_door_state SET local_paused=1 WHERE '+gate).bind(token),
  db.prepare("UPDATE agent_door_approvals SET state='expired' WHERE state='pending' AND "+gate).bind(token),
  db.prepare('UPDATE agent_door_agents SET revoked=1 WHERE id NOT IN (SELECT id FROM oc_api_clients) AND '+gate).bind(token),
  db.prepare('DELETE FROM bs_team WHERE '+gate).bind(token),
  db.prepare('UPDATE bs_settings SET document=NULL,owner_id=NULL WHERE '+gate).bind(token),
 ]
}
