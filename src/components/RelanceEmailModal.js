import React, { useState } from 'react';
import { X, Mail, Send, AlertTriangle, Check } from 'lucide-react';
import { envoyerRelancesEnMasse, getMedecinsSansDesiderata } from '../services/emailService';
import logger from '../utils/logger';

const RelanceEmailModal = ({ 
  isOpen, 
  onClose, 
  medecins, 
  desiderataStatus,
  onSuccess 
}) => {
  const [step, setStep] = useState(1); // 1: Sélection, 2: Personnalisation, 3: Envoi, 4: Résultat
  const [selectedMedecins, setSelectedMedecins] = useState([]);
  const [subject, setSubject] = useState('Rappel - Saisie de vos desiderata');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [resultats, setResultats] = useState(null);

  if (!isOpen) {return null;}

  // Obtenir les médecins sans desiderata
  const medecinsSansDesiderata = getMedecinsSansDesiderata(medecins, desiderataStatus);

  const handleSelectAll = () => {
    if (selectedMedecins.length === medecinsSansDesiderata.length) {
      setSelectedMedecins([]);
    } else {
      setSelectedMedecins(medecinsSansDesiderata.map(m => m.id));
    }
  };

  const handleMedecinToggle = (medecinId) => {
    setSelectedMedecins(prev => 
      prev.includes(medecinId) 
        ? prev.filter(id => id !== medecinId)
        : [...prev, medecinId]
    );
  };

  const handleEnvoyerRelances = async () => {
    setIsLoading(true);
    setStep(3);

    try {
      const medecinsCibles = medecinsSansDesiderata.filter(m => 
        selectedMedecins.includes(m.id)
      );

      const resultats = await envoyerRelancesEnMasse(medecinsCibles, subject, message);
      setResultats(resultats);
      setStep(4);

      if (onSuccess) {
        onSuccess(resultats);
      }
    } catch (error) {
      logger.error('Erreur lors de l\'envoi des relances:', error);
      setResultats({
        succes: 0,
        echecs: selectedMedecins.length,
        erreurs: [{ medecin: 'Erreur générale', erreur: error.message }]
      });
      setStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedMedecins([]);
    setSubject('Rappel - Saisie de vos desiderata');
    setMessage('');
    setResultats(null);
    onClose();
  };

  const defaultMessage = `Bonjour,

Nous vous rappelons qu'il est important de saisir vos desiderata de planning dans les plus brefs délais.

Vous pouvez accéder à l'interface de saisie via le lien suivant :
https://apum-8cfa4.web.app/formulaire-desirata

Merci de votre collaboration.

L'équipe APUM`;

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
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* En-tête */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={24} style={{ color: '#2563EB' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
              Relance par Email
            </h2>
          </div>
          <button
            onClick={resetModal}
            style={{
              padding: '0.5rem',
              color: '#6B7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '1.5rem'
        }}>
          {/* Étape 1: Sélection des médecins */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Sélection des médecins à relancer
                </h3>
                <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                  {medecinsSansDesiderata.length} médecin(s) n'ont pas encore saisi leurs desiderata
                </p>
              </div>

              {medecinsSansDesiderata.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#059669',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '0.5rem'
                }}>
                  <Check size={48} style={{ margin: '0 auto 1rem' }} />
                  <p>Tous les médecins ont saisi leurs desiderata !</p>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <button
                      onClick={handleSelectAll}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#F3F4F6',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      {selectedMedecins.length === medecinsSansDesiderata.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                    </button>
                  </div>

                  <div style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.375rem',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {medecinsSansDesiderata.map(medecin => (
                      <label
                        key={medecin.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #F3F4F6',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMedecins.includes(medecin.id)}
                          onChange={() => handleMedecinToggle(medecin.id)}
                          style={{ marginRight: '0.75rem' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500' }}>
                            Dr {medecin.prenom} {medecin.nom}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                            {medecin.email}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Étape 2: Personnalisation du message */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                Personnalisation du message
              </h3>
              <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {selectedMedecins.length} médecin(s) sélectionné(s)
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Sujet de l'email
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={defaultMessage}
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  Laissez vide pour utiliser le message par défaut
                </p>
              </div>
            </div>
          )}

          {/* Étape 3: Envoi en cours */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #F3F4F6',
                borderTop: '4px solid #2563EB',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }} />
              <h3 style={{ marginBottom: '0.5rem' }}>Envoi des relances en cours...</h3>
              <p style={{ color: '#6B7280' }}>Veuillez patienter</p>
            </div>
          )}

          {/* Étape 4: Résultats */}
          {step === 4 && resultats && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                Résultats de l'envoi
              </h3>

              <div style={{
                backgroundColor: resultats.succes > 0 ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${resultats.succes > 0 ? '#D1FAE5' : '#FECACA'}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {resultats.succes > 0 ? (
                    <Check size={20} style={{ color: '#059669' }} />
                  ) : (
                    <AlertTriangle size={20} style={{ color: '#DC2626' }} />
                  )}
                  <span style={{ fontWeight: '600' }}>
                    {resultats.succes} email(s) envoyé(s), {resultats.echecs} échec(s)
                  </span>
                </div>
              </div>

              {resultats.erreurs.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#DC2626' }}>
                    Erreurs rencontrées :
                  </h4>
                  <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '0.375rem',
                    padding: '0.75rem',
                    maxHeight: '150px',
                    overflow: 'auto'
                  }}>
                    {resultats.erreurs.map((erreur, index) => (
                      <div key={index} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        <strong>{erreur.medecin}:</strong> {erreur.erreur}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          {step === 1 && (
            <>
              <button
                onClick={resetModal}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={selectedMedecins.length === 0}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: selectedMedecins.length > 0 ? '#2563EB' : '#9CA3AF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: selectedMedecins.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                Suivant
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                Retour
              </button>
              <button
                onClick={handleEnvoyerRelances}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#DC2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Send size={16} />
                Envoyer les relances
              </button>
            </>
          )}

          {step === 4 && (
            <button
              onClick={resetModal}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default RelanceEmailModal;