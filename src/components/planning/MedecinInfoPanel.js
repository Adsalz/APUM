// src/components/MedecinInfoPanel.js
import React from 'react';
import { User, Calendar } from 'lucide-react';
import { compterGardesParMedecin, getNombreGardesSouhaitees } from '../../utils/planningUtils';

const MedecinInfoPanel = ({ medecin, planning, desiderata }) => {
  if (!medecin) return null;

  const gardesAttribuees = compterGardesParMedecin(planning, medecin.id);
  const gardesSouhaitees = getNombreGardesSouhaitees(desiderata, medecin.id);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '1.5rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          backgroundColor: '#EBF5FF',
          borderRadius: '50%',
          padding: '0.75rem'
        }}>
          <User size={24} color="#2563EB" />
        </div>
        <div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1F2937',
            margin: 0
          }}>
            Dr. {medecin.prenom} {medecin.nom}
          </h3>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          padding: '1rem',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '0.875rem',
            color: '#6B7280',
            marginBottom: '0.5rem'
          }}>
            Gardes souhaitées
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#2563EB'
          }}>
            {gardesSouhaitees}
          </div>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '0.875rem',
            color: '#6B7280',
            marginBottom: '0.5rem'
          }}>
            Gardes attribuées
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: gardesAttribuees > gardesSouhaitees ? '#DC2626' : '#059669'
          }}>
            {gardesAttribuees}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedecinInfoPanel;