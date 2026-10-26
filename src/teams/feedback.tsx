import {useEffect,useRef} from 'react';

export type Note={saving?:boolean;saved?:boolean;error?:string;retry?:()=>void;discard?:()=>void};
// One plain line under the control it belongs to, with only the action that can work.
export function Feedback({note}: {note?:Note}){
 const ref=useRef<HTMLDivElement>(null);
 // A new line comes into view, but never by moving another field the person is typing in.
 useEffect(()=>{const line=ref.current,focus=document.activeElement;if(!note?.error||!line)return;const typing=focus instanceof HTMLTextAreaElement||focus instanceof HTMLInputElement&&!['checkbox','radio','file'].includes(focus.type);if(typing&&!line.parentElement?.contains(focus))return;const r=line.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)line.scrollIntoView({block:'nearest'});},[note?.error]);
 return note?.error?<div ref={ref} className="teams-failure" role="alert">{note.error} {note.retry&&<button type="button" onClick={note.retry}>Retry</button>}{note.discard&&<button type="button" onClick={note.discard}>Discard</button>}</div>:null;
}
export function Mark({note}:{note?:Note}){return <span className="teams-status" role="status">{note?.saving?'Saving…':note?.saved?'Saved':''}</span>;}
