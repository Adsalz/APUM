// src/components/ui/AppHeader.js
import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { Calendar, Key, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ChangePasswordModal from '../ChangePasswordModal';
import logger from '../../utils/logger';

/**
 * Barre de navigation fixe partagée par tous les écrans
 * (remplace les 8 copies du bloc <nav> inline).
 *
 * @param {string}  backTo     Chemin du lien retour (optionnel)
 * @param {string}  backLabel  Libellé du lien retour
 * @param {React.ReactNode} actions  Actions supplémentaires côté droit
 */
function AppHeader({ backTo, backLabel = 'Retour', actions = null }) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { logout } = useAuth();
  const history = useHistory();

  const handleLogout = async () => {
    try {
      await logout();
      history.push('/');
    } catch (error) {
      logger.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xl font-bold text-primary-600">
              <Calendar size={24} aria-hidden="true" />
              Planning APUM
            </span>
            {backTo && (
              <Link
                to={backTo}
                className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {backLabel}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              <Key size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Mot de passe</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
            >
              <LogOut size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Déconnexion</span>
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
