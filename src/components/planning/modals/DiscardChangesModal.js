// src/components/planning/modals/DiscardChangesModal.js
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const DiscardChangesModal = ({
  isOpen,
  onClose,
  onConfirm,
  nombreModifications = 0
}) => {
  const compte = nombreModifications > 0
    ? `${nombreModifications} modification${nombreModifications > 1 ? 's' : ''}`
    : 'Vos modifications';

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Changements non sauvegardés"
      message={`${compte} n'${nombreModifications > 1 ? 'ont' : 'a'} pas été sauvegardée${nombreModifications > 1 ? 's' : ''}. Le planning sera restauré dans son état d'origine et ces changements seront définitivement perdus.`}
      icon={AlertTriangle}
      tone="danger"
      confirmLabel="Abandonner les changements"
      cancelLabel="Continuer l'édition"
    />
  );
};

export default DiscardChangesModal;
