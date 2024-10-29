// src/components/GestionPeriodeSaisie.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { setPeriodeSaisie, getPeriodeSaisie } from '../services/planningService';
import { ArrowLeft, Calendar, Save, AlertTriangle, Check } from 'lucide-react';

function GestionPeriodeSaisie() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const history = useHistory();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userData = await getUser(authUser.uid);
          if (userData.role !== 'admin') {
            setError("Accès non autorisé");
            history.push('/');
          } else {
            setCurrentUser(userData);
            const periode = await getPeriodeSaisie();
            if (periode) {
              setStartDate(periode.startDate.split('T')[0]);
              setEndDate(periode.endDate.split('T')[0]);
            }
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données utilisateur:", error);
          setError("Erreur lors de la récupération des données utilisateur");
        }
      } else {
        history.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [history]);

  const showNotification = (message, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await setPeriodeSaisie(startDate, endDate);
      showNotification('Période de saisie mise à jour avec succès! Les desiderata obsolètes ont été supprimés.');
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la période de saisie:", error);
      showNotification("Une erreur est survenue lors de la mise à jour de la période de saisie", true);
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

  if (error && !currentUser) {
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
          <button
            onClick={() => history.push('/dashboard-admin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563EB',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>
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
            gap: '1rem'
          }}>
            <button
              onClick={() => history.push('/dashboard-admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#4B5563',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              <ArrowLeft size={20} />
              Retour
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#2563EB',
              fontWeight: 'bold'
            }}>
              <Calendar size={24} />
              <span>Période de saisie</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563EB',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            <Save size={18} />
            Enregistrer
          </button>
        </div>
      </nav>

      {/* Notifications */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          padding: '1rem',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 50,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: '#DCFCE7',
          color: '#16A34A',
          padding: '1rem',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 50,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Check size={20} />
          {success}
        </div>
      )}

      {/* Contenu principal */}
      <main style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '6rem 1rem 2rem'
      }}>
        {/* Carte explicative */}
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
            Définir la période de saisie
          </h1>
          <p style={{ color: '#6b7280' }}>
            Configurez la période pendant laquelle les médecins pourront saisir leurs desiderata. 
            Les desiderata en dehors de cette période seront automatiquement supprimés.
          </p>
        </div>

        {/* Formulaire de sélection des dates */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gap: '1.5rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Date de début
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Date de fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            {/* Message d'information */}
            <div style={{
              backgroundColor: '#FFF7ED',
              border: '1px solid #FB923C',
              borderRadius: '0.375rem',
              padding: '1rem',
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <AlertTriangle size={20} color="#FB923C" />
              <p style={{
                fontSize: '0.875rem',
                color: '#9A3412',
                margin: 0
              }}>
                Attention : La modification de la période de saisie entrainera la suppression des desiderata obsolètes.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default GestionPeriodeSaisie;