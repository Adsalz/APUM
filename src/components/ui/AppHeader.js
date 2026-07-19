// src/components/ui/AppHeader.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Key, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ChangePasswordModal from '../ChangePasswordModal';
import logger from '../../utils/logger';

/**
 * Barre de navigation fixe partagée par tous les écrans.
 *
 * @param {string}  backTo     Chemin du lien retour (optionnel)
 * @param {string}  backLabel  Libellé du lien retour
 * @param {React.ReactNode} actions  Actions supplémentaires côté droit
 */
function AppHeader({ backTo, backLabel = 'Retour', actions = null }) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-ink-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm">
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <span className="text-[1.05rem] font-extrabold tracking-tight text-ink-900">
                Planning <span className="text-primary-600">APUM</span>
              </span>
            </Link>
            {backTo && (
              <Link
                to={backTo}
                className="ml-1 hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 sm:flex"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {backLabel}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {actions}
            <span className="mx-1 hidden h-6 w-px bg-ink-200 sm:block" />
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
            >
              <Key size={17} aria-hidden="true" />
              <span className="hidden md:inline">Mon code</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-danger-50 hover:text-danger-600"
            >
              <LogOut size={17} aria-hidden="true" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
}

export default AppHeader;
