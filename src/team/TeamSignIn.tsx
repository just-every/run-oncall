import {useState} from 'react';

/** The address and steps an admin hands to a teammate: Oncall sends no invitations. */
export function signInAddress() {
  return (typeof location === 'undefined' ? '' : location.origin) + '/signin/local';
}

export function TeamSignIn({name}: {name?: string}) {
  const [copied, setCopied] = useState('');
  const address = signInAddress();
  const local = /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::|\/|$)/.test(address);
  const who = name || 'Your teammate';
  const message = `${who}, sign in to Oncall:\n1. Open ${address}\n2. Enter your name exactly as shown (${name || 'your name'}) and the password ${name ? 'I gave you' : 'you were given'}.\n3. Press Sign in.`;
  async function copy() {
    try {await navigator.clipboard.writeText(message); setCopied('Sign-in steps copied');}
    catch {setCopied('Select the steps above and copy them');}
  }
  return <section className="team-signin" aria-label="How teammates sign in">
    <h3>{name ? `Give ${name} these sign-in steps` : 'How teammates sign in'}</h3>
    <ol>
      <li>Open <a href={address}>{address}</a>.</li>
      <li>Enter the member’s name{name ? <> (<strong>{name}</strong>)</> : ''} and the password you set.</li>
      <li>Press <strong>Sign in</strong>. They land in Oncall with their role.</li>
    </ol>
    {local && <p>This address works on this computer only. To give your team a shared address, <a href="/docs/getting-started#host-for-your-team">host Oncall for your team</a>.</p>}
    <button type="button" onClick={copy}>Copy sign-in steps</button>
    {copied && <span role="status"> {copied}</span>}
  </section>;
}
