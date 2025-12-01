import React, { useState } from 'react';
import { X, Mail, Send, Check, AlertTriangle } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

const TestEmailModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) {return null;}

  const handleSendTestEmail = async () => {
    if (!email) {return;}

    setIsLoading(true);
    setResult(null);

    try {
      const testMessage = `Test de configuration email - Si vous recevez cet email, la configuration fonctionne ! Timestamp: ${new Date().toLocaleString()}`;
      const htmlMessage = `
          <h2>Test de configuration email</h2>
          <p>Si vous recevez cet email, la configuration de l'envoi d'emails fonctionne correctement !</p>
          <p>Timestamp: ${new Date().toLocaleString()}</p>
          <hr>
          <p><small>Email automatique envoyé depuis l'application APUM</small></p>
        `;
      
      // Ajouter un email de test à la queue - FORMAT OFFICIEL
      const emailDoc = {
        to: [email], // TABLEAU requis !
        message: {
          subject: 'Test - Configuration email APUM',
          text: testMessage,
          html: htmlMessage
        },
        from: 'adriensalles@gmail.com',
        metadata: {
          type: 'test_email',
          sentAt: Timestamp.now()
        },
        createdAt: Timestamp.now()
      };
      
      logger.debug('Document à créer:', emailDoc);
      await addDoc(collection(db, 'email_queue'), emailDoc);

      setResult({
        success: true,
        message: 'Email de test ajouté à la queue de traitement. Vérifiez votre boîte mail dans quelques minutes.'
      });

    } catch (error) {
      logger.error('Erreur lors de l\'envoi du test:', error);
      setResult({
        success: false,
        message: `Erreur: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setEmail('');
    setResult(null);
    onClose();
  };

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
        maxWidth: '500px',
        overflow: 'hidden'
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
              Test Configuration Email
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
        <div style={{ padding: '1.5rem' }}>
          <p style={{ marginBottom: '1rem', color: '#6B7280', fontSize: '0.875rem' }}>
            Envoyez un email de test pour vérifier que la configuration Firebase fonctionne.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Adresse email de test
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre-email@example.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {result && (
            <div style={{
              padding: '1rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              backgroundColor: result.success ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${result.success ? '#D1FAE5' : '#FECACA'}`,
              color: result.success ? '#059669' : '#DC2626'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {result.success ? <Check size={20} /> : <AlertTriangle size={20} />}
                <span style={{ fontSize: '0.875rem' }}>{result.message}</span>
              </div>
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #F3F4F6',
                borderTop: '3px solid #2563EB',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 0.5rem'
              }} />
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Envoi en cours...</p>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
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
            Fermer
          </button>
          <button
            onClick={handleSendTestEmail}
            disabled={!email || isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: email && !isLoading ? '#2563EB' : '#9CA3AF',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: email && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Send size={16} />
            Envoyer test
          </button>
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

export default TestEmailModal;