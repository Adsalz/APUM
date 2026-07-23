// src/components/GestionPeriodeSaisie.js
import React, { useState, useEffect } from 'react';
import { setPeriodeSaisie, getPeriodeSaisie } from '../services/planningService';
import { Save, Mail } from 'lucide-react';
import { AppHeader, LoadingScreen, Button, Card, Alert, useToast } from './ui';
import CampagneMailModal from './CampagneMailModal';
import logger from '../utils/logger';

function GestionPeriodeSaisie() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Période réellement PERSISTÉE (dernières dates enregistrées). Sert de source
  // à la campagne : le modèle envoyé doit correspondre à la période en vigueur
  // pour les médecins, pas à des dates saisies mais non enregistrées.
  const [savedStartDate, setSavedStartDate] = useState('');
  const [savedEndDate, setSavedEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCampagne, setShowCampagne] = useState(false);
  const toast = useToast();

  // Auth/rôle garantis par ProtectedRoute : on charge uniquement la période
  useEffect(() => {
    const fetchPeriode = async () => {
      try {
        const periode = await getPeriodeSaisie();
        if (periode) {
          const s = periode.startDate.split('T')[0];
          const e = periode.endDate.split('T')[0];
          setStartDate(s);
          setEndDate(e);
          setSavedStartDate(s);
          setSavedEndDate(e);
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
      setSavedStartDate(startDate);
      setSavedEndDate(endDate);
      toast.success('Période de saisie mise à jour avec succès ! Les desiderata obsolètes ont été supprimés.');
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la période de saisie:', error);
      toast.error('Une erreur est survenue lors de la mise à jour de la période de saisie');
    } finally {
      setIsSaving(false);
    }
  };

  // Ouvre la campagne uniquement pour une période valide ET enregistrée : ainsi
  // le modèle Excel joint et les mois annoncés collent à la période en vigueur.
  const dirty = startDate !== savedStartDate || endDate !== savedEndDate;
  const openCampagne = () => {
    if (!startDate || !endDate) {
      toast.error('Définissez la période (début et fin) avant de lancer la campagne.');
      return;
    }
    if (startDate > endDate) {
      toast.error('La date de début doit être antérieure à la date de fin.');
      return;
    }
    if (dirty) {
      toast.error('Enregistrez d\'abord la période : la campagne joint le modèle de cette période.');
      return;
    }
    setShowCampagne(true);
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
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Mail size={16} />}
              onClick={openCampagne}
            >
              Campagne mail
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save size={16} />}
              loading={isSaving}
              onClick={handleSubmit}
            >
              Enregistrer
            </Button>
          </>
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
            Les desiderata en dehors de cette période seront automatiquement supprimés.
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
            <Alert kind="warning" className="mt-5">
              Attention : la modification de la période de saisie entraînera la suppression des
              desiderata obsolètes.
            </Alert>
          </form>

          <div className="mt-6 flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-500">
              Prévenez les médecins : envoyez la campagne mail avec le modèle de desiderata
              (Excel) de cette période en pièce jointe.
              {dirty && (
                <span className="mt-1 block font-semibold text-warning-700">
                  Enregistrez la période avant de lancer la campagne.
                </span>
              )}
            </p>
            <Button
              variant="secondary"
              icon={<Mail size={16} />}
              onClick={openCampagne}
            >
              Lancer la campagne mail
            </Button>
          </div>
        </Card>
      </main>

      <CampagneMailModal
        isOpen={showCampagne}
        onClose={() => setShowCampagne(false)}
        periode={{ startDate: savedStartDate, endDate: savedEndDate }}
      />
    </div>
  );
}

export default GestionPeriodeSaisie;
