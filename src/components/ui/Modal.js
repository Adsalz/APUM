// src/components/ui/Modal.js
import React, { useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

/**
 * Modale accessible et unifiée :
 * - role="dialog" + aria-modal
 * - fermeture par Échap et clic sur l'arrière-plan
 * - verrouillage du scroll de la page
 * - focus initial sur le contenu, animations d'entrée
 */
function Modal({ open, onClose, title, size = 'md', children, footer = null }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (panelRef.current) {
      panelRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm animate-overlay-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={twMerge(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-pop outline-none animate-scale-in',
          widths[size]
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-6 py-4">
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-1 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
