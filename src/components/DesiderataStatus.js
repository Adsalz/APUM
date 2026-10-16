// src/components/DesiderataStatus.js
// Tableau de suivi des desiderata : une ligne par médecin, triable sur chaque
// colonne. Remplace l'ancienne grille de cartes, trop éparse pour une
// soixantaine de médecins. Une ligne mène à la fiche individuelle.
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ChevronsUpDown, Mail } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Card, Badge } from './ui';
import {
  COLONNES,
  STATUTS,
  colonneParCle,
  construireLignes,
  trierLignes,
  triSuivant,
} from '../utils/suiviDesiderata';

const enTete =
  'border-b border-ink-100 bg-ink-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500';

const BoutonTri = ({ colonne, actif, sens, onClick }) => {
  const Icone = !actif ? ChevronsUpDown : sens === 'asc' ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        'group inline-flex items-center gap-1.5 rounded transition-colors hover:text-ink-700',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40',
        actif && 'text-ink-900'
      )}
    >
      {colonne.libelle}
      <Icone
        size={14}
        aria-hidden="true"
        className={twMerge('flex-shrink-0', actif ? 'text-primary-600' : 'text-ink-300 group-hover:text-ink-400')}
      />
    </button>
  );
};

const DesiderataStatus = ({ medecins, desiderata }) => {
  const navigate = useNavigate();
  const [tri, setTri] = useState({ cle: 'medecin', sens: 'asc' });

  const lignes = useMemo(
    () => trierLignes(construireLignes(medecins, desiderata), colonneParCle(tri.cle), tri.sens),
    [medecins, desiderata, tri]
  );

  const changerTri = (colonne) => setTri(precedent => triSuivant(precedent, colonne));

  const ouvrirFiche = (medecinId) => navigate(`/desiderata-individuels?medecin=${medecinId}`);

  return (
    <Card className="overflow-hidden p-0">
      {/* Sur petit écran le tableau défile latéralement plutôt que de se tasser. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <caption className="sr-only">
            Suivi des desiderata par médecin, triable par colonne
          </caption>
          <thead>
            <tr>
              {COLONNES.map(colonne => {
                const actif = tri.cle === colonne.cle;
                return (
                  <th
                    key={colonne.cle}
                    scope="col"
                    className={enTete}
                    aria-sort={actif ? (tri.sens === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <BoutonTri
                      colonne={colonne}
                      actif={actif}
                      sens={tri.sens}
                      onClick={() => changerTri(colonne)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {lignes.map(({ medecin, statut, modification }) => {
              const { tone, texte: libelle } = STATUTS[statut];
              return (
                <tr
                  key={medecin.id}
                  onClick={() => ouvrirFiche(medecin.id)}
                  className="cursor-pointer transition-colors odd:bg-white even:bg-ink-50/40 hover:bg-primary-50/60"
                >
                  {/* Nom de famille d'abord : c'est le repère de lecture dans une
                      liste de médecins (même ordre partout dans l'application).
                      Le lien rend la fiche atteignable au clavier. */}
                  <td className="px-4 py-3">
                    <Link
                      to={`/desiderata-individuels?medecin=${medecin.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-ink-900 hover:text-primary-700 focus:outline-none focus-visible:underline"
                    >
                      {(medecin.nom || '').toUpperCase()}{' '}
                      <span className="font-normal text-ink-500">{medecin.prenom}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {medecin.email ? (
                      <span className="flex items-center gap-2">
                        <Mail size={16} className="flex-shrink-0 text-ink-400" aria-hidden="true" />
                        <span className="truncate">{medecin.email}</span>
                      </span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={tone} dot>{libelle}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                    {modification ? modification.replace(/^le /, '') : <span className="text-ink-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DesiderataStatus;
