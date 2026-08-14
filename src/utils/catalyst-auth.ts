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
  /** Available in Catalyst Web SDK — returns the current Zoho OAuth access token. */
  getAccessToken?: () => Promise<string>;
}

type CatalystWindow = { catalyst?: { auth?: CatalystAuth } };

/** Zoho Application ID — differs between Development and Production environments. */
export const CATALYST_ZAID = import.meta.env.VITE_CATALYST_ZAID as string;

function getAuth(): CatalystAuth | undefined {
  return (window as unknown as CatalystWindow).catalyst?.auth;
}

/** True once Slate has injected window.catalyst (the .auth sub-module may still be loading). */
export function isCatalystPresent(): boolean {
  return !!(window as unknown as CatalystWindow).catalyst;
}

/** True once the auth module is ready and callable. */
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

/**
 * Returns the current Zoho OAuth access token via the Catalyst SDK.
 * Rejects if the SDK is unavailable or the user is not signed in.
 */
export function getAccessToken(): Promise<string> {
  const auth = getAuth();
  if (!auth) return Promise.reject(new Error('Catalyst SDK not loaded'));
  if (!auth.getAccessToken) return Promise.reject(new Error('getAccessToken not available in this SDK version'));
  return auth.getAccessToken();
}

/** Clears the session and reloads back to the app origin. */
export function signOut(): void {
  const auth = getAuth();
  if (!auth) return;
  auth.signOut(window.location.origin);
}
