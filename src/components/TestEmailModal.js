import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { EMAIL_FROM } from '../services/emailService';
import logger from '../utils/logger';
import { Modal, Button, FormField, Alert } from './ui';

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
        from: EMAIL_FROM,
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
    <Modal
      open
      onClose={resetModal}
      title="Test Configuration Email"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={resetModal}>
            Fermer
          </Button>
          <Button
            onClick={handleSendTestEmail}
            disabled={!email || isLoading}
            loading={isLoading}
            icon={<Send size={16} />}
          >
            Envoyer test
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-600">
        Envoyez un email de test pour vérifier que la configuration Firebase fonctionne.
      </p>

      <FormField
        label="Adresse email de test"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre-email@example.com"
        className="mb-0"
      />

      {result && (
        <Alert kind={result.success ? 'success' : 'error'} className="mt-4">
          {result.message}
        </Alert>
      )}
    </Modal>
  );
};

export default TestEmailModal;
