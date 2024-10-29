// src/components/planning/PlanningHeader.js
import React from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Save, 
  Upload, 
  RefreshCcw, 
  Edit2, 
  X 
} from 'lucide-react';

const PlanningHeader = ({
  editMode,
  modified,
  onEditToggle,
  onGenerateClick,
  onPublishClick,
  onSaveChanges,
  onBackClick,
  planning
}) => {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      zIndex: 40
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            onClick={onBackClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#4B5563',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#2563EB',
            fontWeight: 'bold'
          }}>
            <Calendar size={24} />
            <span>Gestion du planning</span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {!editMode ? (
            <>
              <button
                onClick={onGenerateClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#F3E8FF',
                  border: '1px solid #9333EA',
                  color: '#9333EA',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCcw size={18} />
                {planning ? 'Regénérer' : 'Générer'}
              </button>
              <button
                onClick={onEditToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#EBF5FF',
                  border: '1px solid #2563EB',
                  color: '#2563EB',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                <Edit2 size={18} />
                Modifier
              </button>
              {planning && (
                <button
                  onClick={onPublishClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #059669',
                    color: '#059669',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={18} />
                  Publier
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onSaveChanges}
                disabled={!modified}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: modified ? '#2563EB' : '#93C5FD',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: modified ? 'pointer' : 'not-allowed'
                }}
              >
                <Save size={18} />
                Sauvegarder
              </button>
              <button
                onClick={onEditToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  color: '#374151',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
                Annuler
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default PlanningHeader;