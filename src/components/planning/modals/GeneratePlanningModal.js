// src/components/planning/modals/GeneratePlanningModal.js
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import GenerateurTrimestre from '../../GenerateurTrimestre';
import { Modal, Button, Alert } from '../../ui';

const GeneratePlanningModal = ({
  isOpen,
  onClose,
  onConfirm,
  planning,
  medecins = []
}) => {
  const [listePriorite, setListePriorite] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);

  const handleConfirm = () => {
    onConfirm(listePriorite);
  };

  const handleListeGenere = (nouvelleListe) => {
    setListePriorite(nouvelleListe);
    setShowGenerator(false);
  };

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
            disabled={!listePriorite}
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
              Attribution par ordre de choix
            </label>
            <p className="mb-3 text-sm text-ink-500">
              Le planning est généré en attribuant les gardes séquentiellement selon la liste
              d&apos;ordre de choix trimestrielle (deux tours).
            </p>

            <div className="rounded-xl bg-ink-50 p-4">
              {!listePriorite ? (
                <div className="text-center">
                  <p className="mb-3 text-sm text-ink-500">
                    Vous devez d&apos;abord générer ou fournir une liste d&apos;ordre de choix.
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
                      Liste d&apos;ordre de choix configurée
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
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GeneratePlanningModal;
