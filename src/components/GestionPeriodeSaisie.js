// src/components/GestionPeriodeSaisie.js
import React, { useState, useEffect } from 'react';
import { setPeriodeSaisie, getPeriodeSaisie } from '../services/planningService';
import { Save } from 'lucide-react';
import { AppHeader, LoadingScreen, Button, Card, Alert, useToast } from './ui';
import logger from '../utils/logger';

function GestionPeriodeSaisie() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

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
        toast.error('Erreur lors du chargement de la période de saisie');
      } finally {
        setLoading(false);
      }
    };

    fetchPeriode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) {return;} // anti double-submit
    setIsSaving(true);
    try {
      await setPeriodeSaisie(startDate, endDate);
      toast.success('Période de saisie mise à jour avec succès !');
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la période de saisie:', error);
      toast.error('Une erreur est survenue lors de la mise à jour de la période de saisie');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-ink-100">
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

      {/* Contenu principal */}
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 sm:px-6 animate-fade-up">
        {/* En-tête de la page */}
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Définir la période de saisie
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Configurez la période pendant laquelle les médecins pourront saisir leurs desiderata.
            Les desiderata des périodes précédentes sont conservés : ils restent consultables
            en revenant sur leurs dates.
          </p>
        </div>

        {/* Formulaire de sélection des dates */}
        <Card>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-1.5 block text-sm font-semibold text-ink-700"
                >
                  Date de début
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-1.5 block text-sm font-semibold text-ink-700"
                >
                  Date de fin
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                />
              </div>
            </div>

            {/* Message d'information persistant */}
            <Alert kind="info" className="mt-5">
              Les médecins verront le formulaire de cette période dès validation. Aucun desiderata
              n'est supprimé : ceux des autres périodes restent en base.
            </Alert>
          </form>
        </Card>
      </main>
    </div>
  );
}

export default GestionPeriodeSaisie;
