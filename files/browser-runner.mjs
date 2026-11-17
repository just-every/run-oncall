import {writeFileSync} from 'node:fs';
process.on('exit',code=>writeFileSync('/tmp/f263-browser-node-exit.json',JSON.stringify({head:'e70051e60c403f6bd99c992871751ee42d7963a0',exit:code})+'\n'));
await import('/workspace/oncall-f263/tests/agent-door-browser.mjs');
console.log('BROWSER_MODULE_COMPLETED exitCode='+String(process.exitCode??0));
