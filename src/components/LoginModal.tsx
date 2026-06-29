import React, { useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { signInEmbedded } from '@/utils/catalyst-auth';

interface LoginModalProps {
  open: boolean;
  sdkAvailable: boolean;
  onClose: () => void;
}

const SIGNIN_CONTAINER_ID = 'catalyst-signin';

/**
 * Modal that hosts the embedded Catalyst (Zoho) sign-in widget.
 * Shown when a logged-out user tries to download the YAML.
 *
 * On successful sign-in the Catalyst widget reloads the page to the configured
 * redirect URL — Index.tsx restores the pending download from sessionStorage
 * after that reload.
 */
const LoginModal: React.FC<LoginModalProps> = ({ open, sdkAvailable, onClose }) => {
  useEffect(() => {
    if (!open || !sdkAvailable) return;
    // Mount the widget after the container div is in the DOM.
    const id = window.setTimeout(() => signInEmbedded(SIGNIN_CONTAINER_ID), 0);
    return () => window.clearTimeout(id);
  }, [open, sdkAvailable]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">Sign in to download</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Downloading the YAML requires a Zoho account. You can still copy the YAML without
          signing in.
        </p>

        {sdkAvailable ? (
          <div id={SIGNIN_CONTAINER_ID} className="min-h-[420px]" />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 text-sm text-amber-700">
            Sign-in is only available on the deployed site. In local development the download
            is unlocked automatically.
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
