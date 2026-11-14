import {createRequire} from 'node:module'
import {readFile,writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const root=process.cwd(),packet=resolve(process.env.HOME,'rer-consolidation/work/gr-mt-oncall-code-8/packet')
const require=createRequire(resolve(root,'package.json'))
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const source=await readFile('src/move-in/SavedExportHelp.tsx','utf8')
const formats=await readFile('src/move-in/vendor-formats.ts','utf8')
const ast=ts.createSourceFile('SavedExportHelp.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const findings=[]
function visit(node){
 if(ts.isPropertyAccessExpression(node)&&['innerHTML','outerHTML','insertAdjacentHTML','createContextualFragment','parseFromString','textContent','innerText','dangerouslySetInnerHTML'].includes(node.name.text))findings.push({name:node.name.text,line:ast.getLineAndCharacterOfPosition(node.pos).line+1})
 if(ts.isJsxAttribute(node)&&node.name.text==='dangerouslySetInnerHTML')findings.push({name:node.name.text,line:ast.getLineAndCharacterOfPosition(node.pos).line+1})
 ts.forEachChild(node,visit)
}
visit(ast);assert.deepEqual(findings,[])
function moduleURL(text,name){
 const output=ts.transpileModule(text,{fileName:name,compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText
 return 'data:text/javascript;base64,'+Buffer.from(output.replaceAll('"react/jsx-runtime"',JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href))).toString('base64')
}
const formatsURL=moduleURL(formats,'vendor-formats.ts')
const {SavedExportHelp}=await import(moduleURL(source.replace("'./vendor-formats'",JSON.stringify(formatsURL)),'SavedExportHelp.tsx'))
const {chromium}=require('@playwright/test')
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
const rows=[]
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 const page=await context.newPage()
 let outbound=0
 await page.route('**/*',route=>{outbound++;return route.abort()})
 for(const vendor of ['splunk','jsm','betterstack']){
  const html=renderToStaticMarkup(React.createElement(SavedExportHelp,{vendor}))
  await page.setContent(html)
  const help=page.locator('details.move-in-export-help')
  assert.equal(await help.count(),1)
  await help.locator('summary').click()
  const links=await help.locator('a').evaluateAll(nodes=>nodes.map(node=>({label:node.textContent,href:node.getAttribute('href')})))
  assert.ok(links.some(link=>link.href===`/docs/move-in#${vendor}-saved-responses`))
  assert.ok(links.some(link=>link.href.startsWith('https://')))
  const text=await help.innerText()
  assert.ok(text.includes('File input only.'))
  assert.ok(text.includes('Oncall makes no provider request.'))
  assert.ok(text.includes('512 KiB and 500 source objects.'))
  assert.equal(await help.locator('script,iframe,object,embed,[onerror],[onclick],[onload]').count(),0)
  rows.push({vendor,detailsExpand:true,sourceLinkCorrect:true,guidancePresent:true,activeHTMLNodes:0,links})
 }
 const rejected=['unknown','<img src=x onerror=alert(1)>','"><svg onload=alert(1)>']
 for(const vendor of rejected)assert.equal(renderToStaticMarkup(React.createElement(SavedExportHelp,{vendor})), '')
 assert.equal(outbound,0)
 await context.close()
 await writeFile(resolve(packet,'render-receipt.json'),JSON.stringify({kind:'Supplementary direct-component render probe; not a full application journey',width:1440,node:process.version,react:React.version,supportedVendors:rows,unknownAndMarkupVendorInputsRenderNothing:rejected.length,outboundRequests:outbound,pass:true},null,2)+'\n')
}finally{await browser.close()}
await writeFile(resolve(packet,'source-trace.json'),JSON.stringify({path:'src/move-in/SavedExportHelp.tsx',sha256:createHash('sha256').update(source).digest('hex'),domReadOrHTMLSinkFindings:findings,trace:[{path:'src/move-in/ConnectStep.tsx',line:20,operation:'file-source select passes event.target.value to fileVendor'},{path:'src/move-in/MoveIn.tsx',line:115,operation:'fileVendor is setVendor; selected value retained as vendor state'},{path:'src/move-in/ConnectStep.tsx',line:22,operation:'ExportHelp receives vendor as a prop'},{path:'src/move-in/ExportHelp.tsx',line:17,operation:'saved-response vendors render SavedExportHelp'},{path:'src/move-in/SavedExportHelp.tsx',line:9,operation:'vendor selects compile-time guide; unknown vendor returns null'},{path:'src/move-in/SavedExportHelp.tsx',line:19,operation:'vendor is concatenated into a relative fragment href attribute through React, never interpreted as HTML'}],pass:true},null,2)+'\n')
console.log('PASS: three saved-export guides expand with expected links and guidance; unknown and markup vendor inputs render nothing; no DOM-to-HTML sink; zero outbound requests.')
