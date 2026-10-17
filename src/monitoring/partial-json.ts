const whitespace=(text:string,index:number)=>{while(index<text.length&&/\s/.test(text[index]))index++;return index;};
function stringEnd(text:string,start:number) {
  if(text[start]!=='"')return -1;
  for(let i=start+1;i<text.length;i++) {
    if(text[i]==='\\'){i++;continue;}
    if(text[i]==='"')return i+1;
  }
  return -1;
}
function valueEnd(text:string,start:number) {
  if(text[start]==='"')return stringEnd(text,start);
  if(text[start]==='{'||text[start]==='[') {
    const stack=[text[start]];
    for(let i=start+1;i<text.length;i++) {
      const c=text[i];
      if(c==='"'){const end=stringEnd(text,i);if(end<0)return -1;i=end-1;}
      else if(c==='{'||c==='[')stack.push(c);
      else if(c==='}'||c===']') {
        if(stack.pop()!==(c==='}'?'{':'['))return -1;
        if(!stack.length)return i+1;
      }
    }
    return -1;
  }
  let index=start;while(index<text.length&&!/[\s,}\]]/.test(text[index]))index++;
  return index===start||index===text.length?-1:index;
}
function partialAlerts(text:string,start:number) {
  const alerts:unknown[]=[];let index=whitespace(text,start+1),readTo=index;
  for(;;) {
    if(text[index]===']')return {alerts,end:index+1,readTo:index+1};
    const end=valueEnd(text,index);if(end<0)break;
    try{alerts.push(JSON.parse(text.slice(index,end)));}catch{break;}
    readTo=end;index=whitespace(text,end);
    if(text[index]===','){index=whitespace(text,index+1);continue;}
    if(text[index]===']')return {alerts,end:index+1,readTo:index+1};
    break;
  }
  return {alerts,end:-1,readTo};
}
/** Recover complete top-level fields and complete alert members, never guess JSON. */
export function readableJSON(text:string):{payload:unknown;complete:boolean;readTo:number;diagnostics:string[]} {
  try{return {payload:JSON.parse(text),complete:true,readTo:text.length,diagnostics:[]};}catch{}
  const payload:Record<string,unknown>={};let index=whitespace(text,0),readTo=0;
  if(text[index]!=='{')return {payload,complete:false,readTo,diagnostics:['Malformed or incomplete JSON; alert count unknown']};
  index=whitespace(text,index+1);
  for(;;) {
    const keyEnd=stringEnd(text,index);if(keyEnd<0)break;
    let key:string;try{key=JSON.parse(text.slice(index,keyEnd));}catch{break;}
    index=whitespace(text,keyEnd);if(text[index]!==':')break;index=whitespace(text,index+1);
    if(key==='alerts'&&text[index]==='[') {
      const partial=partialAlerts(text,index);payload.alerts=partial.alerts;readTo=partial.readTo;
      if(partial.end<0)break;index=partial.end;
    } else {
      const end=valueEnd(text,index);if(end<0)break;
      try{Object.defineProperty(payload,key,{value:JSON.parse(text.slice(index,end)),enumerable:true,writable:true,configurable:true});}catch{break;}
      index=end;readTo=end;
    }
    index=whitespace(text,index);if(text[index]!==',')break;index=whitespace(text,index+1);
  }
  return {payload,complete:false,readTo,diagnostics:['Malformed or incomplete JSON; only complete fields and alert members were read; omitted alert count unknown']};
}
