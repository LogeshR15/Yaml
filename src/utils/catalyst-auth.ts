// Catalyst (Zoho) Web SDK auth wrapper.
//
// The SDK is injected as `window.catalyst` by Catalyst Slate on the deployed
// site. It is NOT present in local dev — callers should check `isSdkAvailable()`
// before relying on these functions.

export interface CatalystUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email_id: string;
  org_id: string;
}

interface CatalystAuth {
  signIn: (containerId: string, config: { platform_type: string; zaid: string }) => void;
  signOut: (redirectUrl: string) => void;
  isUserAuthenticated: () => Promise<CatalystUser>;
}

type CatalystWindow = { catalyst?: { auth?: CatalystAuth } };

/** Zoho Application ID — differs between Development and Production environments. */
export const CATALYST_ZAID = import.meta.env.VITE_CATALYST_ZAID as string;

function getAuth(): CatalystAuth | undefined {
  return (window as unknown as CatalystWindow).catalyst?.auth;
}

/** True once Slate has injected the Catalyst SDK (deployed site only). */
export function isSdkAvailable(): boolean {
  return !!getAuth();
}

/** Resolves with the current user, or rejects if not signed in / SDK absent. */
export function isUserAuthenticated(): Promise<CatalystUser> {
  const auth = getAuth();
  if (!auth) return Promise.reject(new Error('Catalyst SDK not loaded'));
  return auth.isUserAuthenticated();
}

/** Renders the embedded Zoho sign-in widget into the given container element id. */
export function signInEmbedded(containerId: string): void {
  const auth = getAuth();
  if (!auth) return;
  auth.signIn(containerId, { platform_type: 'web', zaid: CATALYST_ZAID });
}

/** Clears the session and reloads back to the app origin. */
export function signOut(): void {
  const auth = getAuth();
  if (!auth) return;
  auth.signOut(window.location.origin);
}
