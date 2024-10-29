import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { getUser } from '../services/userService';
import { Calendar } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
        margin: 'auto' // Ajout de margin: auto pour un centrage parfait
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
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;