import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

const DesiderataStatus = ({ medecins, desiderata }) => {
  const getStatusInfo = (medecinId) => {
    const medecinDesiderata = desiderata.find(d => d.userId === medecinId);
    
    if (!medecinDesiderata) {
      return {
        status: 'non_saisi',
        icon: <X size={20} />,
        text: 'Non saisi',
        color: '#DC2626',
        bgColor: '#FEE2E2',
        borderColor: '#DC2626'
      };
    }

    const nombreChoix = Object.keys(medecinDesiderata.desiderata || {}).length;
    if (nombreChoix === 0) {
      return {
        status: 'incomplet',
        icon: <AlertCircle size={20} />,
        text: 'Incomplet',
        color: '#D97706',
        bgColor: '#FEF3C7',
        borderColor: '#D97706'
      };
    }

    return {
      status: 'complet',
      icon: <Check size={20} />,
      text: 'Complet',
      color: '#059669',
      bgColor: '#D1FAE5',
      borderColor: '#059669'
    };
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {medecins.map(medecin => {
        const statusInfo = getStatusInfo(medecin.id);
        
        return (
          <div
            key={medecin.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: `1px solid ${statusInfo.borderColor}`
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: statusInfo.bgColor,
                  color: statusInfo.color,
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {statusInfo.icon}
                </div>
                <div>
                  <div style={{
                    fontWeight: '500',
                    color: '#1F2937',
                    fontSize: '1rem'
                  }}>
                    Dr. {medecin.prenom} {medecin.nom}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: statusInfo.color,
                    fontWeight: '500'
                  }}>
                    {statusInfo.text}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DesiderataStatus;
