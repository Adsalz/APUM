// src/components/ui/Alert.js
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const kinds = {
  success: {
    box: 'bg-success-50 border-success-200 text-success-800',
    icon: 'text-success-500',
    Icon: CheckCircle2,
  },
  error: {
    box: 'bg-danger-50 border-danger-200 text-danger-800',
    icon: 'text-danger-500',
    Icon: AlertCircle,
  },
  warning: {
    box: 'bg-warning-50 border-warning-200 text-warning-800',
    icon: 'text-warning-500',
    Icon: AlertTriangle,
  },
  info: {
    box: 'bg-primary-50 border-primary-200 text-primary-800',
    icon: 'text-primary-500',
    Icon: Info,
  },
};

/**
 * Bannière de feedback inline (succès, erreur, avertissement, info).
 */
function Alert({ kind = 'info', className = '', children }) {
  const { box, icon, Icon } = kinds[kind] || kinds.info;
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={twMerge(
        'flex items-start gap-2.5 rounded-xl border p-3.5 text-sm font-medium animate-fade-in',
        box,
        className
      )}
    >
      <Icon className={twMerge('mt-px h-5 w-5 flex-shrink-0', icon)} aria-hidden="true" />
      <div className="pt-px">{children}</div>
    </div>
  );
}

export default Alert;
