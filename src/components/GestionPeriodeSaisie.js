// src/components/GestionPeriodeSaisie.js
import React, { useState, useEffect } from 'react';
import {
  setPeriodeSaisie,
  getPeriodeSaisie,
  setSaisieFermee as saveSaisieFermee,
} from '../services/planningService';
import { Save, Lock, Unlock } from 'lucide-react';
import { AppHeader, LoadingScreen, Button, Card, Alert, useToast } from './ui';
import logger from '../utils/logger';

const formatDateHeure = (iso) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

function GestionPeriodeSaisie() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Clôture de la saisie (null = inconnue, tant qu'aucune période n'est lue)
  const [saisieFermee, setSaisieFermee] = useState(null);
  const [fermeeLe, setFermeeLe] = useState(null);
  const [clotureBusy, setClotureBusy] = useState(false);
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
          setSaisieFermee(periode.saisieFermee);
          setFermeeLe(periode.saisieFermeeLe);
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

  // Clôt ou rouvre la saisie : effet immédiat, indépendant des dates (les
  // changer ne rouvre pas une saisie close).
  const toggleCloture = async () => {
    if (saisieFermee === null) { return; }
    const next = !saisieFermee;
    setClotureBusy(true);
    try {
      await saveSaisieFermee(next);
      setSaisieFermee(next);
      setFermeeLe(next ? new Date().toISOString() : null);
      toast.success(next
        ? 'Saisie close : les médecins ne peuvent plus modifier leurs desiderata.'
        : 'Saisie rouverte : les médecins peuvent de nouveau modifier leurs desiderata.');
    } catch (error) {
      logger.error('Erreur lors de la clôture/réouverture de la saisie:', error);
      toast.error(next ? 'La saisie n\'a pas pu être close.' : 'La saisie n\'a pas pu être rouverte.');
    } finally {
      setClotureBusy(false);
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
            Période de saisie
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Dates du trimestre sur lequel les médecins saisissent leurs desiderata, et
            clôture de cette saisie. Les desiderata des périodes précédentes sont
            conservés : ils restent consultables en revenant sur leurs dates.
          </p>
        </div>

        {/* Clôture de la saisie (demande de l'APUM, 04/10/2026 : une fiche
            modifiée après que les tableaux de garde étaient faits). */}
        <Card
          className={`mb-6 flex flex-wrap items-center justify-between gap-3 p-4 ${
            saisieFermee ? 'border-warning-300 bg-warning-50' : ''
          }`}
        >
          <div className="flex items-start gap-2.5">
            {saisieFermee ? (
              <Lock size={20} className="mt-0.5 flex-shrink-0 text-warning-600" aria-hidden="true" />
            ) : (
              <Unlock size={20} className="mt-0.5 flex-shrink-0 text-success-600" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold text-ink-900">
                Saisie des desiderata&nbsp;
                {saisieFermee === null ? '…' : saisieFermee ? 'close' : 'ouverte'}
              </p>
              <p className="mt-0.5 max-w-xl text-xs text-ink-500">
                {saisieFermee
                  ? `${fermeeLe ? `Close le ${formatDateHeure(fermeeLe)}. ` : ''}Les médecins voient leur fiche sans pouvoir la modifier ; vous pouvez toujours la corriger depuis « Remplir desiderata ». Changer les dates ne rouvre pas la saisie.`
                  : 'Les médecins peuvent saisir et modifier leurs desiderata. Pensez à la clore avant de faire les tableaux : plus aucune fiche ne pourra alors changer sans vous.'}
              </p>
            </div>
          </div>
          <Button
            variant={saisieFermee ? 'secondary' : 'primary'}
            size="sm"
            icon={saisieFermee ? <Unlock size={16} /> : <Lock size={16} />}
            loading={clotureBusy}
            disabled={saisieFermee === null}
            onClick={toggleCloture}
          >
            {saisieFermee ? 'Rouvrir la saisie' : 'Clore la saisie'}
          </Button>
        </Card>

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
