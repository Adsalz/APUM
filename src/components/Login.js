// src/components/Login.js
import React, { useState } from 'react';
import { useHistory, Redirect } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { loginUser } from '../services/authService';
import { getUser } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Card, FormField, Modal } from './ui';
import logger from '../utils/logger';

function Login() {
  const { firebaseUser, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // État distinct pour la modale de réinitialisation
  // (auparavant partagé avec le formulaire de connexion)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userCredential = await loginUser(email, password);
      if (!userCredential || !userCredential.user) {
        throw new Error('Échec de l\'authentification');
      }

      const user = await getUser(userCredential.user.uid);
      if (!user) {
        throw new Error('Utilisateur non trouvé dans Firestore');
      }

      if (user.role === 'medecin') {
        history.push('/dashboard-medecin');
      } else if (user.role === 'admin') {
        history.push('/dashboard-admin');
      } else {
        setError('Rôle utilisateur non reconnu');
        setIsLoading(false);
      }
    } catch (err) {
      logger.error('Erreur de connexion:', err);
      setError('Identifiants incorrects ou erreur de connexion');
      setIsLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetEmail('');
    setResetError('');
    setResetSuccess('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      // Pas de vérification préalable de l'existence du compte :
      // réponse identique dans tous les cas pour ne pas permettre
      // l'énumération des adresses email inscrites.
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(
        'Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.'
      );
      setTimeout(closeResetModal, 4000);
    } catch (err) {
      logger.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', err);
      setResetError('Erreur lors de l\'envoi de l\'email de réinitialisation.');
    } finally {
      setResetLoading(false);
    }
  };

  // Utilisateur déjà connecté : renvoi direct vers son tableau de bord
  if (!authLoading && firebaseUser && role) {
    return (
      <Redirect to={role === 'admin' ? '/dashboard-admin' : '/dashboard-medecin'} />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <Card className="w-full max-w-sm p-0">
        {/* En-tête */}
        <div className="rounded-t-lg border-b border-gray-200 bg-primary-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
            <Calendar className="h-8 w-8 text-primary-600" aria-hidden="true" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-primary-600">Planning APUM</h1>
          <p className="text-sm text-gray-500">
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6">
          <FormField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <FormField
            label="Mot de passe"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="mb-4 w-full text-center text-sm text-primary-600 hover:underline"
          >
            Mot de passe oublié ?
          </button>

          {error && (
            <Alert kind="error" className="mb-4">
              {error}
            </Alert>
          )}

          <Button type="submit" loading={isLoading} className="w-full">
            {isLoading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </Card>

      {/* Modale de réinitialisation du mot de passe */}
      <Modal
        open={showResetModal}
        onClose={closeResetModal}
        title="Réinitialisation du mot de passe"
        size="sm"
      >
        <form onSubmit={handleResetPassword}>
          <FormField
            label="Email"
            type="email"
            required
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Entrez votre adresse email"
            autoComplete="email"
          />

          {resetError && (
            <Alert kind="error" className="mb-4">
              {resetError}
            </Alert>
          )}
          {resetSuccess && (
            <Alert kind="success" className="mb-4">
              {resetSuccess}
            </Alert>
          )}

          <Button type="submit" loading={resetLoading} className="w-full">
            {resetLoading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default Login;
