// src/components/GestionUtilisateurs.js
import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getAllUsers, deleteUser, getUser } from '../services/userService';
import { registerUser } from '../services/authService';

function GestionUtilisateurs() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ nom: '', prenom: '', email: '', role: 'medecin', password: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const history = useHistory();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userData = await getUser(authUser.uid);
          if (userData.role !== 'admin') {
            setError("Accès non autorisé");
            history.push('/');
          } else {
            setCurrentUser(userData);
            fetchUsers();
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données utilisateur:", error);
          setError("Erreur lors de la récupération des données utilisateur: " + error.message);
        }
      } else {
        history.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [history]);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      setError("Erreur lors de la récupération des utilisateurs: " + error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await registerUser(newUser.email, newUser.password, {
        nom: newUser.nom,
        prenom: newUser.prenom,
        role: newUser.role
      });
      alert('Utilisateur ajouté avec succès!');
      setNewUser({ nom: '', prenom: '', email: '', role: 'medecin', password: '' });
      fetchUsers();
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'utilisateur:", error);
      setError("Une erreur est survenue lors de l'ajout de l'utilisateur: " + error.message);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await deleteUser(uid);
        alert('Utilisateur supprimé avec succès!');
        fetchUsers();
      } catch (error) {
        console.error("Erreur lors de la suppression de l'utilisateur:", error);
        setError("Une erreur est survenue lors de la suppression de l'utilisateur: " + error.message);
      }
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur: {error}</div>;
  }

  if (!currentUser) {
    return <div>Utilisateur non autorisé</div>;
  }

  return (
    <div className="gestion-utilisateurs-container">
      <h1>Gestion des Utilisateurs</h1>
      <Link to="/dashboard-admin">Retour au tableau de bord</Link>

      <h2>Ajouter un nouvel utilisateur</h2>
      <form onSubmit={handleAddUser}>
        <div>
          <label htmlFor="nom">Nom:</label>
          <input
            type="text"
            id="nom"
            name="nom"
            value={newUser.nom}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="prenom">Prénom:</label>
          <input
            type="text"
            id="prenom"
            name="prenom"
            value={newUser.prenom}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={newUser.email}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Mot de passe:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={newUser.password}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="role">Rôle:</label>
          <select
            id="role"
            name="role"
            value={newUser.role}
            onChange={handleInputChange}
          >
            <option value="medecin">Médecin</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
        <button type="submit">Ajouter l'utilisateur</button>
      </form>

      <h2>Liste des utilisateurs</h2>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.nom}</td>
              <td>{user.prenom}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <button onClick={() => handleDeleteUser(user.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GestionUtilisateurs;