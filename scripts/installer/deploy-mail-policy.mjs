import { main as deployKit } from '@runeditrun/rer/modules/deploy-kit/owner-cli';
import { refuse } from '@runeditrun/rer/errors';
import { validateMailConfiguration } from '../../src/mail-configuration.mjs';

// A real deploy needs a mail choice. A redeploy of an environment that already
// has one keeps the mail secrets bound on its Worker (rer keeps every secret it
// is not given), so the check also counts the names bound there. Values are
// never read. A fresh deploy has no recorded Worker and still has to choose.
export async function deployMailPolicy({ root, options, environment, env, bindings, declarationPath, localOnlyKeys }) {
 if (options.remove || options.unsetSecret) return;
 const values = { ...env, ...bindings };
 try { validateMailConfiguration(values, { required: !options.dryRun }); return; }
 catch (error) {
  if (options.dryRun) throw refuse(error.message);
  const bound = await boundSecretNames({ root, environment, env, declarationPath, localOnlyKeys });
  if (!bound) throw refuse(error.message);
  try { validateMailConfiguration(values, { required: true, bound }); }
  catch (inherited) { throw refuse(inherited.message); }
 }
}

async function boundSecretNames({ root, environment, env, declarationPath, localOnlyKeys }) {
 try {
  const { liveSecrets } = await deployKit(['inspect', '--declaration', declarationPath, '--environment', environment], env, { cwd: root, localOnlyKeys });
  return liveSecrets;
 } catch (error) {
  // No recorded deployment yet, or no Cloudflare credentials to read it with.
  if (['missing-owner-receipt', 'missing-input'].includes(error.message)) return undefined;
  throw refuse(`Could not read the mail secrets bound on the ${environment} environment's Worker (${error.message}). Check the Cloudflare credentials that deployed it and this checkout's .rer/deploy record, then run the same command again. Nothing was built or uploaded.`);
 }
}
