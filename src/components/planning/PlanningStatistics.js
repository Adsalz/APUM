// src/components/planning/PlanningStatistics.js
import React from 'react';
import { Users, Calendar, Clock } from 'lucide-react';

const PlanningStatistics = ({
  medecins,
  periodeSaisie,
  planning,
  publishedPlanning
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    }}>
      {/* Nombre de médecins */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem'
        }}>
          <div style={{
            backgroundColor: '#EBF5FF',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            color: '#2563EB'
          }}>
            <Users size={24} />
          </div>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Médecins disponibles
          </h2>
        </div>
        <p style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#2563EB'
        }}>
          {medecins.length}
        </p>
      </div>

      {/* Période de saisie */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem'
        }}>
          <div style={{
            backgroundColor: '#F0FDF4',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            color: '#16A34A'
          }}>
            <Clock size={24} />
          </div>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Période de saisie
          </h2>
        </div>
        <p style={{
          fontSize: '0.875rem',
          color: periodeSaisie ? '#16A34A' : '#DC2626',
          fontWeight: '500'
        }}>
          {periodeSaisie ? (
            `Du ${new Date(periodeSaisie.startDate).toLocaleDateString()} au ${new Date(periodeSaisie.endDate).toLocaleDateString()}`
          ) : (
            'Aucune période définie'
          )}
        </p>
      </div>

      {/* État du planning */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem'
        }}>
          <div style={{
            backgroundColor: '#FFF7ED',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            color: '#EA580C'
          }}>
            <Calendar size={24} />
          </div>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            État du planning
          </h2>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: planning ? '#16A34A' : '#DC2626',
            fontWeight: '500'
          }}>
            {planning ? 'Planning généré' : 'Aucun planning généré'}
          </p>
          <p style={{
            fontSize: '0.875rem',
            color: publishedPlanning ? '#16A34A' : '#DC2626',
            fontWeight: '500'
          }}>
            {publishedPlanning ? 'Planning publié' : 'Non publié'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanningStatistics;