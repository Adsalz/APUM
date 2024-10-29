// src/components/planning/modals/GeneratePlanningModal.js
import React from 'react';
import { RefreshCcw } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const GeneratePlanningModal = ({
  isOpen,
  onClose,
  onConfirm,
  planning
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={planning ? 'Regénérer le planning' : 'Générer le planning'}
      message={planning
        ? 'Êtes-vous sûr de vouloir regénérer le planning ? Cette action remplacera le planning actuel.'
        : 'Êtes-vous sûr de vouloir générer un nouveau planning ?'}
      icon={RefreshCcw}
      iconColor="#9333EA"
      iconBgColor="#F3E8FF"
      confirmButtonColor="#9333EA"
      confirmLabel="Générer"
    />
  );
};

export default GeneratePlanningModal;