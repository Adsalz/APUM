// src/components/planning/modals/ConfirmationModal.js
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../../ui';

const tones = {
  danger: { circle: 'bg-danger-50 text-danger-600', variant: 'danger' },
  success: { circle: 'bg-success-50 text-success-600', variant: 'success' },
  primary: { circle: 'bg-primary-50 text-primary-600', variant: 'primary' },
};

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  icon: Icon = AlertTriangle,
  tone = 'danger',
  confirmDisabled = false,
  children = null
}) => {
  const t = tones[tone] || tones.danger;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={t.variant} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${t.circle}`}>
            <Icon size={22} aria-hidden="true" />
          </div>
          <p className="pt-1 text-sm text-ink-700">{message}</p>
        </div>
        {children}
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
