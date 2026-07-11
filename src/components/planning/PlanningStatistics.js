// src/components/planning/PlanningStatistics.js
import React from 'react';
import { Users, Calendar, Clock } from 'lucide-react';
import { StatCard, Badge } from '../ui';

const PlanningStatistics = ({
  medecins,
  periodeSaisie,
  planning,
  publishedPlanning
}) => {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Nombre de médecins */}
      <StatCard tone="blue" icon={<Users size={22} aria-hidden="true" />} label="Médecins disponibles">
        <p className="text-3xl font-extrabold text-ink-900">{medecins.length}</p>
      </StatCard>

      {/* Période de saisie */}
      <StatCard tone="green" icon={<Clock size={22} aria-hidden="true" />} label="Période de saisie">
        <p className={`text-sm font-semibold ${periodeSaisie ? 'text-success-600' : 'text-danger-600'}`}>
          {periodeSaisie ? (
            `Du ${new Date(periodeSaisie.startDate).toLocaleDateString()} au ${new Date(periodeSaisie.endDate).toLocaleDateString()}`
          ) : (
            'Aucune période définie'
          )}
        </p>
      </StatCard>

      {/* État du planning */}
      <StatCard tone="orange" icon={<Calendar size={22} aria-hidden="true" />} label="État du planning">
        <div className="flex flex-wrap gap-2">
          <Badge tone={planning ? 'success' : 'danger'} dot>
            {planning ? 'Planning généré' : 'Aucun planning généré'}
          </Badge>
          <Badge tone={publishedPlanning ? 'success' : 'danger'} dot>
            {publishedPlanning ? 'Planning publié' : 'Non publié'}
          </Badge>
        </div>
      </StatCard>
    </div>
  );
};

export default PlanningStatistics;
