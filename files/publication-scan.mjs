import { committedSource } from '/home/agent/rer-consolidation/work/maint/gr-mt-oncall-dep-6/repo/node_modules/@runeditrun/rer/modules/release/source.mjs';
import { sourcePublicationScan } from '/home/agent/rer-consolidation/work/maint/gr-mt-oncall-dep-6/repo/node_modules/@runeditrun/rer/modules/release/publication-scan.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const source=committedSource(process.cwd(),'HEAD');
const temporary=mkdtempSync(join(tmpdir(),'oncall-publication-'));
try {
 const report=sourcePublicationScan(source,temporary,undefined,'just-every/run-oncall','https://github.com/just-every/run-oncall.git','https://github.com/just-every/run-oncall.git#main',false,undefined,300);
 console.log(JSON.stringify(report,null,2));
 process.exitCode=report.complete && report.status==='PASS' && report.findings.length===0?0:1;
} finally {rmSync(temporary,{recursive:true,force:true});}
