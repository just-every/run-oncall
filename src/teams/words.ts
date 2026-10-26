// The Teams doors' refusals, shared by the server that sends them and the panel that reads them.
export const staleTeam='This team changed. Retry to keep your change with its latest version.';
export const staleOwnership='Service ownership changed. Retry to keep your choice with its latest version.';
export const teamNameRule='Enter a team name with up to 200 characters.';
export const serviceGone='This service is not available. Choose a current service.';
export const managesButNotMember=(name:string)=>name+' manages but is not a member';
export const cannotManage=(name:string)=>name+' cannot manage this team. Choose a responder or administrator.';
export const noLongerActive=(name:string)=>name+' is no longer an active member. Choose an active member.';
export const notCatalog="Paste the JSON that Backstage's catalog entities API returns.";
export const tooManyComponents='Import up to 1,000 catalog entities at a time.';
export const importChanged='Services or teams changed since this preview. Preview again to see the current changes.';
export const cannotBelong=(service:string,team:string)=>service+' cannot belong to '+team+' because the team is archived or unavailable. Restore the team or choose another.';
