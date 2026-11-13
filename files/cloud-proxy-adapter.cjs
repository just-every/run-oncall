const {setGlobalDispatcher,EnvHttpProxyAgent}=require('/workspace/run-oncall/node_modules/.pnpm/undici@7.29.1/node_modules/undici');
setGlobalDispatcher(new EnvHttpProxyAgent());
