// src/components/planning/modals/PublishPlanningModal.js
import React from 'react';
import { Upload } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const PublishPlanningModal = ({
  isOpen,
  onClose,
  onConfirm,
  publishedPlanning
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Publier le planning"
      message={publishedPlanning
        ? 'Cette action mettra à jour le planning publié. Les médecins verront les changements immédiatement.'
        : 'Cette action publiera le planning et le rendra visible pour tous les médecins.'}
      icon={Upload}
      iconColor="#059669"
      iconBgColor="#ECFDF5"
      confirmButtonColor="#059669"
      confirmLabel="Confirmer la publication"
    />
  );
};

export default PublishPlanningModal;