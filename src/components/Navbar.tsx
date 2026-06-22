import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Store, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/utils/AuthContext';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">ZIA YAML Studio</span>
            <span className="ml-2 text-xs text-gray-400 hidden sm:inline">
              API Docs → OpenAPI Spec for ZIA Agents
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/marketplace"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">Marketplace</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 hidden sm:inline">
                {user.first_name} {user.last_name}
              </span>
              <button
                onClick={signOut}
                title="Sign out"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
