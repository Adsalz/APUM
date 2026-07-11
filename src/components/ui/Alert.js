// src/components/ui/Alert.js
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const kinds = {
  success: {
    box: 'bg-success-50 border-success-200 text-success-800',
    Icon: CheckCircle,
  },
  error: {
    box: 'bg-danger-50 border-danger-200 text-danger-800',
    Icon: AlertCircle,
  },
  warning: {
    box: 'bg-warning-50 border-warning-200 text-warning-800',
    Icon: AlertTriangle,
  },
  info: {
    box: 'bg-primary-50 border-primary-200 text-primary-800',
    Icon: Info,
  },
};

/**
 * Bannière de feedback inline (succès, erreur, avertissement, info).
 * Remplace les alert() natifs et unifie les 4 mécanismes de feedback existants.
 */
function Alert({ kind = 'info', className = '', children }) {
  const { box, Icon } = kinds[kind] || kinds.info;
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={twMerge(
        'flex items-start gap-2 rounded-md border p-3 text-sm',
        box,
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export default Alert;
