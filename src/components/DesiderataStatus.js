import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Card, Badge } from './ui';

const DesiderataStatus = ({ medecins, desiderata }) => {
  const getStatusInfo = (medecinId) => {
    const medecinDesiderata = desiderata.find(d => d.userId === medecinId);

    if (!medecinDesiderata) {
      return {
        tone: 'danger',
        text: 'Non saisi',
        Icon: X,
        iconClass: 'bg-danger-50 text-danger-600',
      };
    }

    const nombreChoix = Object.keys(medecinDesiderata.desiderata || {}).length;
    if (nombreChoix === 0) {
      return {
        tone: 'warning',
        text: 'Incomplet',
        Icon: AlertCircle,
        iconClass: 'bg-warning-50 text-warning-600',
      };
    }

    return {
      tone: 'success',
      text: 'Complet',
      Icon: Check,
      iconClass: 'bg-success-50 text-success-600',
    };
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {medecins.map(medecin => {
        const { tone, text, Icon, iconClass } = getStatusInfo(medecin.id);

        return (
          <Card key={medecin.id} className="flex items-center gap-4 p-4">
            <div
              className={twMerge(
                'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
                iconClass
              )}
            >
              <Icon size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink-900">
                Dr. {medecin.prenom} {medecin.nom}
              </div>
              <Badge tone={tone} dot className="mt-1.5">
                {text}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default DesiderataStatus;
