// src/components/ChangePasswordModal.js
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { reauthenticateAndUpdatePassword, generateTempPassword } from '../services/authService';
import { Modal, Button, FormField, Alert } from './ui';
import logger from '../utils/logger';

// Longueur minimale du code. La validation côté client est indicative
// (contournable via l'API REST) mais couvre le cas courant et évite qu'un
// médecin ne remplace un code fort par un code trivial. Sans plan Blaze
// (Identity Platform), l'entropie du code est la seule vraie protection
// contre le brute-force.
const MIN_CODE_LENGTH = 12;

// Traduit les erreurs Firebase Auth en messages lisibles.
const mapError = (error) => {
  switch (error && error.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Code actuel incorrect.';
    case 'auth/weak-password':
      return `Code trop faible (au moins ${MIN_CODE_LENGTH} caractères).`;
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/requires-recent-login':
      return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
    default:
      return 'Erreur lors de la mise à jour du code.';
  }
};

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generated, setGenerated] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = () => {
    const g = generateTempPassword(16);
    setNewPassword(g);
    setConfirmPassword(g);
    setGenerated(g);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < MIN_CODE_LENGTH) {
      setError(`Le nouveau code doit contenir au moins ${MIN_CODE_LENGTH} caractères.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux codes ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      await reauthenticateAndUpdatePassword(currentPassword, newPassword);
      setSuccess('Code mis à jour avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setGenerated('');
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
      {generated && !success && (
        <Alert kind="info" className="mb-4">
          Nouveau code généré&nbsp;: <strong className="font-mono">{generated}</strong>
          <br />
          Notez-le maintenant, il ne sera plus affiché après validation.
        </Alert>
      )}

      <form id="change-password-form" onSubmit={handleSubmit}>
        <FormField
          label="Code actuel"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <FormField
          label={`Nouveau code (${MIN_CODE_LENGTH} caractères minimum)`}
          type="password"
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value); setGenerated(''); }}
          autoComplete="new-password"
          required
        />
        <FormField
          label="Confirmer le nouveau code"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          className="mb-2"
        />
        <button
          type="button"
          onClick={handleGenerate}
          className="mb-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
        >
          <Sparkles size={15} aria-hidden="true" />
          Générer un code fort
        </button>
      </form>
    </Modal>
  );
}

export default ChangePasswordModal;
