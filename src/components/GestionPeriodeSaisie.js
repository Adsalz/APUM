// src/components/GestionPeriodeSaisie.js
import React, { useState, useEffect } from 'react';
import { setPeriodeSaisie, getPeriodeSaisie } from '../services/planningService';
import { lancerNouveauTour } from '../services/nouveauTourService';
import { Save } from 'lucide-react';
import { AppHeader, LoadingScreen, Button, Card, Alert, Checkbox, Modal, useToast } from './ui';
import logger from '../utils/logger';

const formatJour = (jour) => {
  if (!jour) { return '—'; }
  const d = new Date(jour);
  return Number.isNaN(d.getTime())
    ? jour
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

function GestionPeriodeSaisie() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Remise à zéro des codes : décochée par défaut, pour qu'une simple
  // rectification de dates ne fasse pas redéfinir son code à tout le monde.
  const [remettreCodes, setRemettreCodes] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  // Enregistre la période, puis — si demandé — efface les codes et ouvre les
  // inscriptions (Cloud Function : le navigateur n'a pas les droits pour ça).
  const enregistrer = async (avecRemiseAZero) => {
    setShowConfirm(false);
    setIsSaving(true);
    let periodeEnregistree = false;
    try {
      await setPeriodeSaisie(startDate, endDate);
      periodeEnregistree = true;

      if (!avecRemiseAZero) {
        toast.success('Période de saisie mise à jour avec succès !');
        return;
      }

      const { ok, total, echecs = [] } = await lancerNouveauTour();
      setRemettreCodes(false);

      if (echecs.length) {
        // Les médecins en échec gardent leur ancien code : ils se connectent
        // toujours, mais ne seront pas invités à en choisir un nouveau.
        logger.error('Codes non remis à zéro:', echecs);
        toast.error(
          `${ok}/${total} codes remis à zéro. ${echecs.length} échec(s) : ` +
          echecs.map((e) => e.email).join(', ')
        );
        return;
      }
      toast.success(
        `Nouveau tour lancé : ${ok} code(s) remis à zéro, inscriptions ouvertes.`
      );
    } catch (error) {
      logger.error('Erreur lors du lancement du nouveau tour:', error);
      toast.error(
        periodeEnregistree
          ? 'Période enregistrée, mais la remise à zéro des codes a échoué : les codes actuels restent valables.'
          : 'Une erreur est survenue lors de la mise à jour de la période de saisie'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSaving) {return;} // anti double-submit
    // La remise à zéro est irréversible : jamais sans confirmation explicite.
    if (remettreCodes) {
      setShowConfirm(true);
      return;
    }
    enregistrer(false);
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

            {/* Nouveau tour de choix : remise à zéro des codes + inscriptions */}
            <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <Checkbox
                checked={remettreCodes}
                onChange={setRemettreCodes}
                label="Nouveau tour de choix — remettre les codes des médecins à zéro"
                description={
                  'Chaque médecin fixera son code à sa prochaine connexion, pour tout le trimestre. ' +
                  'Celui qui connaît le sien peut le retaper : il redevient le sien, sans rien remarquer. ' +
                  'Les inscriptions sont ouvertes automatiquement — pensez à les refermer ensuite.'
                }
              />
            </div>

            {/* Message d'information persistant */}
            <Alert kind="info" className="mt-5">
              Les médecins verront le formulaire de cette période dès validation. Aucun desiderata
              n'est supprimé : ceux des autres périodes restent en base.
            </Alert>
          </form>
        </Card>
      </main>

      {/* Confirmation — la remise à zéro est irréversible */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Lancer un nouveau tour de choix ?"
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Annuler
            </Button>
            <Button variant="primary" loading={isSaving} onClick={() => enregistrer(true)}>
              Lancer le nouveau tour
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-700">
          Période enregistrée : <strong>du {formatJour(startDate)} au {formatJour(endDate)}</strong>.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-600">
          <li>
            Le code de <strong>tous les médecins</strong> est effacé. C'est irréversible : les codes
            actuels ne sont pas récupérables.
          </li>
          <li>
            À sa prochaine connexion, chacun fixe le code à 6 chiffres qu'il tape. Celui qui connaît
            le sien le retape et ne voit aucune différence.
          </li>
          <li>Les inscriptions sont ouvertes. Refermez-les une fois tout le monde connecté.</li>
          <li>Les desiderata ne sont pas touchés.</li>
        </ul>
      </Modal>
    </div>
  );
}

export default GestionPeriodeSaisie;
