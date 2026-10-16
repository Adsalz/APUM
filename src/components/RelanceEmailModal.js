import React, { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import {
  construireLotsRelance,
  getMedecinsSansDesiderata,
  messageRelanceParDefaut,
  adressesDesMedecins,
  SUJET_RELANCE_DEFAUT
} from '../services/emailService';
import logger from '../utils/logger';
import { Modal, Button, FormField, Alert, Checkbox } from './ui';

const copierDansLePressePapier = async (texte) => {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch (error) {
    logger.error('Copie dans le presse-papier impossible :', error);
    return false;
  }
};

const RelanceEmailModal = ({
  isOpen,
  onClose,
  medecins,
  desiderataStatus,
  onSuccess
}) => {
  const [step, setStep] = useState(1); // 1: Sélection, 2: Personnalisation, 3: Ouverture des brouillons
  const [selectedMedecins, setSelectedMedecins] = useState([]);
  const [subject, setSubject] = useState(SUJET_RELANCE_DEFAUT);
  const [message, setMessage] = useState('');
  const [lotsOuverts, setLotsOuverts] = useState([]);
  const [copie, setCopie] = useState(null); // 'adresses' | 'message'

  if (!isOpen) {return null;}

  // Obtenir les médecins sans desiderata
  const medecinsSansDesiderata = getMedecinsSansDesiderata(medecins, desiderataStatus);
  const medecinsCibles = medecinsSansDesiderata.filter(m => selectedMedecins.includes(m.id));
  const medecinsSansEmail = medecinsCibles.filter(m => !(m.email || '').trim());
  const lots = construireLotsRelance({ medecins: medecinsCibles, sujet: subject, message });
  const nbDestinataires = adressesDesMedecins(medecinsCibles).length;

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

  const handleOuvrirBrouillon = (index) => {
    // Le lien `mailto:` est confié au système : c'est le logiciel de
    // messagerie de l'admin qui ouvre le brouillon, l'app n'envoie rien.
    window.location.href = lots[index].href;
    setLotsOuverts(prev => (prev.includes(index) ? prev : [...prev, index]));
  };

  const handleCopier = async (cle, texte) => {
    const ok = await copierDansLePressePapier(texte);
    setCopie(ok ? cle : null);
    if (ok) {
      setTimeout(() => setCopie(null), 2000);
    }
  };

  const handleTermine = () => {
    if (onSuccess) {
      onSuccess({ destinataires: nbDestinataires, brouillons: lots.length });
    }
    resetModal();
  };

  const resetModal = () => {
    setStep(1);
    setSelectedMedecins([]);
    setSubject(SUJET_RELANCE_DEFAUT);
    setMessage('');
    setLotsOuverts([]);
    setCopie(null);
    onClose();
  };

  const corpsFinal = message.trim() || messageRelanceParDefaut();

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
        <Button
          icon={<Mail size={16} />}
          onClick={() => setStep(3)}
          disabled={lots.length === 0}
        >
          Préparer le message
        </Button>
      </>
    );
  } else if (step === 3) {
    footer = (
      <>
        <Button variant="secondary" onClick={() => setStep(2)}>
          Retour
        </Button>
        <Button onClick={handleTermine}>
          Terminé
        </Button>
      </>
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
                    label={`${(medecin.nom || '').toUpperCase()} ${medecin.prenom}`}
                    description={(medecin.email || '').trim() || 'Adresse email manquante'}
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
              placeholder={messageRelanceParDefaut()}
              rows={8}
              className="w-full resize-y rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder-ink-400 shadow-sm transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
            />
            <p className="mt-1.5 text-xs text-ink-500">
              Laissez vide pour utiliser le message par défaut
            </p>
          </div>
        </div>
      )}

      {/* Étape 3: Ouverture du brouillon dans le logiciel de messagerie */}
      {step === 3 && (
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            Ouvrir le message dans votre messagerie
          </h3>
          <p className="mb-4 mt-1 text-sm text-ink-500">
            {nbDestinataires} destinataire(s) en copie cachée (Cci) : les médecins
            ne verront pas la liste des autres.
          </p>

          <Alert kind="info" className="mb-4">
            L'application ne peut pas envoyer les emails elle-même : elle prépare
            le message, l'envoi se fait depuis votre logiciel de messagerie.
          </Alert>

          {medecinsSansEmail.length > 0 && (
            <Alert kind="warning" className="mb-4">
              {medecinsSansEmail.length} médecin(s) sans adresse email ne seront pas
              relancés : {medecinsSansEmail.map(m => `${(m.nom || '').toUpperCase()} ${m.prenom}`).join(', ')}.
            </Alert>
          )}

          {lots.length > 1 && (
            <p className="mb-3 text-sm text-ink-600">
              La liste est trop longue pour un seul message : ouvrez les{' '}
              {lots.length} brouillons l'un après l'autre.
            </p>
          )}

          <div className="mb-5 space-y-2">
            {lots.map((lot, index) => (
              <Button
                key={lot.href}
                variant={lotsOuverts.includes(index) ? 'secondary' : 'primary'}
                icon={lotsOuverts.includes(index) ? <Check size={16} /> : <Mail size={16} />}
                onClick={() => handleOuvrirBrouillon(index)}
                className="w-full"
              >
                {lots.length > 1
                  ? `Brouillon ${index + 1}/${lots.length} — ${lot.adresses.length} destinataire(s)`
                  : 'Ouvrir le brouillon'}
              </Button>
            ))}
          </div>

          <div className="rounded-xl border border-ink-200 bg-ink-50 p-3.5">
            <h4 className="text-sm font-semibold text-ink-700">
              Votre messagerie ne s'ouvre pas ?
            </h4>
            <p className="mb-3 mt-1 text-xs text-ink-500">
              Copiez les adresses et le message, puis collez-les dans un nouvel email.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={copie === 'adresses' ? <Check size={16} /> : <Copy size={16} />}
                onClick={() => handleCopier('adresses', adressesDesMedecins(medecinsCibles).join(', '))}
              >
                {copie === 'adresses' ? 'Adresses copiées' : 'Copier les adresses'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={copie === 'message' ? <Check size={16} /> : <Copy size={16} />}
                onClick={() => handleCopier('message', corpsFinal)}
              >
                {copie === 'message' ? 'Message copié' : 'Copier le message'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default RelanceEmailModal;
