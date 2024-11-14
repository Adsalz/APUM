import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { getDesiderataByUser } from '../services/planningService';
import { logoutUser } from '../services/authService';
import { 
  Key, 
  LogOut,
  ClipboardList, 
  Calendar,
  ChevronRight 
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

function DashboardMedecin() {
  const [user, setUser] = useState(null);
  const [desiderata, setDesiderata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
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

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
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

        {/* Actions principales */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            Actions principales
          </h2>
          <div style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
          }}>
            {/* Saisir desiderata */}
            <button
              onClick={() => history.push('/formulaire-desirata')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: '#F3E8FF',
                border: '1px solid #9333EA',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#EDE9FE';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#F3E8FF';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ color: '#9333EA' }}>
                  <ClipboardList size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1F2937' }}>Saisir desiderata</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Indiquez vos disponibilités</div>
                </div>
              </div>
              <ChevronRight size={20} color="#9333EA" />
            </button>

            {/* Voir planning */}
            <button
              onClick={() => history.push('/planning-visualisation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: '#ECFDF5',
                border: '1px solid #059669',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#D1FAE5';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ECFDF5';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ color: '#059669' }}>
                  <Calendar size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1F2937' }}>Voir planning</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Consultez le planning publié</div>
                </div>
              </div>
              <ChevronRight size={20} color="#059669" />
            </button>
          </div>
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