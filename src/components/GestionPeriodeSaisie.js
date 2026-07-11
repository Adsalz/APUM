// src/components/GestionPeriodeSaisie.js
import React, { useState, useEffect } from 'react';
import { setPeriodeSaisie, getPeriodeSaisie } from '../services/planningService';
import { Save, AlertTriangle, Check } from 'lucide-react';
import { AppHeader, LoadingScreen, Button } from './ui';
import logger from '../utils/logger';

function GestionPeriodeSaisie() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Auth/rôle garantis par ProtectedRoute : on charge uniquement la période
  useEffect(() => {
    const fetchPeriode = async () => {
      try {
        const periode = await getPeriodeSaisie();
        if (periode) {
          setStartDate(periode.startDate.split('T')[0]);
          setEndDate(periode.endDate.split('T')[0]);
        }
      } catch (error) {
        logger.error('Erreur lors du chargement de la période de saisie:', error);
        setError('Erreur lors du chargement de la période de saisie');
        setTimeout(() => setError(null), 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchPeriode();
  }, []);

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
    if (isSaving) {return;} // anti double-submit
    setIsSaving(true);
    try {
      await setPeriodeSaisie(startDate, endDate);
      showNotification('Période de saisie mise à jour avec succès! Les desiderata obsolètes ont été supprimés.');
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la période de saisie:', error);
      showNotification('Une erreur est survenue lors de la mise à jour de la période de saisie', true);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      {/* Menu fixe en haut */}
      <AppHeader
        backTo="/dashboard-admin"
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Save size={16} />}
            loading={isSaving}
            onClick={handleSubmit}
          >
            Enregistrer
          </Button>
        }
      />

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