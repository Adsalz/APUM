// src/components/ChangePasswordModal.js
import React, { useState } from 'react';
import { updateUserPassword } from '../services/authService';
import { Modal, Button, FormField, Alert } from './ui';

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      setIsLoading(false);
      return;
    }

    try {
      await updateUserPassword(newPassword);
      setSuccess('Mot de passe mis à jour avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(onClose, 2000);
    } catch (error) {
      setError('Erreur lors de la mise à jour du mot de passe: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Changer le mot de passe"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="change-password-form" loading={isLoading}>
            {isLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
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

      <form id="change-password-form" onSubmit={handleSubmit}>
        <FormField
          label="Mot de passe actuel"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <FormField
          label="Nouveau mot de passe"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <FormField
          label="Confirmer le nouveau mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="mb-0"
        />
      </form>
    </Modal>
  );
}

export default ChangePasswordModal;
