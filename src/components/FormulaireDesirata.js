// src/components/FormulaireDesirata.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  addDesiderata,
  getPeriodeSaisie,
  getDesiderataByUser,
  updateDesiderata
} from '../services/planningService';
import { exportMedecinDesiderataToExcel } from '../services/excelExportService';
import { estJourFerie } from '../utils/joursFeries';
import logger from '../utils/logger';
import {
  Save,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AppHeader, LoadingScreen, ErrorScreen, Alert, Button } from './ui';
import QuickFill from './QuickFill';
import WeeklyPattern from './WeeklyPattern';

const creneaux = [
  { id: 'QUART_1', label: '1er QUART', hours: '1h - 7h', medecins: 2 },
  { id: 'QUART_2', label: '2ème QUART', hours: '7h - 13h', medecins: 3 },
  { id: 'RENFORT_1', label: 'RENFORT', hours: '10h - 13h', medecins: 1, samediOnly: true },
  { id: 'QUART_3', label: '3ème QUART', hours: '13h - 19h', medecins: 3 },
  { id: 'RENFORT_2', label: 'RENFORT', hours: '20h - 00h', medecins: 1 },
  { id: 'QUART_4', label: '4ème QUART', hours: '19h - 1h', medecins: 3 }
];

const options = ['Oui', 'Possible', 'Non'];


function FormulaireDesirata() {
  // États
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [desiderata, setDesiderata] = useState({});
  const [nombreGardesSouhaitees, setNombreGardesSouhaitees] = useState(0);
  const [nombreGardesMaxParSemaine, setNombreGardesMaxParSemaine] = useState(3);
  const [gardesGroupees, setGardesGroupees] = useState(false);
  const [renfortsAssocies, setRenfortsAssocies] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingDesiderataId, setExistingDesiderataId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'success'|'error', message }

  const { profile } = useAuth();
  const user = profile;

  // Génération des dates avec correction de fuseau horaire
  const generateDates = useCallback(() => {
    if (!periodeSaisie) {return [];}
    const dates = [];
    const currentDate = new Date(periodeSaisie.startDate);
    
    // Définir l'heure à midi pour éviter les problèmes de changement de jour
    currentDate.setHours(12, 0, 0, 0);
    
    const end = new Date(periodeSaisie.endDate);
    end.setHours(12, 0, 0, 0);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [periodeSaisie]);

  // Effet pour charger les données initiales
  useEffect(() => {
    if (!profile) {return;}

    const fetchData = async () => {
      try {
        const periode = await getPeriodeSaisie();
        if (periode) {
          setPeriodeSaisie(periode);
          const userDesiderata = await getDesiderataByUser(profile.id);
          const relevantDesiderata = userDesiderata.find(d =>
            new Date(d.startDate) <= new Date(periode.endDate) &&
            new Date(d.endDate) >= new Date(periode.startDate)
          );

          if (relevantDesiderata) {
            setExistingDesiderataId(relevantDesiderata.id);
            setDesiderata(relevantDesiderata.desiderata || {});
            setNombreGardesSouhaitees(relevantDesiderata.nombreGardesSouhaitees || 0);
            setNombreGardesMaxParSemaine(relevantDesiderata.nombreGardesMaxParSemaine || 3);
            setGardesGroupees(relevantDesiderata.gardesGroupees || false);
            setRenfortsAssocies(relevantDesiderata.renfortsAssocies || false);
          }
        } else {
          setError('Aucune période de saisie n\'a été définie par l\'administrateur.');
        }
      } catch (error) {
        logger.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  // Masquage automatique du message de feedback après 5 secondes
  useEffect(() => {
    if (!feedback) {return undefined;}
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Gestion des changements de desiderata
  const handleDesiderataChange = (date, creneau, value) => {
    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      
      // Créer une copie profonde de l'objet pour la date
      if (!newDesiderata[date]) {
        newDesiderata[date] = {};
      }

      // Définir la nouvelle valeur pour ce créneau à cette date
      newDesiderata[date][creneau] = value;

      return newDesiderata;
    });
  };

  // Gestion du remplissage rapide
  const handleQuickFill = ({ creneaux: selectedCreneaux, jours: selectedJours, disponibilite, startDate, endDate }) => {
    const start = new Date(startDate);
    start.setHours(12, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(12, 0, 0, 0);
    
    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      const dates = generateDates().filter(date => {
        date.setHours(12, 0, 0, 0);
        return date >= start && date <= end;
      });

      dates.forEach(date => {
        // Utiliser getDay() de manière cohérente
        const dayOfWeek = date.getDay().toString();

        if (selectedJours.includes(dayOfWeek)) {
          const dateString = date.toISOString().split('T')[0];
          if (!newDesiderata[dateString]) {
            newDesiderata[dateString] = {};
          }

          selectedCreneaux.forEach(creneauId => {
            // Vérifier si c'est un samedi pour RENFORT_1
            if (creneauId !== 'RENFORT_1' || date.getDay() === 6) {
              newDesiderata[dateString][creneauId] = disponibilite;
            }
          });
        }
      });

      return newDesiderata;
    });
  };

  // Gestion du pattern hebdomadaire
  const handleApplyPattern = (pattern, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay().toString();
        const dateString = currentDate.toISOString().split('T')[0];

        if (pattern[dayOfWeek]) {
          newDesiderata[dateString] = { ...pattern[dayOfWeek] };
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return newDesiderata;
    });
  };

  // Affichage d'un message de feedback en haut du contenu principal
  const showFeedback = (kind, message) => {
    setFeedback({ kind, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user && !isSaving) {
      setIsSaving(true);
      try {
        if (!periodeSaisie || !periodeSaisie.startDate || !periodeSaisie.endDate) {
          throw new Error('Période de saisie non définie');
        }

        const desiderataData = {
          startDate: periodeSaisie.startDate,
          endDate: periodeSaisie.endDate,
          desiderata,
          nombreGardesSouhaitees,
          nombreGardesMaxParSemaine,
          gardesGroupees,
          renfortsAssocies
        };

        if (existingDesiderataId) {
          await updateDesiderata(existingDesiderataId, desiderataData);
          showFeedback('success', 'Desiderata mis à jour avec succès !');
        } else {
          const newId = await addDesiderata(user.id, desiderataData);
          if (newId) {
            setExistingDesiderataId(newId);
          }
          showFeedback('success', 'Desiderata soumis avec succès !');
        }
      } catch (error) {
        logger.error('Erreur lors de la soumission des desiderata:', error);
        showFeedback('error', 'Une erreur est survenue lors de la soumission des desiderata : ' + error.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Export Excel individuel
  const handleExportExcel = async () => {
    if (!user || !periodeSaisie) {return;}

    setIsExporting(true);
    setExportMessage('');

    try {
      // Préparer les données actuelles pour l'export
      const currentDesiderata = {
        userId: user.id,
        startDate: periodeSaisie.startDate,
        endDate: periodeSaisie.endDate,
        desiderata: desiderata,
        nombreGardesSouhaitees,
        nombreGardesMaxParSemaine,
        gardesGroupees,
        renfortsAssocies
      };

      const result = await exportMedecinDesiderataToExcel(user, currentDesiderata, periodeSaisie);
      setExportMessage(result.message);
      setTimeout(() => setExportMessage(''), 5000);
    } catch (error) {
      logger.error('Erreur lors de l\'export Excel:', error);
      setExportMessage('Erreur lors de l\'export Excel');
      setTimeout(() => setExportMessage(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Fonctions utilitaires
  const isWeekendOrHoliday = (date) => {
    const day = date.getDay();
    const formattedDate = date.toISOString().split('T')[0];
    return day === 0 || day === 6 || estJourFerie(formattedDate);
  };

  const formatDate = (date) => {
    const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    
    const dayOfWeek = days[date.getDay()];
    const dayOfMonth = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    
    return `${dayOfWeek} ${dayOfMonth} ${month}`;
  };

  // États de chargement et d'erreur
  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  const dates = generateDates();

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6', 
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Menu fixe en haut */}
      <AppHeader
        backTo="/dashboard-medecin"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              loading={isExporting}
              icon={<Download size={18} />}
              title="Exporter mes desiderata vers Excel"
            >
              {isExporting ? 'Export...' : 'Exporter Excel'}
            </Button>
            <Button
              variant="success"
              onClick={handleSubmit}
              loading={isSaving}
              icon={<Save size={18} />}
            >
              Enregistrer
            </Button>
          </>
        }
      />

      {/* Contenu principal */}
      <main style={{
        margin: '0 auto',
        paddingTop: '6rem',
        width: '100%',
        maxWidth: '1280px',
        boxSizing: 'border-box'
      }}>
        {/* Message de succès/erreur de sauvegarde */}
        {feedback && (
          <Alert kind={feedback.kind} className="mb-4">
            {feedback.message}
          </Alert>
        )}
        {/* Message de succès/erreur pour l'export */}
        {exportMessage && (
          <div style={{
            backgroundColor: exportMessage.includes('Erreur') ? '#FEE2E2' : '#F0FDF4',
            border: `1px solid ${exportMessage.includes('Erreur') ? '#FECACA' : '#D1FAE5'}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            color: exportMessage.includes('Erreur') ? '#DC2626' : '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Download size={20} />
            {exportMessage}
          </div>
        )}
        {/* En-tête avec période */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1F2937',
            marginBottom: '1rem'
          }}>
            Période de saisie : du {new Date(periodeSaisie.startDate).toLocaleDateString()} au {new Date(periodeSaisie.endDate).toLocaleDateString()}
          </h2>

          {/* Préférences générales */}
          <div style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Nombre de gardes souhaitées par mois
              </label>
              <input
                type="number"
                value={nombreGardesSouhaitees}
                onChange={(e) => setNombreGardesSouhaitees(parseInt(e.target.value))}
                min="0"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Maximum de gardes par semaine
              </label>
              <input
                type="number"
                value={nombreGardesMaxParSemaine}
                onChange={(e) => setNombreGardesMaxParSemaine(parseInt(e.target.value))}
                min="1"
                max="7"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <input
                type="checkbox"
                id="gardesGroupees"
                checked={gardesGroupees}
                onChange={(e) => setGardesGroupees(e.target.checked)}
                style={{
                  width: '1rem',
                  height: '1rem',
                  borderRadius: '0.25rem',
                  borderColor: '#D1D5DB'
                }}
              />
              <label
                htmlFor="gardesGroupees"
                style={{
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
              >
                Gardes groupées dans un même week-end
              </label>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <input
                type="checkbox"
                id="renfortsAssocies"
                checked={renfortsAssocies}
                onChange={(e) => setRenfortsAssocies(e.target.checked)}
                style={{
                  width: '1rem',
                  height: '1rem',
                  borderRadius: '0.25rem',
                  borderColor: '#D1D5DB'
                }}
              />
              <label
                htmlFor="renfortsAssocies"
                style={{
                  fontSize: '0.875rem',
                  color: '#374151'
                }}
              >
                Renforts associés à une garde
              </label>
            </div>
          </div>
        </div>

        {/* Outils de remplissage */}
        <div style={{
          display: 'grid',
          gap: '2rem',
          marginBottom: '2rem',
          gridTemplateColumns: '1fr',
          padding: '0 1rem',
          maxWidth: '100%',
          boxSizing: 'border-box',
          margin: '0 auto 2rem'
        }}>
          <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <QuickFill
              creneaux={creneaux}
              onApply={handleQuickFill}
              periodeSaisie={periodeSaisie}
            />
          </div>

          <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <WeeklyPattern
              creneaux={creneaux}
              onApplyPattern={handleApplyPattern}
              periodeSaisie={periodeSaisie}
            />
          </div>
        </div>

        {/* Tableau des desiderata */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem'
          }}>
            <thead>
              <tr>
                <th style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  borderBottom: '1px solid #E5E7EB',
                  textAlign: 'left',
                  fontWeight: '600',
                  position: 'sticky',
                  left: 0,
                  zIndex: 10
                }}>
                  Date
                </th>
                {creneaux.map(creneau => (
                  <th key={creneau.id} style={{
                    padding: '0.75rem',
                    backgroundColor: '#F3F4F6',
                    borderBottom: '1px solid #E5E7EB',
                    textAlign: 'left',
                    fontWeight: '600',
                    minWidth: '150px'
                  }}>
                    <div>{creneau.label}</div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6B7280',
                      fontWeight: 'normal'
                    }}>
                      {creneau.hours}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6B7280',
                      fontWeight: 'normal'
                    }}>
                      {creneau.medecins} médecin{creneau.medecins > 1 ? 's' : ''}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map(date => {
                const isHighlighted = isWeekendOrHoliday(date);
                const dateString = date.toISOString().split('T')[0];
                return (
                  <tr key={dateString} style={{
                    backgroundColor: isHighlighted ? '#F3F4F6' : 'white'
                  }}>
                    <td style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid #E5E7EB',
                      fontWeight: '500',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: isHighlighted ? '#F3F4F6' : 'white',
                      zIndex: 10
                    }}>
                      {formatDate(date)}
                    </td>
                    {creneaux.map(creneau => (
                      <td key={`${dateString}-${creneau.id}`} style={{
                        padding: '0.75rem',
                        borderBottom: '1px solid #E5E7EB'
                      }}>
                        {(!creneau.samediOnly || date.getDay() === 6) && (
                          <select
                            value={desiderata[dateString]?.[creneau.id] || ''}
                            onChange={(e) => handleDesiderataChange(dateString, creneau.id, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem',
                              backgroundColor: 'white',
                              color: (() => {
                                const value = desiderata[dateString]?.[creneau.id];
                                switch(value) {
                                case 'Oui': return '#059669';
                                case 'Possible': return '#D97706';
                                case 'Non': return '#DC2626';
                                default: return '#6B7280';
                                }
                              })()
                            }}
                          >
                            <option value="">Sélectionnez</option>
                            {options.map(option => (
                              <option 
                                key={option} 
                                value={option}
                              >
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default FormulaireDesirata;