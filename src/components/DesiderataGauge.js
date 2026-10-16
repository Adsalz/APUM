import React from 'react';
import { Card, Badge } from './ui';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Bandeau de synthèse : jauge circulaire de la part de médecins ayant complété leurs desiderata. */
const DesiderataGauge = ({ medecins, desiderata }) => {
  const total = medecins.length;

  let complet = 0;
  let incomplet = 0;
  let nonSaisi = 0;

  medecins.forEach(medecin => {
    const medecinDesiderata = desiderata.find(d => d.userId === medecin.id);
    if (!medecinDesiderata) {
      nonSaisi += 1;
    } else if (Object.keys(medecinDesiderata.desiderata || {}).length === 0) {
      incomplet += 1;
    } else {
      complet += 1;
    }
  });

  if (total === 0) {
    return null;
  }

  const pct = Math.round((complet / total) * 100);
  const dashoffset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <Card className="mb-5 flex flex-wrap items-center gap-7 p-6">
      <div
        className="relative h-32 w-32 flex-shrink-0"
        role="img"
        aria-label={`${pct}% des médecins ont complété leurs desiderata`}
      >
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="12" className="stroke-ink-100" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className="stroke-success-500 transition-[stroke-dashoffset] duration-500 ease-out"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tabular-nums text-ink-900">{pct}%</span>
          <span className="text-[11px] font-semibold text-ink-500">complet</span>
        </div>
      </div>

      <div className="flex min-w-[220px] flex-1 flex-col gap-3">
        <p className="text-sm font-semibold text-ink-900">
          <span className="text-primary-600">{complet}</span> médecin{complet !== 1 ? 's' : ''} sur {total}{' '}
          {complet !== 1 ? 'ont' : 'a'} complété {complet !== 1 ? 'leurs' : 'ses'} desiderata pour la période en cours
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success" dot>{complet} Complet</Badge>
          <Badge tone="warning" dot>{incomplet} Incomplet</Badge>
          <Badge tone="danger" dot>{nonSaisi} Non saisi</Badge>
        </div>
      </div>
    </Card>
  );
};

export default DesiderataGauge;
