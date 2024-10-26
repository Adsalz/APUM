// src/components/Login.js
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { getUser } from '../services/userService';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      console.log('Tentative de connexion avec:', email);
      const userCredential = await loginUser(email, password);
      console.log('Résultat de loginUser:', userCredential);
      
      if (!userCredential || !userCredential.user) {
        throw new Error('Échec de l\'authentification');
      }

      console.log('Connexion réussie, récupération des informations utilisateur');
      const user = await getUser(userCredential.user.uid);
      console.log('Informations utilisateur récupérées:', user);
      
      if (!user) {
        throw new Error('Utilisateur non trouvé dans Firestore');
      }

      console.log('Rôle de l\'utilisateur:', user.role);
      if (user.role === 'medecin') {
        console.log('Redirection vers le tableau de bord médecin');
        history.push('/dashboard-medecin');
      } else if (user.role === 'admin') {
        console.log('Redirection vers le tableau de bord admin');
        history.push('/dashboard-admin');
      } else {
        console.log('Rôle non reconnu:', user.role);
        setError('Rôle utilisateur non reconnu');
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      setError('Identifiants incorrects ou erreur de connexion: ' + error.message);
    }
  };

  return (
    <div className="login-container">
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email :</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Mot de passe :</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
}

export default Login;