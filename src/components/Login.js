import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { getUser, getUserByEmail } from '../services/userService';
import { Calendar } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
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
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      setError('Identifiants incorrects ou erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Vérifier d'abord si l'utilisateur existe dans notre base
      const user = await getUserByEmail(resetEmail);
      
      if (!user) {
        setError('Aucun compte n\'est associé à cette adresse email.');
        setIsLoading(false);
        return;
      }

      // Envoyer l'email de réinitialisation
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess('Email de réinitialisation envoyé avec succès !');
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation:", error);
      setError('Erreur lors de l\'envoi de l\'email de réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6', 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ 
        width: '400px',
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        margin: 'auto'
      }}>
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#EBF5FF', 
          borderTopLeftRadius: '8px', 
          borderTopRightRadius: '8px', 
          borderBottom: '1px solid #E5E7EB'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            margin: '0 auto 16px', 
            backgroundColor: '#BFDBFE', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Calendar style={{ width: '32px', height: '32px', color: '#2563EB' }} />
          </div>
          <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#2563EB', marginBottom: '8px' }}>
            Planning APUM
          </h2>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        <div style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '4px' 
              }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '4px' 
              }}>
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              style={{
                width: '100%',
                textAlign: 'center',
                color: '#2563EB',
                fontSize: '14px',
                marginBottom: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Mot de passe oublié ?
            </button>

            {error && (
              <div style={{ 
                backgroundColor: '#FEE2E2', 
                padding: '12px', 
                borderRadius: '4px', 
                marginBottom: '16px',
                border: '1px solid #FECACA'
              }}>
                <p style={{ color: '#DC2626', fontSize: '14px' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px 16px',
                backgroundColor: isLoading ? '#93C5FD' : '#2563EB',
                color: 'white',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                border: 'none'
              }}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>

      {/* Modal de réinitialisation du mot de passe */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            position: 'relative'
          }}>
            <button
              onClick={() => {
                setShowResetModal(false);
                setError('');
                setSuccess('');
                setResetEmail('');
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6B7280'
              }}
            >
              ×
            </button>

            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '16px'
            }}>
              Réinitialisation du mot de passe
            </h3>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px'
                  }}
                  placeholder="Entrez votre adresse email"
                />
              </div>

              {error && (
                <div style={{
                  backgroundColor: '#FEE2E2',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>
                  <p style={{ color: '#DC2626', fontSize: '14px' }}>{error}</p>
                </div>
              )}

              {success && (
                <div style={{
                  backgroundColor: '#D1FAE5',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>
                  <p style={{ color: '#059669', fontSize: '14px' }}>{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: isLoading ? '#93C5FD' : '#2563EB',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  border: 'none'
                }}
              >
                {isLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;