// src/components/planning/modals/ConfirmationModal.js
import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  icon: Icon = AlertTriangle,
  iconColor = '#DC2626',
  iconBgColor = '#FEE2E2',
  confirmButtonColor = '#DC2626'
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '2rem',
        maxWidth: '28rem',
        width: '90%',
        textAlign: 'center'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          backgroundColor: iconBgColor,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem'
        }}>
          <Icon size={24} color={iconColor} />
        </div>

        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '0.5rem'
        }}>
          {title}
        </h2>

        <p style={{
          color: '#6B7280',
          marginBottom: '1.5rem'
        }}>
          {message}
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: confirmButtonColor,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;