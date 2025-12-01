import React, { useState } from 'react';

const GenerateurTrimestre = ({ onListeGenere, medecins = [] }) => {
  const [resultat, setResultat] = useState(null);
  const [listeActuelleTriee, setListeActuelleTriee] = useState([]);

  // Générer automatiquement la liste depuis TOUS les médecins de la base
  React.useEffect(() => {
    if (medecins.length > 0) {
      // Trier par nom pour un ordre reproductible
      const medecinsTries = [...medecins].sort((a, b) =>
        `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
      );
      setListeActuelleTriee(medecinsTries);
    }
  }, [medecins]);

  const genererProchainTrimestre = () => {
    if (listeActuelleTriee.length === 0) {
      return;
    }

    // Utiliser TOUS les médecins de la base (pas de saisie manuelle)
    const nomsMedecins = listeActuelleTriee.map(m => `${m.nom} ${m.prenom}`);
    const total = nomsMedecins.length;
    const tailleTiers = Math.ceil(total / 3);

    // Division en 3 tiers
    const tiers1 = nomsMedecins.slice(0, tailleTiers);
    const tiers2 = nomsMedecins.slice(tailleTiers, tailleTiers * 2);
    const tiers3 = nomsMedecins.slice(tailleTiers * 2);

    // Rotation : tiers3 -> tiers1 -> tiers2 -> tiers3
    const nouvelleListe = [...tiers3, ...tiers1, ...tiers2];

    // Génération des deux tours
    const deuxiemeTour = [...nouvelleListe].reverse();

    const resultatGenere = {
      premierTour: nouvelleListe,
      deuxiemeTour: deuxiemeTour,
      stats: {
        totalMedecins: total,
        tailleTiers: tailleTiers
      },
      medecinsInclus: listeActuelleTriee
    };

    setResultat(resultatGenere);

    // Notifier le parent
    if (onListeGenere) {
      onListeGenere(resultatGenere);
    }
  };

  const formatListe = (liste) => {
    return liste.map((nom, index) => (
      <div key={index} style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.25rem 0.5rem',
        backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white'
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          color: '#6b7280',
          width: '2rem'
        }}>
          {index + 1}.
        </span>
        <span style={{
          flex: 1,
          marginLeft: '0.5rem'
        }}>
          {nom}
        </span>
      </div>
    ));
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '1.5rem',
        textAlign: 'center'
      }}>
        🔄 Générateur de Liste Trimestrielle
      </h2>

      {/* Liste automatique des médecins */}
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '1rem'
        }}>
          👥 Médecins détectés dans la base
        </h3>

        {listeActuelleTriee.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            {listeActuelleTriee.map((medecin, index) => (
              <div key={medecin.id} style={{
                padding: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}>
                <span style={{ fontWeight: '500' }}>
                  {index + 1}. {medecin.nom} {medecin.prenom}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
            Aucun médecin trouvé dans la base de données
          </p>
        )}

        <button
          onClick={genererProchainTrimestre}
          disabled={listeActuelleTriee.length === 0}
          style={{
            width: '100%',
            backgroundColor: listeActuelleTriee.length > 0 ? '#2563eb' : '#9ca3af',
            color: 'white',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: '500',
            cursor: listeActuelleTriee.length > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          🔄 Générer la liste trimestrielle ({listeActuelleTriee.length} médecins)
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>

        {/* Explication */}
        <div style={{
          backgroundColor: '#eff6ff',
          padding: '1rem',
          borderRadius: '0.5rem'
        }}>
          <h3 style={{
            fontWeight: 'bold',
            color: '#1e40af',
            marginBottom: '0.75rem'
          }}>
            🔍 Fonctionnement
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#1e40af'
          }}>
            <p><strong>1. Rotation par tiers :</strong> La liste est divisée en 3 parties égales</p>
            <p><strong>2. Avancement :</strong> Chaque tiers avance d'une position</p>
            <p><strong>3. Nouveaux :</strong> Ajoutés automatiquement en fin de liste</p>
            <p><strong>4. Équité :</strong> Tout le monde passe en tête tous les 3 trimestres</p>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '0.25rem',
            borderLeft: '4px solid #3b82f6'
          }}>
            <p style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              fontFamily: 'monospace'
            }}>
              Tiers 3 → Tiers 1<br/>
              Tiers 1 → Tiers 2<br/>
              Tiers 2 → Tiers 3
            </p>
          </div>
        </div>
      </div>

      {/* Résultats */}
      {resultat && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
          gap: '1.5rem'
        }}>
          {/* Premier tour */}
          <div style={{
            backgroundColor: '#ecfdf5',
            borderRadius: '0.5rem',
            padding: '1rem'
          }}>
            <h3 style={{
              fontWeight: 'bold',
              color: '#059669',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              🥇 Premier Tour
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 'normal'
              }}>
                ({resultat.premierTour.length} personnes)
              </span>
            </h3>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.25rem',
              border: '1px solid #e5e7eb',
              maxHeight: '24rem',
              overflowY: 'auto'
            }}>
              {formatListe(resultat.premierTour)}
            </div>

            <div style={{
              marginTop: '0.75rem',
              padding: '0.5rem',
              backgroundColor: '#e0f2fe',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
              color: '#0277bd'
            }}>
              <strong>✅ Tous les médecins inclus automatiquement</strong>
            </div>
          </div>

          {/* Deuxième tour */}
          <div style={{
            backgroundColor: '#fff7ed',
            borderRadius: '0.5rem',
            padding: '1rem'
          }}>
            <h3 style={{
              fontWeight: 'bold',
              color: '#ea580c',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              🥈 Deuxième Tour
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 'normal'
              }}>
                (ordre inversé)
              </span>
            </h3>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.25rem',
              border: '1px solid #e5e7eb',
              maxHeight: '24rem',
              overflowY: 'auto'
            }}>
              {formatListe(resultat.deuxiemeTour)}
            </div>
          </div>

          {/* Statistiques */}
          <div style={{
            gridColumn: window.innerWidth > 768 ? 'span 2' : 'span 1',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            padding: '1rem'
          }}>
            <h3 style={{
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.75rem'
            }}>
              📊 Statistiques
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              fontSize: '0.875rem'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '0.25rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#2563eb'
                }}>
                  {resultat.stats.totalMedecins}
                </div>
                <div style={{ color: '#6b7280' }}>Total médecins</div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '0.25rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#059669'
                }}>
                  100%
                </div>
                <div style={{ color: '#6b7280' }}>Médecins inclus</div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '0.25rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#7c3aed'
                }}>
                  {resultat.stats.tailleTiers}
                </div>
                <div style={{ color: '#6b7280' }}>Médecins par tiers</div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '0.25rem'
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#ea580c'
                }}>
                  ✓
                </div>
                <div style={{ color: '#6b7280' }}>Auto-généré</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateurTrimestre;