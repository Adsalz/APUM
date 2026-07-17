// src/components/planning/modals/DiscardChangesModal.js
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const DiscardChangesModal = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Changements non sauvegardés"
      message="Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter le mode édition ? Les changements seront perdus."
      icon={AlertTriangle}
      tone="danger"
      confirmLabel="Abandonner les changements"
      cancelLabel="Continuer l'édition"
    />
  );
};

export default DiscardChangesModal;
