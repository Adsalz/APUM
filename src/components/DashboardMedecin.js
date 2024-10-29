// src/components/DashboardMedecin.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { getDesiderataByUser } from '../services/planningService';
import { logoutUser } from '../services/authService';
import { Calendar, ClipboardList, LogOut, Key, Menu, X } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

function DashboardMedecin() {
  const [user, setUser] = useState(null);
  const [desiderata, setDesiderata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const history = useHistory();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userData = await getUser(authUser.uid);
          if (userData && userData.role === 'medecin') {
            setUser(userData);
            try {
              const userDesiderata = await getDesiderataByUser(userData.id);
              setDesiderata(userDesiderata);
            } catch (error) {
              console.error('Erreur lors de la récupération des desiderata:', error);
            }
          } else {
            setError('Utilisateur non autorisé');
            history.push('/');
          }
        } catch (error) {
          console.error('Erreur:', error);
          setError('Erreur lors de la récupération des données');
        }
      } else {
        history.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [history]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      history.push('/');
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      setError('Erreur lors de la déconnexion');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        Erreur: {error}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Menu fixe en haut */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 40
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Logo et titre */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#2563eb',
            fontWeight: 'bold',
            fontSize: '1.25rem'
          }}>
            <Calendar size={24} />
            <span>Planning APUM</span>
          </div>

          {/* Navigation principale - Desktop */}
          <div style={{
            display: 'none',
            gap: '1rem',
            '@media (min-width: 768px)': {
              display: 'flex'
            }
          }}>
            <button
              onClick={() => history.push('/formulaire-desirata')}
              style={{
                padding: '0.5rem 1rem',
                color: '#4b5563',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <ClipboardList size={18} />
              Saisir desiderata
            </button>
            <button
              onClick={() => history.push('/planning-visualisation')}
              style={{
                padding: '0.5rem 1rem',
                color: '#4b5563',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <Calendar size={18} />
              Voir planning
            </button>
            <button
              onClick={() => setShowChangePassword(true)}
              style={{
                padding: '0.5rem 1rem',
                color: '#4b5563',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <Key size={18} />
              Mot de passe
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                color: '#dc2626',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>

          {/* Bouton menu mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'flex',
              padding: '0.5rem',
              color: '#4b5563',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              '@media (min-width: 768px)': {
                display: 'none'
              }
            }}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menu mobile */}
        <div style={{
          display: isMenuOpen ? 'block' : 'none',
          backgroundColor: 'white',
          borderTop: '1px solid #e5e7eb',
          '@media (min-width: 768px)': {
            display: 'none'
          }
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0.5rem'
          }}>
            <button
              onClick={() => {
                history.push('/formulaire-desirata');
                setIsMenuOpen(false);
              }}
              style={{
                padding: '1rem',
                color: '#4b5563',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'flex-start'
              }}
            >
              <ClipboardList size={18} />
              Saisir desiderata
            </button>
            <button
              onClick={() => {
                history.push('/planning-visualisation');
                setIsMenuOpen(false);
              }}
              style={{
                padding: '1rem',
                color: '#4b5563',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'flex-start'
              }}
            >
              <Calendar size={18} />
              Voir planning
            </button>
            <button
              onClick={() => {
                setShowChangePassword(true);
                setIsMenuOpen(false);
              }}
              style={{
                padding: '1rem',
                color: '#4b5563',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'flex-start'
              }}
            >
              <Key size={18} />
              Mot de passe
            </button>
            <button
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }}
              style={{
                padding: '1rem',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'flex-start'
              }}
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '6rem 1rem 2rem',
      }}>
        {/* Carte de bienvenue */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            Bienvenue, Dr. {user?.nom}
          </h1>
          <p style={{ color: '#6b7280' }}>
            Gérez vos gardes et consultez le planning depuis votre tableau de bord
          </p>
        </div>

        {/* Carte des derniers desiderata */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            Derniers desiderata
          </h2>
          {desiderata.length > 0 ? (
            <ul style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {desiderata.map((d, index) => (
                <li key={index} style={{
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}>
                  Pour la période du {new Date(d.startDate).toLocaleDateString()} au {new Date(d.endDate).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#6b7280' }}>Aucun desiderata saisi</p>
          )}
        </div>
      </main>

      {/* Modal de changement de mot de passe */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}

export default DashboardMedecin;