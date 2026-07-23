import React, { useState, useEffect } from 'react';
import { Send, Paperclip, Save, X } from 'lucide-react';
import { getMedecins } from '../services/userService';
import {
  getCampagneMail,
  setCampagneMail,
  buildCampagneEmail,
  formatMoisConcernes,
  CAMPAGNE_DEFAULTS,
} from '../services/campagneMailService';
import { generateBlankDesiderataAttachment } from '../services/excelExportService';
import { envoyerCampagneEnMasse } from '../services/emailService';
import logger from '../utils/logger';
import { Modal, Button, FormField, Alert, Spinner, useToast } from './ui';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Chaque mail (un par médecin) embarque ses pièces jointes en base64 DANS le
// document Firestore email_queue, plafonné à 1 Mo. Le modèle desiderata pèse
// ~40 Ko encodé ; on borne l'ordre de choix uploadé pour garder une marge sûre
// (600 Ko brut ≈ 800 Ko base64) et éviter de faire échouer TOUS les envois.
const MAX_ORDRE_CHOIX_BYTES = 600 * 1024;

// Lit un fichier (File) et renvoie son contenu encodé en base64 (sans le préfixe data:).
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });

const contentTypeForFile = (file) => {
  if (file.type) { return file.type; }
  if (/\.pdf$/i.test(file.name)) { return 'application/pdf'; }
  if (/\.xlsx$/i.test(file.name)) { return XLSX_MIME; }
  return 'application/octet-stream';
};

/**
 * Modale de campagne mail « desiderata ». L'admin édite le contenu du mail
 * (champs structurés, persistés dans config/campagne_mail), joint éventuellement
 * l'ordre de choix, vérifie le récapitulatif, puis envoie à tous les médecins.
 * Le modèle Excel des desiderata (format exact APUM, dates = période) est
 * généré et joint automatiquement.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Object} periode - { startDate, endDate } de la période de saisie en cours
 */
const CampagneMailModal = ({ isOpen, onClose, periode }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(CAMPAGNE_DEFAULTS);
  const [medecins, setMedecins] = useState([]);
  const [sansEmail, setSansEmail] = useState(0);
  const [ordreChoixFile, setOrdreChoixFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('edit'); // 'edit' | 'sending' | 'result'
  const [confirming, setConfirming] = useState(false);
  const [resultats, setResultats] = useState(null);

  useEffect(() => {
    if (!isOpen) { return; }
    let cancelled = false;
    setLoading(true);
    setStep('edit');
    setConfirming(false);
    setResultats(null);
    setOrdreChoixFile(null);

    (async () => {
      try {
        const [cfg, tousMedecins] = await Promise.all([getCampagneMail(), getMedecins()]);
        if (cancelled) { return; }
        const avecEmail = tousMedecins.filter((m) => m.email && m.email.includes('@'));
        setConfig(cfg);
        setMedecins(avecEmail);
        setSansEmail(tousMedecins.length - avecEmail.length);
      } catch (error) {
        logger.error('Erreur lors du chargement de la campagne:', error);
        if (!cancelled) { toast.error('Erreur lors du chargement de la campagne'); }
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) { return null; }

  // Backstop : période complète ET ordonnée (les dates sont des 'YYYY-MM-DD',
  // comparables lexicographiquement). GestionPeriodeSaisie bloque déjà en amont.
  const periodeValide = Boolean(
    periode?.startDate && periode?.endDate && periode.startDate <= periode.endDate
  );
  const mois = formatMoisConcernes(periode);
  const apercu = buildCampagneEmail(config, periode);

  const update = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_ORDRE_CHOIX_BYTES) {
      toast.error(
        `Fichier trop volumineux (${Math.round(file.size / 1024)} Ko). Maximum ${Math.round(MAX_ORDRE_CHOIX_BYTES / 1024)} Ko.`
      );
      e.target.value = ''; // permet de re-sélectionner le même fichier après correction
      return;
    }
    setOrdreChoixFile(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setCampagneMail(config);
      toast.success('Modèle de campagne enregistré');
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de la campagne:', error);
      toast.error('Impossible d\'enregistrer le modèle');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!periodeValide) {
      toast.error('Définissez d\'abord une période de saisie (dates de début et de fin).');
      return;
    }
    if (medecins.length === 0) {
      toast.error('Aucun médecin avec une adresse email valide.');
      return;
    }

    setConfirming(false);
    setStep('sending');
    try {
      // Persiste le modèle avant l'envoi (source de vérité réutilisable).
      await setCampagneMail(config);

      // Pièces jointes : modèle de desiderata (auto) + ordre de choix (optionnel).
      const attachments = [await generateBlankDesiderataAttachment(periode)];
      if (ordreChoixFile) {
        attachments.push({
          filename: ordreChoixFile.name,
          content: await fileToBase64(ordreChoixFile),
          encoding: 'base64',
          contentType: contentTypeForFile(ordreChoixFile),
        });
      }

      const mail = buildCampagneEmail(config, periode);
      const res = await envoyerCampagneEnMasse(medecins, mail, attachments);
      setResultats(res);
      setStep('result');
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la campagne:', error);
      setResultats({
        succes: 0,
        echecs: medecins.length,
        erreurs: [{ medecin: 'Erreur générale', erreur: error.message }],
      });
      setStep('result');
    }
  };

  const handleClose = () => {
    setStep('edit');
    setConfirming(false);
    setResultats(null);
    onClose();
  };

  const nbLabel = `${medecins.length} médecin${medecins.length > 1 ? 's' : ''}`;

  let footer = null;
  if (step === 'edit' && !confirming) {
    footer = (
      <>
        <Button variant="secondary" icon={<Save size={16} />} loading={saving} onClick={handleSave}>
          Enregistrer le modèle
        </Button>
        <Button
          icon={<Send size={16} />}
          onClick={() => setConfirming(true)}
          disabled={loading || !periodeValide || medecins.length === 0}
        >
          Envoyer à {nbLabel}
        </Button>
      </>
    );
  } else if (step === 'edit' && confirming) {
    // Étape de confirmation : garde-fou contre un envoi (ou un renvoi) accidentel.
    footer = (
      <>
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          Annuler
        </Button>
        <Button variant="danger" icon={<Send size={16} />} onClick={handleSend}>
          Confirmer l'envoi à {nbLabel}
        </Button>
      </>
    );
  } else if (step === 'result') {
    footer = <Button onClick={handleClose}>Fermer</Button>;
  }

  return (
    <Modal open onClose={handleClose} title="Campagne mail — desiderata" size="xl" footer={footer}>
      {loading && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Spinner size="lg" className="text-primary-600" />
          <p className="mt-3 text-sm text-ink-500">Chargement…</p>
        </div>
      )}

      {!loading && step === 'edit' && (
        <div className="space-y-5">
          {!periodeValide && (
            <Alert kind="warning">
              La période de saisie est incomplète ou invalide (la date de fin doit suivre la date
              de début). Le modèle Excel joint reprend ces dates.
            </Alert>
          )}

          {confirming && (
            <Alert kind="warning">
              Confirmer l'envoi à <strong className="font-semibold">{nbLabel}</strong> ? Chaque
              médecin recevra un mail individuel avec le modèle de desiderata
              {ordreChoixFile ? ' et l\'ordre de choix' : ''} en pièce jointe. Cette action peut
              être relancée : vérifiez de ne pas envoyer deux fois.
            </Alert>
          )}

          <div className="rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
            <strong className="font-semibold text-ink-800">{medecins.length}</strong> médecin(s)
            avec email recevront ce mail
            {sansEmail > 0 && <> — {sansEmail} exclu(s) (pas d'email)</>}.
            {mois && <> Mois concernés : <strong className="font-semibold">{mois}</strong>.</>}
          </div>

          {/* Champs éditables du mail */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                label="Objet du mail"
                type="text"
                value={config.objet}
                onChange={(e) => update('objet', e.target.value)}
              />
            </div>
            <FormField
              label="Nombre de vacations minimum (1h–7h)"
              type="number"
              min="0"
              value={config.nbVacationsMin}
              onChange={(e) => update('nbVacationsMin', e.target.value === '' ? '' : Number(e.target.value))}
            />
            <FormField
              label="Date de retour des tableaux"
              type="text"
              placeholder="ex. vendredi 10 mai 2026"
              value={config.dateRetour}
              onChange={(e) => update('dateRetour', e.target.value)}
            />
            <FormField
              label="Date de la réunion"
              type="text"
              placeholder="ex. mardi 09 juillet 2026"
              value={config.dateReunion}
              onChange={(e) => update('dateReunion', e.target.value)}
            />
            <FormField
              label="Lieu de la réunion"
              type="text"
              placeholder="laisser vide = communiqué ultérieurement"
              value={config.lieuReunion}
              onChange={(e) => update('lieuReunion', e.target.value)}
            />
            <FormField
              label="Signataire"
              type="text"
              value={config.signataire}
              onChange={(e) => update('signataire', e.target.value)}
            />
            <FormField
              label="Téléphone"
              type="text"
              value={config.telephone}
              onChange={(e) => update('telephone', e.target.value)}
            />
            <div className="sm:col-span-2">
              <label htmlFor="campagne-fonction" className="mb-1.5 block text-sm font-semibold text-ink-700">
                Fonction / titre (une ligne par intitulé)
              </label>
              <textarea
                id="campagne-fonction"
                value={config.fonction}
                onChange={(e) => update('fonction', e.target.value)}
                rows={2}
                className="w-full resize-y rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 shadow-sm hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
            </div>
          </div>

          {/* Pièces jointes */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-800">Pièces jointes</h3>
            <ul className="mb-3 space-y-1 text-sm text-ink-600">
              <li className="flex items-center gap-2">
                <Paperclip size={14} className="text-primary-600" />
                Modèle desiderata (Excel, généré automatiquement pour la période)
              </li>
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 shadow-sm hover:border-ink-300">
                <Paperclip size={16} />
                Joindre l'ordre de choix (optionnel)
                <input
                  type="file"
                  accept=".xlsx,.pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {ordreChoixFile && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-ink-100 px-3 py-1.5 text-sm text-ink-700">
                  {ordreChoixFile.name}
                  <button
                    type="button"
                    onClick={() => setOrdreChoixFile(null)}
                    className="text-ink-400 hover:text-danger-600"
                    aria-label="Retirer la pièce jointe"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Aperçu du mail assemblé */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-800">Aperçu du message</h3>
            <p className="mb-1 text-xs text-ink-500">Objet : {apercu.subject}</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-ink-200 bg-white p-4 font-sans text-sm text-ink-800">
{apercu.text}
            </pre>
          </div>
        </div>
      )}

      {step === 'sending' && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Spinner size="lg" className="text-primary-600" />
          <h3 className="mt-4 font-semibold text-ink-900">Envoi de la campagne en cours…</h3>
          <p className="mt-1 text-sm text-ink-500">
            {medecins.length} mail(s) avec pièce(s) jointe(s). Veuillez patienter.
          </p>
        </div>
      )}

      {step === 'result' && resultats && (
        <div>
          <h3 className="mb-4 text-base font-semibold text-ink-900">Résultat de l'envoi</h3>
          <Alert kind={resultats.succes > 0 ? 'success' : 'error'} className="mb-4">
            {resultats.succes} mail(s) programmé(s), {resultats.echecs} échec(s)
          </Alert>
          {resultats.erreurs.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-danger-600">Erreurs :</h4>
              <div className="max-h-40 overflow-auto rounded-lg border border-danger-200 bg-danger-50 p-3">
                {resultats.erreurs.map((err, i) => (
                  <div key={i} className="mb-1 text-sm text-danger-800">
                    <strong className="font-semibold">{err.medecin} :</strong> {err.erreur}
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

export default CampagneMailModal;
