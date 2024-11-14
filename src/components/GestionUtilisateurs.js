// src/components/GestionUtilisateurs.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getAllUsers, createUser, deleteUser, getUser } from '../services/userService';
import { registerUser } from '../services/authService';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Users,
  Grid,
  List,
  Filter,
  X,
  UserPlus,
  Mail
} from 'lucide-react';

function GestionUtilisateurs() {
  // États de base
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // Ajout de la déclaration de la variable d'état 'success'
  const history = useHistory();

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
  const [showFilters, setShowFilters] = useState(false);

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
        const authUser = auth.currentUser;
        if (!authUser) {
          history.push('/');
          return;
        }

        const userData = await getUser(authUser.uid);
        if (!userData || userData.role !== 'admin') {
        setError('Utilisateur non autorisé');
          history.push('/');
          return;
        }

        setCurrentUser(userData);
        await fetchUsers();
      } catch (error) {
        console.error("Erreur:", error);
      setError("Erreur lors de la récupération des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [history]);

// Fonction pour récupérer les utilisateurs
  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
    setError("Erreur lors de la récupération des utilisateurs");
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
    setSuccess(null);

    try {
      if (!currentUser || currentUser.role !== 'admin') {
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

      setSuccess('Utilisateur ajouté avec succès'); // Mise à jour de la variable 'success'
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'utilisateur:", error);
    let errorMessage = "Une erreur est survenue lors de l'ajout de l'utilisateur";
    
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Cette adresse email est déjà utilisée.";
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
    showNotification('Utilisateur supprimé avec succès');
      } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    setError("Erreur lors de la suppression de l'utilisateur");
    }
  };

// Fonction pour afficher les notifications
const showNotification = (message) => {
  // On pourrait implémenter un système de notifications plus sophistiqué ici
  alert(message);
};

// Si chargement en cours
if (loading) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      Chargement...
    </div>
  );
}

return (
  <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
    {/* Menu fixe en haut */}
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      zIndex: 40
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            onClick={() => history.push('/dashboard-admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#4B5563',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#2563EB',
            fontWeight: 'bold'
          }}>
            <Users size={24} />
            <span>Gestion des utilisateurs</span>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#2563EB',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          <UserPlus size={18} />
          Ajouter un utilisateur
        </button>
      </div>
    </nav>

    {/* Contenu principal */}
    <main style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '6rem 1rem 2rem',
    }}>
      {/* Barre d'outils */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Barre de recherche */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flex: '1',
          minWidth: '200px',
          maxWidth: '400px',
          position: 'relative'
        }}>
          <Search size={20} style={{
            position: 'absolute',
            left: '0.75rem',
            color: '#6B7280'
          }} />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #D1D5DB',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Filtres et vue */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {/* Filtre par rôle */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">Tous les rôles</option>
            <option value="medecin">Médecins</option>
            <option value="admin">Administrateurs</option>
          </select>

          {/* Boutons de vue */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            backgroundColor: '#F3F4F6',
            padding: '0.25rem',
            borderRadius: '0.375rem'
          }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: 'none',
                backgroundColor: viewMode === 'table' ? 'white' : 'transparent',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              <List size={20} color={viewMode === 'table' ? '#2563EB' : '#6B7280'} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: 'none',
                backgroundColor: viewMode === 'grid' ? 'white' : 'transparent',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Grid size={20} color={viewMode === 'grid' ? '#2563EB' : '#6B7280'} />
            </button>
          </div>
        </div>
      </div>

      {/* Affichage des erreurs */}
      {error && (
         <div style={{
           backgroundColor: '#FEE2E2',
           color: '#DC2626',
           padding: '1rem',
           borderRadius: '0.5rem',
           marginBottom: '1.5rem',
           display: 'flex',
           alignItems: 'center',
           gap: '0.5rem'
         }}>
           <X size={20} />
           {error}
         </div>
       )}

       {/* Vue tableau */}
       {viewMode === 'table' && (
         <div style={{
           backgroundColor: 'white',
           borderRadius: '0.5rem',
           boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
           overflow: 'hidden'
         }}>
           <div style={{ overflowX: 'auto' }}>
             <table style={{
               width: '100%',
               borderCollapse: 'collapse',
               fontSize: '0.875rem'
             }}>
               <thead>
                 <tr>
                   <th style={{
                     padding: '1rem',
                     textAlign: 'left',
                     backgroundColor: '#F9FAFB',
                     borderBottom: '1px solid #E5E7EB',
                     color: '#374151',
                     fontWeight: '600'
                   }}>
                     Nom
                   </th>
                   <th style={{
                     padding: '1rem',
                     textAlign: 'left',
                     backgroundColor: '#F9FAFB',
                     borderBottom: '1px solid #E5E7EB',
                     color: '#374151',
                     fontWeight: '600'
                   }}>
                     Prénom
                   </th>
                   <th style={{
                     padding: '1rem',
                     textAlign: 'left',
                     backgroundColor: '#F9FAFB',
                     borderBottom: '1px solid #E5E7EB',
                     color: '#374151',
                     fontWeight: '600'
                   }}>
                     Email
                   </th>
                   <th style={{
                     padding: '1rem',
                     textAlign: 'left',
                     backgroundColor: '#F9FAFB',
                     borderBottom: '1px solid #E5E7EB',
                     color: '#374151',
                     fontWeight: '600'
                   }}>
                     Rôle
                   </th>
                   <th style={{
                     padding: '1rem',
                     textAlign: 'right',
                     backgroundColor: '#F9FAFB',
                     borderBottom: '1px solid #E5E7EB',
                     color: '#374151',
                     fontWeight: '600'
                   }}>
                     Actions
                   </th>
                 </tr>
               </thead>
               <tbody>
                 {currentUsers.map((user) => (
                   <tr 
                     key={user.id}
                     style={{
                       borderBottom: '1px solid #E5E7EB',
                       transition: 'background-color 0.2s'
                     }}
                     onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                     onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                   >
                     <td style={{ padding: '1rem' }}>{user.nom}</td>
                     <td style={{ padding: '1rem' }}>{user.prenom}</td>
                     <td style={{ padding: '1rem' }}>
                       <div style={{
                         display: 'flex',
                         alignItems: 'center',
                         gap: '0.5rem'
                       }}>
                         <Mail size={16} color="#6B7280" />
                         {user.email}
                       </div>
                     </td>
                     <td style={{ padding: '1rem' }}>
                       <span style={{
                         padding: '0.25rem 0.5rem',
                         borderRadius: '9999px',
                         fontSize: '0.75rem',
                         fontWeight: '500',
                         backgroundColor: user.role === 'admin' ? '#EBF5FF' : '#F0FDF4',
                         color: user.role === 'admin' ? '#2563EB' : '#16A34A'
                       }}>
                         {user.role === 'admin' ? 'Administrateur' : 'Médecin'}
                       </span>
                     </td>
                     <td style={{
                       padding: '1rem',
                       textAlign: 'right'
                     }}>
                       <div style={{
                         display: 'flex',
                         gap: '0.5rem',
                         justifyContent: 'flex-end'
                       }}>
                         <button
                           onClick={() => handleDeleteClick(user)}
                           style={{
                             padding: '0.5rem',
                             borderRadius: '0.375rem',
                             border: '1px solid #DC2626',
                             backgroundColor: 'white',
                             color: '#DC2626',
                             cursor: 'pointer',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '0.25rem',
                             transition: 'all 0.2s'
                           }}
                           onMouseOver={(e) => {
                             e.currentTarget.style.backgroundColor = '#DC2626';
                             e.currentTarget.style.color = 'white';
                           }}
                           onMouseOut={(e) => {
                             e.currentTarget.style.backgroundColor = 'white';
                             e.currentTarget.style.color = '#DC2626';
                           }}
                         >
                           <Trash2 size={16} />
                           Supprimer
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {/* Pagination */}
           {totalPages > 1 && (
             <div style={{
               padding: '1rem',
               display: 'flex',
               justifyContent: 'center',
               gap: '0.5rem',
               borderTop: '1px solid #E5E7EB'
             }}>
               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                 <button
                   key={page}
                   onClick={() => setCurrentPage(page)}
                   style={{
                     padding: '0.5rem 1rem',
                     borderRadius: '0.375rem',
                     border: '1px solid #E5E7EB',
                     backgroundColor: currentPage === page ? '#2563EB' : 'white',
                     color: currentPage === page ? 'white' : '#374151',
                     cursor: 'pointer',
                     transition: 'all 0.2s'
                   }}
                 >
                   {page}
                 </button>
               ))}
             </div>
           )}
         </div>
       )}

{/* Vue grille */}
{viewMode === 'grid' && (
  <div>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1rem'
    }}>
      {currentUsers.map((user) => (
        <div
          key={user.id}
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            position: 'relative',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'start',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '0.25rem'
              }}>
                {user.prenom} {user.nom}
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#6B7280',
                fontSize: '0.875rem'
              }}>
                <Mail size={16} />
                {user.email}
              </div>
            </div>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '500',
              backgroundColor: user.role === 'admin' ? '#EBF5FF' : '#F0FDF4',
              color: user.role === 'admin' ? '#2563EB' : '#16A34A'
            }}>
              {user.role === 'admin' ? 'Administrateur' : 'Médecin'}
            </span>
          </div>

          <div style={{
            borderTop: '1px solid #E5E7EB',
            paddingTop: '1rem',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => handleDeleteClick(user)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #DC2626',
                backgroundColor: 'white',
                color: '#DC2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#DC2626';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#DC2626';
              }}
            >
              <Trash2 size={16} />
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* Pagination */}
    {totalPages > 1 && (
      <div style={{
        padding: '1rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '2rem'
      }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #E5E7EB',
              backgroundColor: currentPage === page ? '#2563EB' : 'white',
              color: currentPage === page ? 'white' : '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '2.5rem',
              fontWeight: currentPage === page ? '600' : '400'
            }}
            onMouseOver={(e) => {
              if (currentPage !== page) {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== page) {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            {page}
          </button>
        ))}
      </div>
    )}
  </div>
)}
     </main>

     {/* Modal d'ajout d'utilisateur */}
     {showAddForm && (
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
         zIndex: 50
       }}>
         <div style={{
           backgroundColor: 'white',
           borderRadius: '0.5rem',
           padding: '2rem',
           width: '90%',
           maxWidth: '500px',
           position: 'relative'
         }}>
           <button
             onClick={() => setShowAddForm(false)}
             style={{
               position: 'absolute',
               top: '1rem',
               right: '1rem',
               padding: '0.5rem',
               border: 'none',
               backgroundColor: 'transparent',
               cursor: 'pointer'
             }}
           >
             <X size={20} color="#6B7280" />
           </button>

           <h2 style={{
             fontSize: '1.5rem',
             fontWeight: 'bold',
             color: '#111827',
             marginBottom: '1.5rem'
           }}>
             Ajouter un utilisateur
           </h2>

           <form onSubmit={handleAddUser}>
             <div style={{ marginBottom: '1rem' }}>
               <label style={{
                 display: 'block',
                 marginBottom: '0.5rem',
                 fontSize: '0.875rem',
                 fontWeight: '500',
                 color: '#374151'
               }}>
                 Nom
               </label>
               <input
                 type="text"
                 name="nom"
                 value={newUser.nom}
                 onChange={handleInputChange}
                 required
                 style={{
                   width: '100%',
                   padding: '0.5rem',
                   borderRadius: '0.375rem',
                   border: '1px solid #D1D5DB'
                 }}
               />
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{
                 display: 'block',
                 marginBottom: '0.5rem',
                 fontSize: '0.875rem',
                 fontWeight: '500',
                 color: '#374151'
               }}>
                 Prénom
               </label>
               <input
                 type="text"
                 name="prenom"
                 value={newUser.prenom}
                 onChange={handleInputChange}
                 required
                 style={{
                   width: '100%',
                   padding: '0.5rem',
                   borderRadius: '0.375rem',
                   border: '1px solid #D1D5DB'
                 }}
               />
             </div>

             <div style={{ marginBottom: '1rem' }}>
               <label style={{
                 display: 'block',
                 marginBottom: '0.5rem',
                 fontSize: '0.875rem',
                 fontWeight: '500',
                 color: '#374151'
               }}>
                 Email
               </label>
               <input
                 type="email"
                 name="email"
                 value={newUser.email}
                 onChange={handleInputChange}
                 required
                 style={{
                   width: '100%',
                   padding: '0.5rem',
                   borderRadius: '0.375rem',
                   border: '1px solid #D1D5DB'
                 }}
               />
             </div>

             <div style={{ marginBottom: '1.5rem' }}>
               <label style={{
                 display: 'block',
                 marginBottom: '0.5rem',
                 fontSize: '0.875rem',
                 fontWeight: '500',
                 color: '#374151'
               }}>
                 Rôle
               </label>
               <select
                 name="role"
                 value={newUser.role}
                 onChange={handleInputChange}
                 style={{
                   width: '100%',
                   padding: '0.5rem',
                   borderRadius: '0.375rem',
                   border: '1px solid #D1D5DB',
                   backgroundColor: 'white'
                 }}
               >
                 <option value="medecin">Médecin</option>
                 <option value="admin">Administrateur</option>
               </select>
             </div>

             <div style={{
               display: 'flex',
               gap: '1rem',
               justifyContent: 'flex-end'
             }}>
               <button
                 type="button"
                 onClick={() => setShowAddForm(false)}
                 style={{
                   padding: '0.5rem 1rem',
                   borderRadius: '0.375rem',
                   border: '1px solid #D1D5DB',
                   backgroundColor: 'white',
                   color: '#374151',
                   cursor: 'pointer'
                 }}
               >
                 Annuler
               </button>
               <button
                 type="submit"
                 style={{
                   padding: '0.5rem 1rem',
                   borderRadius: '0.375rem',
                   border: 'none',
                   backgroundColor: '#2563EB',
                   color: 'white',
                   cursor: 'pointer'
                 }}
               >
                 Ajouter
               </button>
             </div>
           </form>
         </div>
       </div>
     )}

     {/* Modal de confirmation de suppression */}
     {showConfirmDelete && (
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
         zIndex: 50
       }}>
         <div style={{
           backgroundColor: 'white',
           borderRadius: '0.5rem',
           padding: '2rem',
           width: '90%',
           maxWidth: '400px',
           textAlign: 'center'
         }}>
           <div style={{
             width: '3rem',
             height: '3rem',
             backgroundColor: '#FEE2E2',
             borderRadius: '50%',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             margin: '0 auto 1rem'
           }}>
             <Trash2 size={24} color="#DC2626" />
           </div>

           <h2 style={{
             fontSize: '1.25rem',
             fontWeight: 'bold',
             color: '#111827',
             marginBottom: '0.5rem'
           }}>
             Confirmer la suppression
           </h2>

           <p style={{
             color: '#6B7280',
             marginBottom: '1.5rem'
           }}>
             Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
             <span style={{ fontWeight: '600' }}>
               {userToDelete?.prenom} {userToDelete?.nom}
             </span>
             ? Cette action est irréversible.
           </p>

           <div style={{
             display: 'flex',
             gap: '1rem',
             justifyContent: 'center'
           }}>
             <button
               onClick={() => {
                 setShowConfirmDelete(false);
                 setUserToDelete(null);
               }}
               style={{
                 padding: '0.5rem 1rem',
                 borderRadius: '0.375rem',
                 border: '1px solid #D1D5DB',
                 backgroundColor: 'white',
                 color: '#374151',
                 cursor: 'pointer',
                 minWidth: '100px'
               }}
             >
               Annuler
             </button>
             <button
               onClick={handleConfirmDelete}
               style={{
                 padding: '0.5rem 1rem',
                 borderRadius: '0.375rem',
                 border: 'none',
                 backgroundColor: '#DC2626',
                 color: 'white',
                 cursor: 'pointer',
                 minWidth: '100px'
               }}
             >
               Supprimer
             </button>
           </div>
         </div>
       </div>
     )}
   </div>
  );
}

export default GestionUtilisateurs;
