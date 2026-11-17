import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {agedActionSubmitRetention}=await import(pathToFileURL(resolve('tests/oncall-agent-action-submit-retention.mjs')));
await agedActionSubmitRetention();
