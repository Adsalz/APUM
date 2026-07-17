// src/components/GestionUtilisateurs.js
import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, deleteUser } from '../services/userService';
import { registerUser } from '../services/authService';
import {
  Search,
  Trash2,
  Grid,
  List,
  UserPlus,
  Mail,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  AppHeader,
  LoadingScreen,
  ErrorScreen,
  Alert,
  Button,
  Modal,
  Card,
  Badge,
  Select,
  SegmentedControl,
  FormField,
  EmptyState,
  useToast,
} from './ui';
import logger from '../utils/logger';

function GestionUtilisateurs() {
  // États de base
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { profile } = useAuth();
  const toast = useToast();

  // États pour le formulaire d'ajout
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    nom: '',
    prenom: '',
    email: '',
    role: 'medecin'
  });

  // États pour les filtres et la vue
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  // const [showFilters, setShowFilters] = useState(false);

  // État pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(12);

  // État pour la confirmation
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Effet pour charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchUsers();
      } catch (error) {
        logger.error('Erreur:', error);
        setError('Erreur lors de la récupération des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fonction pour récupérer les utilisateurs
  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      logger.error('Erreur lors de la récupération des utilisateurs:', error);
      setError('Erreur lors de la récupération des utilisateurs');
    }
  };

  // Gestion des filtres et de la recherche
  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Gestion du formulaire d'ajout
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  // Gestion de l'ajout d'utilisateur
  const handleAddUser = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (!profile || profile.role !== 'admin') {
        throw new Error('Vous n\'avez pas les permissions nécessaires pour ajouter un utilisateur.');
      }

      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await registerUser(newUser.email);

      // Créer le document utilisateur dans Firestore
      await createUser(userCredential.user.uid, {
        nom: newUser.nom,
        prenom: newUser.prenom,
        email: newUser.email,
        role: newUser.role
      });

      setNewUser({ nom: '', prenom: '', email: '', role: 'medecin' });
      setShowAddForm(false);
      await fetchUsers();

      toast.success('Utilisateur ajouté avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'ajout de l\'utilisateur:', error);
      let errorMessage = 'Une erreur est survenue lors de l\'ajout de l\'utilisateur';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Cette adresse email est déjà utilisée.';
      }

      setError(errorMessage);
    }
  };

  // Gestion de la suppression
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteUser(userToDelete.id);
      await fetchUsers();
      setShowConfirmDelete(false);
      setUserToDelete(null);
      toast.success('Utilisateur supprimé avec succès');
    } catch (error) {
      logger.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  // Boutons de pagination réutilisables (vue tableau + vue grille)
  const paginationButtons = Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
    <Button
      key={page}
      size="sm"
      variant={currentPage === page ? 'primary' : 'secondary'}
      onClick={() => setCurrentPage(page)}
    >
      {page}
    </Button>
  ));

  // Si chargement en cours
  if (loading) {
    return <LoadingScreen message="Chargement des utilisateurs..." />;
  }

  // Si le chargement initial a échoué
  if (error && users.length === 0) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          fetchUsers().finally(() => setLoading(false));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Menu fixe en haut */}
      <AppHeader
        backTo="/dashboard-admin"
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus size={18} aria-hidden="true" />}
            onClick={() => setShowAddForm(true)}
          >
            Ajouter un utilisateur
          </Button>
        }
      />

      {/* Contenu principal */}
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 animate-fade-up">
        {/* Barre d'outils */}
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
          {/* Barre de recherche */}
          <div className="relative min-w-[200px] max-w-md flex-1">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-10 pr-3 text-sm text-ink-900 placeholder-ink-400 shadow-sm transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
            />
          </div>

          {/* Filtres et vue */}
          <div className="flex items-center gap-3">
            {/* Filtre par rôle */}
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="min-w-[160px]"
            >
              <option value="all">Tous les rôles</option>
              <option value="medecin">Médecins</option>
              <option value="admin">Administrateurs</option>
            </Select>

            {/* Boutons de vue */}
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'table', label: 'Liste', icon: <List size={16} aria-hidden="true" /> },
                { value: 'grid', label: 'Grille', icon: <Grid size={16} aria-hidden="true" /> },
              ]}
            />
          </div>
        </Card>

        {/* Affichage des erreurs (hors modale d'ajout) */}
        {error && !showAddForm && (
          <Alert kind="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Aucun résultat */}
        {filteredUsers.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={<Users size={26} aria-hidden="true" />}
              title="Aucun utilisateur"
              description="Aucun utilisateur ne correspond à votre recherche."
              action={
                <Button
                  variant="primary"
                  icon={<UserPlus size={16} aria-hidden="true" />}
                  onClick={() => setShowAddForm(true)}
                >
                  Ajouter un utilisateur
                </Button>
              }
            />
          </Card>
        ) : viewMode === 'table' ? (
          /* Vue tableau */
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-ink-100 bg-ink-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500">
                      Nom
                    </th>
                    <th className="border-b border-ink-100 bg-ink-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500">
                      Prénom
                    </th>
                    <th className="border-b border-ink-100 bg-ink-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500">
                      Email
                    </th>
                    <th className="border-b border-ink-100 bg-ink-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-ink-500">
                      Rôle
                    </th>
                    <th className="border-b border-ink-100 bg-ink-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-ink-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {currentUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors odd:bg-white even:bg-ink-50/40 hover:bg-ink-100/60"
                    >
                      <td className="px-4 py-3 font-medium text-ink-900">{user.nom}</td>
                      <td className="px-4 py-3 text-ink-700">{user.prenom}</td>
                      <td className="px-4 py-3 text-ink-700">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-ink-400" aria-hidden="true" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={user.role === 'admin' ? 'primary' : 'success'}>
                          {user.role === 'admin' ? 'Administrateur' : 'Médecin'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 size={16} aria-hidden="true" />}
                            onClick={() => handleDeleteClick(user)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 border-t border-ink-100 p-4">
                {paginationButtons}
              </div>
            )}
          </div>
        ) : (
          /* Vue grille */
          <div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
              {currentUsers.map((user) => (
                <Card
                  key={user.id}
                  className="flex flex-col transition-shadow hover:shadow-pop"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="mb-0.5 truncate text-lg font-bold text-ink-900">
                        {user.prenom} {user.nom}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-ink-500">
                        <Mail size={16} className="flex-shrink-0 text-ink-400" aria-hidden="true" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                    <Badge tone={user.role === 'admin' ? 'primary' : 'success'}>
                      {user.role === 'admin' ? 'Administrateur' : 'Médecin'}
                    </Badge>
                  </div>

                  <div className="mt-auto flex justify-end border-t border-ink-100 pt-4">
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={16} aria-hidden="true" />}
                      onClick={() => handleDeleteClick(user)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {paginationButtons}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal d'ajout d'utilisateur */}
      <Modal
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Ajouter un utilisateur"
        size="md"
      >
        <form onSubmit={handleAddUser}>
          {error && (
            <Alert kind="error" className="mb-4">
              {error}
            </Alert>
          )}

          <FormField
            label="Nom"
            type="text"
            name="nom"
            value={newUser.nom}
            onChange={handleInputChange}
            required
          />

          <FormField
            label="Prénom"
            type="text"
            name="prenom"
            value={newUser.prenom}
            onChange={handleInputChange}
            required
          />

          <FormField
            label="Email"
            type="email"
            name="email"
            value={newUser.email}
            onChange={handleInputChange}
            required
          />

          <div className="mb-4">
            <label
              htmlFor="new-user-role"
              className="mb-1.5 block text-sm font-semibold text-ink-700"
            >
              Rôle
            </label>
            <Select
              id="new-user-role"
              name="role"
              value={newUser.role}
              onChange={handleInputChange}
            >
              <option value="medecin">Médecin</option>
              <option value="admin">Administrateur</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddForm(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<UserPlus size={16} aria-hidden="true" />}
            >
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        open={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setUserToDelete(null);
        }}
        title="Confirmer la suppression"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowConfirmDelete(false);
                setUserToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
          <span className="font-semibold text-ink-900">
            {userToDelete?.prenom} {userToDelete?.nom}
          </span>
          {' '}? Cette action est irréversible.
        </p>
      </Modal>
    </div>
  );
}

export default GestionUtilisateurs;
