// src/components/planning/MedecinInfoPanel.js
// Panneau d'information du médecin filtré.
//
// Correctif d'audit : le compteur « gardes attribuées » cumulait TOUTE la période
// (3 mois) et le comparait au souhait, qui est MENSUEL — le panneau affichait donc
// un dépassement quasi permanent. La charge est désormais détaillée MOIS PAR MOIS,
// seule comparaison qui ait un sens.
import React from 'react';
import { User } from 'lucide-react';
import { souhaitMensuelDe, maxParSemaineDe } from '../../utils/planningEdition';
import { Card } from '../ui';

const MOIS_LONGS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const libelleMois = (cle) => {
  const [annee, mois] = cle.split('-');
  return `${MOIS_LONGS[Number(mois) - 1]} ${annee}`;
};

const Stat = ({ label, children }) => (
  <div className="rounded-xl bg-ink-50 p-4">
    <div className="mb-1 text-sm text-ink-500">{label}</div>
    {children}
  </div>
);

const MedecinInfoPanel = ({ medecin, idxDesiderata, analyse }) => {
  if (!medecin) { return null; }

  const souhaitees = souhaitMensuelDe(idxDesiderata, medecin.id);
  const maxSemaine = maxParSemaineDe(idxDesiderata, medecin.id);

  const parMois = Object.entries(analyse?.parMois || {})
    .map(([cle, compte]) => ({ cle, total: compte[medecin.id] || 0 }))
    .sort((a, b) => a.cle.localeCompare(b.cle));
  const totalPeriode = parMois.reduce((n, m) => n + m.total, 0);

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <User size={24} aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold text-ink-900">
          {medecin.nom} <span className="font-medium text-ink-500">{medecin.prenom}</span>
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Gardes souhaitées / mois">
          <div className="text-2xl font-extrabold text-primary-600">
            {souhaitees || 'Non défini'}
          </div>
        </Stat>

        <Stat label="Gardes max. / semaine">
          <div className="text-2xl font-extrabold text-ink-800">{maxSemaine}</div>
        </Stat>

        <Stat label={`Attribuées sur la période (${totalPeriode})`}>
          {parMois.length === 0 ? (
            <div className="text-2xl font-extrabold text-ink-400">0</div>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {parMois.map(({ cle, total }) => {
                const depasse = Boolean(souhaitees) && total > souhaitees;
                const plein = Boolean(souhaitees) && total === souhaitees;
                return (
                  <li
                    key={cle}
                    className={`rounded-lg px-2 py-1 text-sm font-semibold tabular-nums ring-1 ring-inset ${
                      depasse
                        ? 'bg-danger-50 text-danger-700 ring-danger-200'
                        : plein
                          ? 'bg-ink-100 text-ink-700 ring-ink-200'
                          : 'bg-success-50 text-success-700 ring-success-200'
                    }`}
                    title={`${libelleMois(cle)} : ${total} garde${total > 1 ? 's' : ''}${souhaitees ? ` pour ${souhaitees} souhaitée${souhaitees > 1 ? 's' : ''}` : ''}`}
                  >
                    <span className="font-normal capitalize">{MOIS_LONGS[Number(cle.split('-')[1]) - 1].slice(0, 4)}.</span>{' '}
                    {souhaitees ? `${total}/${souhaitees}` : total}
                  </li>
                );
              })}
            </ul>
          )}
        </Stat>
      </div>
    </Card>
  );
};

export default MedecinInfoPanel;
