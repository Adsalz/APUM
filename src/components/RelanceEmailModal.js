import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { envoyerRelancesEnMasse, getMedecinsSansDesiderata, APP_URL } from '../services/emailService';
import logger from '../utils/logger';
import { Modal, Button, FormField, Alert, Checkbox, Spinner } from './ui';

const RelanceEmailModal = ({
  isOpen,
  onClose,
  medecins,
  desiderataStatus,
  onSuccess
}) => {
  const [step, setStep] = useState(1); // 1: Sélection, 2: Personnalisation, 3: Envoi, 4: Résultat
  const [selectedMedecins, setSelectedMedecins] = useState([]);
  const [subject, setSubject] = useState('Rappel - Saisie de vos desiderata');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [resultats, setResultats] = useState(null);

  if (!isOpen) {return null;}

  // Obtenir les médecins sans desiderata
  const medecinsSansDesiderata = getMedecinsSansDesiderata(medecins, desiderataStatus);

  const handleSelectAll = () => {
    if (selectedMedecins.length === medecinsSansDesiderata.length) {
      setSelectedMedecins([]);
    } else {
      setSelectedMedecins(medecinsSansDesiderata.map(m => m.id));
    }
  };

  const handleMedecinToggle = (medecinId) => {
    setSelectedMedecins(prev =>
      prev.includes(medecinId)
        ? prev.filter(id => id !== medecinId)
        : [...prev, medecinId]
    );
  };

  const handleEnvoyerRelances = async () => {
    setIsLoading(true);
    setStep(3);

    try {
      const medecinsCibles = medecinsSansDesiderata.filter(m =>
        selectedMedecins.includes(m.id)
      );

      const resultats = await envoyerRelancesEnMasse(medecinsCibles, subject, message);
      setResultats(resultats);
      setStep(4);

      if (onSuccess) {
        onSuccess(resultats);
      }
    } catch (error) {
      logger.error('Erreur lors de l\'envoi des relances:', error);
      setResultats({
        succes: 0,
        echecs: selectedMedecins.length,
        erreurs: [{ medecin: 'Erreur générale', erreur: error.message }]
      });
      setStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedMedecins([]);
    setSubject('Rappel - Saisie de vos desiderata');
    setMessage('');
    setResultats(null);
    onClose();
  };

  const defaultMessage = `Bonjour,

Nous vous rappelons qu'il est important de saisir vos desiderata de planning dans les plus brefs délais.

Vous pouvez accéder à l'interface de saisie via le lien suivant :
${APP_URL}/formulaire-desirata

Merci de votre collaboration.

L'équipe APUM`;

  let footer = null;
  if (step === 1) {
    footer = (
      <>
        <Button variant="secondary" onClick={resetModal}>
          Annuler
        </Button>
        <Button onClick={() => setStep(2)} disabled={selectedMedecins.length === 0}>
          Suivant
        </Button>
      </>
    );
  } else if (step === 2) {
    footer = (
      <>
        <Button variant="secondary" onClick={() => setStep(1)}>
          Retour
        </Button>
        <Button variant="danger" icon={<Send size={16} />} onClick={handleEnvoyerRelances}>
          Envoyer les relances
        </Button>
      </>
    );
  } else if (step === 4) {
    footer = (
      <Button onClick={resetModal}>
        Fermer
      </Button>
    );
  }

  return (
    <Modal
      open
      onClose={resetModal}
      title="Relance par Email"
      size="lg"
      footer={footer}
    >
      {/* Étape 1: Sélection des médecins */}
      {step === 1 && (
        <div>
          <div className="mb-5">
            <h3 className="text-base font-semibold text-ink-900">
              Sélection des médecins à relancer
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              {medecinsSansDesiderata.length} médecin(s) n'ont pas encore saisi leurs desiderata
            </p>
          </div>

          {medecinsSansDesiderata.length === 0 ? (
            <Alert kind="success">
              Tous les médecins ont saisi leurs desiderata !
            </Alert>
          ) : (
            <div>
              <div className="mb-3">
                <Button variant="secondary" size="sm" onClick={handleSelectAll}>
                  {selectedMedecins.length === medecinsSansDesiderata.length
                    ? 'Désélectionner tout'
                    : 'Sélectionner tout'}
                </Button>
              </div>

              <div className="max-h-72 divide-y divide-ink-100 overflow-auto rounded-lg border border-ink-200">
                {medecinsSansDesiderata.map(medecin => (
                  <Checkbox
                    key={medecin.id}
                    checked={selectedMedecins.includes(medecin.id)}
                    onChange={() => handleMedecinToggle(medecin.id)}
                    label={`Dr ${medecin.prenom} ${medecin.nom}`}
                    description={medecin.email}
                    className="m-0 rounded-none px-4 py-3 hover:bg-ink-50"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Étape 2: Personnalisation du message */}
      {step === 2 && (
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            Personnalisation du message
          </h3>
          <p className="mb-4 mt-1 text-sm text-ink-500">
            {selectedMedecins.length} médecin(s) sélectionné(s)
          </p>

          <FormField
            label="Sujet de l'email"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <div>
            <label
              htmlFor="relance-message"
              className="mb-1.5 block text-sm font-semibold text-ink-700"
            >
              Message personnalisé (optionnel)
            </label>
            <textarea
              id="relance-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={defaultMessage}
              rows={8}
              className="w-full resize-y rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 shadow-sm transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
            />
            <p className="mt-1.5 text-xs text-ink-500">
              Laissez vide pour utiliser le message par défaut
            </p>
          </div>
        </div>
      )}

      {/* Étape 3: Envoi en cours */}
      {step === 3 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Spinner size="lg" className="text-primary-600" />
          <h3 className="mt-4 font-semibold text-ink-900">Envoi des relances en cours...</h3>
          <p className="mt-1 text-sm text-ink-500">Veuillez patienter</p>
        </div>
      )}

      {/* Étape 4: Résultats */}
      {step === 4 && resultats && (
        <div>
          <h3 className="mb-4 text-base font-semibold text-ink-900">
            Résultats de l'envoi
          </h3>

          <Alert kind={resultats.succes > 0 ? 'success' : 'error'} className="mb-4">
            {resultats.succes} email(s) envoyé(s), {resultats.echecs} échec(s)
          </Alert>

          {resultats.erreurs.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-danger-600">
                Erreurs rencontrées :
              </h4>
              <div className="max-h-40 overflow-auto rounded-lg border border-danger-200 bg-danger-50 p-3">
                {resultats.erreurs.map((erreur, index) => (
                  <div key={index} className="mb-1 text-sm text-danger-800">
                    <strong className="font-semibold">{erreur.medecin} :</strong> {erreur.erreur}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default RelanceEmailModal;
