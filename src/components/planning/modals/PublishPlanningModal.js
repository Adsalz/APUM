// src/components/planning/modals/PublishPlanningModal.js
// Publier rend le planning visible par TOUS les médecins : la modale récapitule
// donc l'état réel de ce qui va partir (remplissage, contraintes violées) au lieu
// de se contenter d'un « êtes-vous sûr ? ». Un planning incomplet ou en violation
// reste publiable — l'admin décide — mais jamais sans l'avoir vu écrit.
import React from 'react';
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const Ligne = ({ ton, children }) => {
  const classes = {
    danger: 'bg-danger-50 text-danger-800 ring-danger-200',
    warning: 'bg-warning-50 text-warning-800 ring-warning-200',
    success: 'bg-success-50 text-success-800 ring-success-200'
  }[ton];
  const Icone = ton === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <li className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${classes}`}>
      <Icone size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
};

const PublishPlanningModal = ({
  isOpen,
  onClose,
  onConfirm,
  publishedPlanning,
  analyse,
  modificationsNonSauvegardees = false
}) => {
  const vides = analyse?.vides ?? 0;
  const dures = analyse?.violationsDures ?? 0;
  const fortes = analyse?.violationsFortes ?? 0;
  const pct = analyse?.places ? Math.round((analyse.pourvues / analyse.places) * 100) : 0;
  const impeccable = vides === 0 && dures === 0 && fortes === 0;

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Publier le planning"
      message={publishedPlanning
        ? 'Cette action mettra à jour le planning publié. Les médecins verront les changements immédiatement.'
        : 'Cette action publiera le planning et le rendra visible pour tous les médecins.'}
      icon={Upload}
      tone={dures > 0 || modificationsNonSauvegardees ? 'danger' : 'success'}
      confirmLabel="Confirmer la publication"
      confirmDisabled={modificationsNonSauvegardees}
    >
      {analyse && (
        <ul className="space-y-2">
          {modificationsNonSauvegardees && (
            <Ligne ton="danger">
              <strong>Modifications non sauvegardées.</strong> La publication enverrait
              la dernière version <em>enregistrée</em>, pas celle affichée à l&apos;écran.
              Sauvegardez d&apos;abord.
            </Ligne>
          )}

          {impeccable ? (
            <Ligne ton="success">
              Planning complet ({analyse.pourvues}/{analyse.places} places) et sans
              contrainte violée.
            </Ligne>
          ) : (
            <>
              {vides > 0 && (
                <Ligne ton="warning">
                  <strong>{vides} place{vides > 1 ? 's' : ''} non pourvue{vides > 1 ? 's' : ''}</strong>{' '}
                  ({pct} % de remplissage) — ces gardes apparaîtront vides pour les médecins.
                </Ligne>
              )}
              {dures > 0 && (
                <Ligne ton="danger">
                  <strong>{dures} contrainte{dures > 1 ? 's' : ''} dure{dures > 1 ? 's' : ''} violée{dures > 1 ? 's' : ''}</strong>{' '}
                  (chevauchement de créneaux, 3 jours de garde consécutifs ou maximum
                  hebdomadaire dépassé).
                </Ligne>
              )}
              {fortes > 0 && (
                <Ligne ton="warning">
                  <strong>{fortes} affectation{fortes > 1 ? 's' : ''} à vérifier</strong>{' '}
                  (médecin ayant répondu « Non », ou quota mensuel dépassé).
                </Ligne>
              )}
            </>
          )}
        </ul>
      )}
    </ConfirmationModal>
  );
};

export default PublishPlanningModal;
