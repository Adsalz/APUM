// src/components/planning/modals/GeneratePlanningModal.js
import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import GenerateurTrimestre from '../../GenerateurTrimestre';
import { Modal, Button, Alert } from '../../ui';
import { idPeriode as calculerIdPeriode, libellePeriode } from '../../../utils/periodeId';
import { getOrdreChoixPeriode } from '../../../services/ordreChoixService';
import logger from '../../../utils/logger';

const GeneratePlanningModal = ({
  isOpen,
  onClose,
  onConfirm,
  planning,
  medecins = [],
  periodeSaisie = null
}) => {
  const [listePriorite, setListePriorite] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [ordreFige, setOrdreFige] = useState(false);

  const idPeriode = calculerIdPeriode(periodeSaisie);
  const libelle = libellePeriode(periodeSaisie);

  // L'ordre de choix du trimestre, une fois figé, est REPRIS TEL QUEL : régénérer
  // le tableau ne doit ni le recalculer ni le faire évoluer. On le précharge donc
  // ici, et l'admin n'a plus qu'à lancer la génération.
  useEffect(() => {
    if (!isOpen || !idPeriode) { return undefined; }
    let annule = false;
    (async () => {
      try {
        const existant = await getOrdreChoixPeriode(idPeriode);
        if (annule || !existant?.premierTour?.length) { return; }
        setListePriorite({
          premierTour: existant.premierTour,
          deuxiemeTour: existant.deuxiemeTour || [...existant.premierTour].reverse(),
          stats: { totalMedecins: existant.premierTour.length },
          medecinsInclus: medecins,
        });
        setOrdreFige(true);
      } catch (e) {
        logger.error('Lecture de l’ordre de choix du trimestre impossible:', e);
      }
    })();
    return () => { annule = true; };
  }, [isOpen, idPeriode, medecins]);

  const handleConfirm = () => {
    onConfirm(listePriorite);
  };

  // Le générateur ne remonte la liste qu'une fois celle-ci figée pour le trimestre.
  const handleListeGenere = (nouvelleListe) => {
    setListePriorite(nouvelleListe);
    setOrdreFige(true);
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
            periodeSaisie={periodeSaisie}
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
                      {ordreFige
                        ? <Lock size={16} aria-hidden="true" />
                        : <CheckCircle2 size={16} aria-hidden="true" />}
                      {ordreFige
                        ? `Ordre de choix ${libelle || 'du trimestre'} — figé`
                        : 'Liste d\u2019ordre de choix configurée'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setShowGenerator(true)}>
                      Modifier
                    </Button>
                  </div>
                  <p className="text-sm text-ink-500">
                    Premier tour : {listePriorite.premierTour.length} médecins •
                    Deuxième tour : {listePriorite.deuxiemeTour.length} médecins
                  </p>
                  {ordreFige && (
                    <p className="mt-1 text-xs text-ink-400">
                      Réutilisé à l&apos;identique à chaque régénération du tableau ; il n&apos;évoluera
                      qu&apos;au trimestre suivant.
                    </p>
                  )}
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
