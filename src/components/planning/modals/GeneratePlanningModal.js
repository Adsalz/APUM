// src/components/planning/modals/GeneratePlanningModal.js
import React, { useState } from 'react';
import GenerateurTrimestre from '../../GenerateurTrimestre';

const GeneratePlanningModal = ({
  isOpen,
  onClose,
  onConfirm,
  planning,
  medecins = []
}) => {
  const [modeGeneration, setModeGeneration] = useState('classique');
  const [listePriorite, setListePriorite] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);

  const handleConfirm = () => {
    onConfirm(modeGeneration, listePriorite);
  };

  const handleListeGenere = (nouvelleListe) => {
    setListePriorite(nouvelleListe);
    setShowGenerator(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        maxWidth: showGenerator ? '1200px' : '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {!showGenerator ? (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#1f2937'
            }}>
              Générer un nouveau planning
            </h3>

            {planning && (
              <div style={{
                backgroundColor: '#fef3c7',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                border: '1px solid #f59e0b'
              }}>
                <p style={{ color: '#92400e', fontSize: '0.875rem' }}>
                  ⚠️ Cette action remplacera le planning existant.
                </p>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Mode de génération
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: modeGeneration === 'classique' ? '#eff6ff' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="modeGeneration"
                    value="classique"
                    checked={modeGeneration === 'classique'}
                    onChange={(e) => setModeGeneration(e.target.value)}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>🧮 Mode Classique</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Algorithme de score avec optimisation automatique
                    </div>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: modeGeneration === 'priorite' ? '#eff6ff' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="modeGeneration"
                    value="priorite"
                    checked={modeGeneration === 'priorite'}
                    onChange={(e) => setModeGeneration(e.target.value)}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>📋 Mode Ordre de Priorité</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Attribution séquentielle selon la liste trimestrielle
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {modeGeneration === 'priorite' && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.5rem'
              }}>
                {!listePriorite ? (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                      Vous devez d'abord générer ou fournir une liste de priorité
                    </p>
                    <button
                      onClick={() => setShowGenerator(true)}
                      style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      📝 Générer la liste trimestrielle
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '500', color: '#374151' }}>
                        ✅ Liste de priorité configurée
                      </span>
                      <button
                        onClick={() => setShowGenerator(true)}
                        style={{
                          backgroundColor: '#6b7280',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        Modifier
                      </button>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Premier tour: {listePriorite.premierTour.length} médecins •
                      Deuxième tour: {listePriorite.deuxiemeTour.length} médecins
                    </p>
                  </div>
                )}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={modeGeneration === 'priorite' && !listePriorite}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: (modeGeneration === 'priorite' && !listePriorite) ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  cursor: (modeGeneration === 'priorite' && !listePriorite) ? 'not-allowed' : 'pointer'
                }}
              >
                Générer le planning
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                Génération de la Liste Trimestrielle
              </h3>
              <button
                onClick={() => setShowGenerator(false)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                ← Retour
              </button>
            </div>

            <GenerateurTrimestre
              onListeGenere={handleListeGenere}
              medecins={medecins}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneratePlanningModal;