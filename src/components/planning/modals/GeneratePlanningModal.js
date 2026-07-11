// src/components/planning/modals/GeneratePlanningModal.js
import React, { useState } from 'react';
import { ArrowLeft, Calculator, ListOrdered, CheckCircle2 } from 'lucide-react';
import GenerateurTrimestre from '../../GenerateurTrimestre';
import { Modal, Button, Alert } from '../../ui';

const GeneratePlanningModal = ({
  isOpen,
  onClose,
  onConfirm,
  planning,
  medecins = []
}) => {
  const [modeGeneration, setModeGeneration] = useState('classique');
  const [listePriorite, setListePriorite] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);

  const handleConfirm = () => {
    onConfirm(modeGeneration, listePriorite);
  };

  const handleListeGenere = (nouvelleListe) => {
    setListePriorite(nouvelleListe);
    setShowGenerator(false);
  };

  const modeOptionClass = (active) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
      active ? 'border-primary-300 bg-primary-50' : 'border-ink-200 hover:bg-ink-50'
    }`;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size={showGenerator ? 'xl' : 'md'}
      title={showGenerator ? 'Génération de la liste trimestrielle' : 'Générer un nouveau planning'}
      footer={showGenerator ? null : (
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={modeGeneration === 'priorite' && !listePriorite}
          >
            Générer le planning
          </Button>
        </>
      )}
    >
      {showGenerator ? (
        <div>
          <div className="mb-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={16} aria-hidden="true" />}
              onClick={() => setShowGenerator(false)}
            >
              Retour
            </Button>
          </div>
          <GenerateurTrimestre
            onListeGenere={handleListeGenere}
            medecins={medecins}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {planning && (
            <Alert kind="warning">
              Cette action remplacera le planning existant.
            </Alert>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-700">
              Mode de génération
            </label>

            <div className="space-y-2">
              <label className={modeOptionClass(modeGeneration === 'classique')}>
                <input
                  type="radio"
                  name="modeGeneration"
                  value="classique"
                  checked={modeGeneration === 'classique'}
                  onChange={(e) => setModeGeneration(e.target.value)}
                  className="mt-1 accent-primary-600"
                />
                <span className="flex items-start gap-2">
                  <Calculator size={18} aria-hidden="true" className="mt-0.5 text-ink-400" />
                  <span>
                    <span className="block font-semibold text-ink-800">Mode classique</span>
                    <span className="block text-sm text-ink-500">
                      Algorithme de score avec optimisation automatique
                    </span>
                  </span>
                </span>
              </label>

              <label className={modeOptionClass(modeGeneration === 'priorite')}>
                <input
                  type="radio"
                  name="modeGeneration"
                  value="priorite"
                  checked={modeGeneration === 'priorite'}
                  onChange={(e) => setModeGeneration(e.target.value)}
                  className="mt-1 accent-primary-600"
                />
                <span className="flex items-start gap-2">
                  <ListOrdered size={18} aria-hidden="true" className="mt-0.5 text-ink-400" />
                  <span>
                    <span className="block font-semibold text-ink-800">Mode ordre de priorité</span>
                    <span className="block text-sm text-ink-500">
                      Attribution séquentielle selon la liste trimestrielle
                    </span>
                  </span>
                </span>
              </label>
            </div>
          </div>

          {modeGeneration === 'priorite' && (
            <div className="rounded-xl bg-ink-50 p-4">
              {!listePriorite ? (
                <div className="text-center">
                  <p className="mb-3 text-sm text-ink-500">
                    Vous devez d&apos;abord générer ou fournir une liste de priorité
                  </p>
                  <Button variant="primary" size="sm" onClick={() => setShowGenerator(true)}>
                    Générer la liste trimestrielle
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success-700">
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Liste de priorité configurée
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setShowGenerator(true)}>
                      Modifier
                    </Button>
                  </div>
                  <p className="text-sm text-ink-500">
                    Premier tour : {listePriorite.premierTour.length} médecins •
                    Deuxième tour : {listePriorite.deuxiemeTour.length} médecins
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default GeneratePlanningModal;
