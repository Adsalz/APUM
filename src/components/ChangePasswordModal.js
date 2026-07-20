// src/components/ChangePasswordModal.js
import React, { useState } from 'react';
import { reauthenticateAndUpdatePassword } from '../services/authService';
import { nettoyerCode, CODE_MEDECIN_LONGUEUR, CODE_MEDECIN_REGEX } from '../constants/claim';
import { Modal, Button, FormField, Alert } from './ui';
import logger from '../utils/logger';

// Traduit les erreurs Firebase Auth en messages lisibles.
const mapError = (error) => {
  switch (error && error.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Code actuel incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/requires-recent-login':
      return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
    default:
      return 'Erreur lors de la mise à jour du code.';
  }
};

function ChangePasswordModal({ onClose }) {
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!CODE_MEDECIN_REGEX.test(newCode)) {
      setError(`Le nouveau code doit comporter ${CODE_MEDECIN_LONGUEUR} chiffres.`);
      return;
    }
    if (newCode !== confirmCode) {
      setError('Les nouveaux codes ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      await reauthenticateAndUpdatePassword(currentCode, newCode);
      setSuccess('Code mis à jour avec succès.');
      setCurrentCode('');
      setNewCode('');
      setConfirmCode('');
      setTimeout(onClose, 2000);
    } catch (err) {
      logger.error('Erreur lors de la mise à jour du code:', err);
      setError(mapError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Changer mon code"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="change-password-form" loading={isLoading}>
            {isLoading ? 'Mise à jour...' : 'Changer mon code'}
          </Button>
        </>
      }
    >
      {error && (
        <Alert kind="error" className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert kind="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* type="text" + inputMode/pattern numériques pour afficher le pavé
          numérique sur mobile ; masquage conservé via -webkit-text-security. */}
      <form id="change-password-form" onSubmit={handleSubmit}>
        <FormField
          label="Code actuel"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={currentCode}
          onChange={(e) => setCurrentCode(nettoyerCode(e.target.value))}
          maxLength={CODE_MEDECIN_LONGUEUR}
          autoComplete="current-password"
          required
          style={{ WebkitTextSecurity: 'disc' }}
        />
        <FormField
          label="Nouveau code (6 chiffres)"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={newCode}
          onChange={(e) => setNewCode(nettoyerCode(e.target.value))}
          maxLength={CODE_MEDECIN_LONGUEUR}
          autoComplete="new-password"
          required
          style={{ WebkitTextSecurity: 'disc' }}
        />
        <FormField
          label="Confirmer le nouveau code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={confirmCode}
          onChange={(e) => setConfirmCode(nettoyerCode(e.target.value))}
          maxLength={CODE_MEDECIN_LONGUEUR}
          autoComplete="new-password"
          required
          className="mb-0"
          style={{ WebkitTextSecurity: 'disc' }}
        />
      </form>
    </Modal>
  );
}

export default ChangePasswordModal;
