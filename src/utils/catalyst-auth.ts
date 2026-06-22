// Catalyst Zoho OAuth — replaces firebase-config.ts

export interface CatalystUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email_id: string;
  org_id: string;
}

declare const catalyst: {
  auth: {
    signIn: (containerId: string, config: { platform_type: string; zaid: string }) => void;
    signOut: (redirectUrl: string) => void;
    isUserAuthenticated: () => Promise<CatalystUser>;
  };
};

type CatalystWindow = { catalyst?: typeof catalyst };

export const CATALYST_ZAID = import.meta.env.VITE_CATALYST_ZAID as string;

export function isUserAuthenticated(): Promise<CatalystUser> {
  const sdk = (window as unknown as CatalystWindow).catalyst;
  if (!sdk?.auth) return Promise.reject(new Error('Catalyst SDK not loaded'));
  return sdk.auth.isUserAuthenticated();
}

export function signInWithZoho(containerId: string) {
  const sdk = (window as unknown as CatalystWindow).catalyst;
  if (!sdk?.auth) return;
  sdk.auth.signIn(containerId, { platform_type: 'web', zaid: CATALYST_ZAID });
}

export function signOut() {
  const sdk = (window as unknown as CatalystWindow).catalyst;
  if (!sdk?.auth) return;
  sdk.auth.signOut(window.location.origin);
}
