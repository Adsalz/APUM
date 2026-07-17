// src/components/planning/MedecinInfoPanel.js
import React from 'react';
import { User } from 'lucide-react';
import { compterGardesParMedecin, getNombreGardesSouhaitees } from '../../utils/planningUtils';
import { Card } from '../ui';

const MedecinInfoPanel = ({ medecin, planning, desiderata }) => {
  if (!medecin) {return null;}

  const gardesAttribuees = compterGardesParMedecin(planning, medecin.id);
  const gardesSouhaitees = getNombreGardesSouhaitees(desiderata, medecin.id);

  // Rechercher les desiderata les plus récents pour ce médecin
  const medecinDesiderata = desiderata
    .filter(d => d.userId === medecin.id)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];

  // Si aucun desiderata n'est trouvé, on affiche "Non défini"
  const gardesMaxParSemaine = medecinDesiderata?.nombreGardesMaxParSemaine !== undefined
    ? medecinDesiderata.nombreGardesMaxParSemaine
    : 'Non défini';

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <User size={24} aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold text-ink-900">
          Dr. {medecin.prenom} {medecin.nom}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-ink-50 p-4">
          <div className="mb-1 text-sm text-ink-500">
            Gardes souhaitées / mois
          </div>
          <div className="text-2xl font-extrabold text-primary-600">
            {gardesSouhaitees || 'Non défini'}
          </div>
        </div>

        <div className="rounded-xl bg-ink-50 p-4">
          <div className="mb-1 text-sm text-ink-500">
            Gardes max. / semaine
          </div>
          <div className="text-2xl font-extrabold text-success-600">
            {typeof gardesMaxParSemaine === 'number' ? gardesMaxParSemaine : 'Non défini'}
          </div>
        </div>

        <div className="rounded-xl bg-ink-50 p-4">
          <div className="mb-1 text-sm text-ink-500">
            Gardes attribuées
          </div>
          <div className={`text-2xl font-extrabold ${gardesAttribuees > gardesSouhaitees ? 'text-danger-600' : 'text-success-600'}`}>
            {gardesAttribuees}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MedecinInfoPanel;
