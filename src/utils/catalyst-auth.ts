// Catalyst Zoho OAuth — replaces firebase-config.ts

export interface CatalystUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email_id: string;
  org_id: string;
}

// catalyst global is injected by zcatalyst-sdk-js (npm) or CDN script
declare const catalyst: {
  auth: {
    signIn: (containerId: string, config: { platform_type: string; zaid: string }) => void;
    signOut: (redirectUrl: string) => void;
    isUserAuthenticated: () => Promise<CatalystUser>;
  };
};

export const CATALYST_ZAID = import.meta.env.VITE_CATALYST_ZAID as string;

export function signInWithZoho(containerId: string) {
  catalyst.auth.signIn(containerId, {
    platform_type: 'web',
    zaid: CATALYST_ZAID,
  });
}

export function signOut() {
  catalyst.auth.signOut(window.location.origin);
}

export function isUserAuthenticated(): Promise<CatalystUser> {
  return catalyst.auth.isUserAuthenticated();
}
