// src/components/DashboardAdmin.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser, getMedecins } from '../services/userService';
import { logoutUser } from '../services/authService';
import { getPeriodeSaisie, getPublishedPlanning } from '../services/planningService';
import { 
  Users, 
  Calendar, 
  Clock, 
  LogOut, 
  Key,
  ClipboardList,
  Settings,
  ChevronRight,
  CheckSquare
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

function DashboardAdmin() {
  const [user, setUser] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const history = useHistory();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authUser = auth.currentUser;
        if (!authUser) {
          history.push('/');
          return;
        }

        const userData = await getUser(authUser.uid);
        if (!userData || userData.role !== 'admin') {
          setError('Utilisateur non autorisé');
          history.push('/');
          return;
        }

        setUser(userData);

        // Récupération des données pour les statistiques
        const medecinsList = await getMedecins();
        setMedecins(medecinsList);

        const periode = await getPeriodeSaisie();
        setPeriodeSaisie(periode);

        const publishedPlan = await getPublishedPlanning();
        setPlanning(publishedPlan);

      } catch (error) {
        console.error('Erreur:', error);
        setError('Erreur lors de la récupération des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#DC2626', marginBottom: '1rem' }}>Erreur</h2>
          <p style={{ color: '#4B5563', marginBottom: '1.5rem' }}>{error}</p>
        </div>
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
            color: '#2563EB',
            fontWeight: 'bold',
            fontSize: '1.25rem'
          }}>
            <Settings size={24} />
            <span>Administration APUM</span>
          </div>

          {/* Actions utilisateur */}
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
            Bienvenue, {user?.prenom} {user?.nom}
          </h1>
          <p style={{ color: '#6b7280' }}>
            Gérez les utilisateurs, le planning et les périodes de saisie depuis votre tableau de bord
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
            {/* Gestion des utilisateurs */}
            <button
              onClick={() => history.push('/gestion-utilisateurs')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: '#EBF5FF',
                border: '1px solid #2563EB',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#DBEAFE';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#EBF5FF';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ color: '#2563EB' }}>
                  <Users size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1F2937' }}>Gérer les utilisateurs</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Ajouter ou modifier des utilisateurs</div>
                </div>
              </div>
              <ChevronRight size={20} color="#2563EB" />
            </button>

            {/* Gestion du planning */}
            <button
              onClick={() => history.push('/gestion-planning-admin')}
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
                  <Calendar size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1F2937' }}>Gérer le planning</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Générer et modifier le planning</div>
                </div>
              </div>
              <ChevronRight size={20} color="#9333EA" />
            </button>

            {/* Gestion de la période de saisie */}
            <button
              onClick={() => history.push('/gestion-periode-saisie')}
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
                  <ClipboardList size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1F2937' }}>Période de saisie</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Définir la période de saisie des desiderata</div>
                </div>
              </div>
              <ChevronRight size={20} color="#059669" />
            </button>

            {/* État des desiderata */}
            <button
              onClick={() => history.push('/gestion-desiderata')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: '#FEF3C7',
                border: '1px solid #D97706',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#FDE68A';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#FEF3C7';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ color: '#D97706' }}>
                  <CheckSquare size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1F2937' }}>État des desiderata</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Suivre la saisie des desiderata</div>
                </div>
              </div>
              <ChevronRight size={20} color="#D97706" />
            </button>
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem'
        }}>
          {/* Nombre de médecins */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                backgroundColor: '#EBF5FF',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                color: '#2563EB'
              }}>
                <Users size={24} />
              </div>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Médecins
              </h2>
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#2563EB'
            }}>
              {medecins.length}
            </p>
          </div>

          {/* Période de saisie */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                backgroundColor: '#F0FDF4',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                color: '#16A34A'
              }}>
                <Clock size={24} />
              </div>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Période de saisie
              </h2>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: periodeSaisie ? '#16A34A' : '#DC2626',
              fontWeight: '500'
            }}>
              {periodeSaisie ? (
                `Du ${new Date(periodeSaisie.startDate).toLocaleDateString()} au ${new Date(periodeSaisie.endDate).toLocaleDateString()}`
              ) : (
                'Aucune période définie'
              )}
            </p>
          </div>

          {/* État du planning */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
         }}>
           <div style={{
             display: 'flex',
             alignItems: 'center',
             gap: '0.75rem',
             marginBottom: '1rem'
           }}>
             <div style={{
               backgroundColor: '#FFF7ED',
               borderRadius: '0.5rem',
               padding: '0.75rem',
               color: '#EA580C'
             }}>
               <Calendar size={24} />
             </div>
             <h2 style={{
               fontSize: '1.125rem',
               fontWeight: '600',
               color: '#1f2937'
             }}>
               Planning
             </h2>
           </div>
           <p style={{
             fontSize: '0.875rem',
             color: planning ? '#16A34A' : '#DC2626',
             fontWeight: '500'
           }}>
             {planning ? 'Planning publié' : 'Aucun planning publié'}
           </p>
         </div>
       </div>
     </main>

     {/* Modal de changement de mot de passe */}
     {showChangePassword && (
       <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
     )}
   </div>
 );
}

export default DashboardAdmin;
