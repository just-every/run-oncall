import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {parse}=await import(pathToFileURL(resolve('scripts/edition-authoring/vendor/babel-parser/babel-parser/index.mjs')));
registerHooks({load(url,context,next){
 const result=next(url,context);
 if(!url.endsWith('/tests/triage.mjs'))return result;
 const source=process.env.PROBE_BEFORE==='1'?readFileSync(resolve('../packet/original/tests/triage.mjs'),'utf8'):String(result.source);
 const ast=parse(source,{sourceType:'module'}),parts=[];
 for(const statement of ast.program.body){
  if(statement.type==='ImportDeclaration')continue;
  const inner=statement.type==='ExportNamedDeclaration'?statement.declaration:statement;
  if(inner?.type==='FunctionDeclaration'){
   const group=inner.id.name==='triageBulkCompletion'?'bulk':'bounds';
   parts.push(`async function ${inner.id.name}(){console.log('GROUP ${group}');}`);continue;
  }
  if(statement.type==='IfStatement'&&statement.test.type==='CallExpression'&&statement.test.callee.name==='selected'&&statement.consequent.type==='BlockStatement'){
   parts.push(source.slice(statement.start,statement.consequent.start)+`{console.log('GROUP ${statement.test.arguments[0].value}');}`);continue;
  }
  if(statement.type==='VariableDeclaration'&&statement.declarations[0].id.name==='w'){
   parts.push("console.log('GROUP storm');");continue;
  }
  if(statement.type==='BlockStatement'){
   if(source.slice(0,statement.start).trimEnd().endsWith('// Coordinated incidents feed fair response reports, matching CSV and erasure-safe denominators.'))parts.push("console.log('GROUP reports');");
   continue;
  }
  if(statement.type==='TryStatement')continue;
  if(statement.type==='VariableDeclaration'&&!['triagePart','selected'].includes(statement.declarations[0].id.name))continue;
  parts.push(source.slice(statement.start,statement.end));
 }
 return {...result,source:parts.join('\n')};
}});
