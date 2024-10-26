// src/components/FormulaireDesirata.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { getUser } from '../services/userService';
import { addDesiderata, getPeriodeSaisie, getDesiderataByUser, updateDesiderata } from '../services/planningService';
import MultiSelect from './MultiSelect';

const creneaux = [
  { id: 'QUART_1', label: '1er QUART (1h - 7h)', medecins: 2 },
  { id: 'QUART_2', label: '2ème QUART (7h - 13h)', medecins: 3 },
  { id: 'RENFORT_1', label: 'RENFORT 10h / 13h', medecins: 1, samediOnly: true },
  { id: 'QUART_3', label: '3ème QUART (13h - 19h)', medecins: 3 },
  { id: 'RENFORT_2', label: 'RENFORT 20H / 00H', medecins: 1 },
  { id: 'QUART_4', label: '4ème QUART (19h - 1h)', medecins: 3 },
];

const joursMap = [
  { id: '0', label: 'Dimanche' },
  { id: '1', label: 'Lundi' },
  { id: '2', label: 'Mardi' },
  { id: '3', label: 'Mercredi' },
  { id: '4', label: 'Jeudi' },
  { id: '5', label: 'Vendredi' },
  { id: '6', label: 'Samedi' }
];

const options = ['Oui', 'Non', 'Possible'];

const joursFeries = [
  '2024-01-01', '2024-04-01', '2024-05-01', '2024-05-08', '2024-05-09',
  '2024-05-20', '2024-07-14', '2024-08-15', '2024-11-01', '2024-11-11', '2024-12-25'
];

function FormulaireDesirata() {
  // États de base
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [desiderata, setDesiderata] = useState({});
  const [nombreGardesSouhaitees, setNombreGardesSouhaitees] = useState(0);
  const [nombreGardesMaxParSemaine, setNombreGardesMaxParSemaine] = useState(3);
  const [gardesGroupees, setGardesGroupees] = useState(false);
  const [renfortsAssocies, setRenfortsAssocies] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingDesiderataId, setExistingDesiderataId] = useState(null);

  // États pour le remplissage rapide
  const [isQuickFillVisible, setIsQuickFillVisible] = useState(false);
  const [selectedCreneaux, setSelectedCreneaux] = useState({});
  const [selectedJours, setSelectedJours] = useState({});
  const [selectedDispo, setSelectedDispo] = useState('');
  const [quickFillStartDate, setQuickFillStartDate] = useState('');
  const [quickFillEndDate, setQuickFillEndDate] = useState('');

  // États pour la copie de semaine
  const [isCopyWeekVisible, setIsCopyWeekVisible] = useState(false);
  const [copyStartDate, setCopyStartDate] = useState('');
  const [copyEndDate, setCopyEndDate] = useState('');
  const [copyTargetStartDate, setCopyTargetStartDate] = useState('');
  const [copyTargetEndDate, setCopyTargetEndDate] = useState('');

  const history = useHistory();

  const generateDates = useCallback(() => {
    if (!periodeSaisie) return [];
    const dates = [];
    let currentDate = new Date(periodeSaisie.startDate);
    const end = new Date(periodeSaisie.endDate);
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [periodeSaisie]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authUser = auth.currentUser;
        if (!authUser) {
          history.push('/');
          return;
        }

        const userData = await getUser(authUser.uid);
        if (userData && userData.role === 'medecin') {
          setUser(userData);
          const periode = await getPeriodeSaisie();
          if (periode) {
            setPeriodeSaisie(periode);
            const userDesiderata = await getDesiderataByUser(userData.id);
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
        } else {
          setError('Utilisateur non autorisé');
          history.push('/');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [history]);

  const handleDesiderataChange = (date, creneau, value) => {
    setDesiderata(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [creneau]: value
      }
    }));
  };

  const handleSelectFullPeriod = () => {
    if (periodeSaisie) {
      setQuickFillStartDate(new Date(periodeSaisie.startDate).toISOString().split('T')[0]);
      setQuickFillEndDate(new Date(periodeSaisie.endDate).toISOString().split('T')[0]);
    }
  };

  const handleQuickFill = () => {
    if (!selectedDispo) {
      alert('Veuillez sélectionner une disponibilité.');
      return;
    }

    if (!quickFillStartDate || !quickFillEndDate) {
      alert('Veuillez sélectionner une période pour le remplissage rapide.');
      return;
    }

    const selectedCreneauxArray = Object.entries(selectedCreneaux)
      .filter(([_, isSelected]) => isSelected)
      .map(([creneauId]) => creneauId);

    const selectedJoursArray = Object.entries(selectedJours)
      .filter(([_, isSelected]) => isSelected)
      .map(([jourId]) => jourId);

    if (selectedCreneauxArray.length === 0) {
      alert('Veuillez sélectionner au moins un créneau.');
      return;
    }

    if (selectedJoursArray.length === 0) {
      alert('Veuillez sélectionner au moins un jour.');
      return;
    }

    const startDate = new Date(quickFillStartDate);
    const endDate = new Date(quickFillEndDate);

    if (startDate > endDate) {
      alert('La date de début doit être antérieure à la date de fin.');
      return;
    }

    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      const dates = generateDates().filter(date => 
        date >= startDate && 
        date <= endDate
      );

      dates.forEach(date => {
        if (selectedJoursArray.includes(date.getDay().toString())) {
          const dateString = date.toISOString().split('T')[0];
          if (!newDesiderata[dateString]) {
            newDesiderata[dateString] = {};
          }
          selectedCreneauxArray.forEach(creneauId => {
            if (creneauId !== 'RENFORT_1' || date.getDay() === 6) {
              newDesiderata[dateString][creneauId] = selectedDispo;
            }
          });
        }
      });

      return newDesiderata;
    });

    alert('Les créneaux ont été remplis avec succès !');
  };

  const handleCopyWeek = () => {
    if (!copyStartDate || !copyEndDate || !copyTargetStartDate || !copyTargetEndDate) {
      alert('Veuillez sélectionner toutes les dates nécessaires.');
      return;
    }

    const startDate = new Date(copyStartDate);
    const endDate = new Date(copyEndDate);
    const targetStart = new Date(copyTargetStartDate);
    const targetEnd = new Date(copyTargetEndDate);

    if (startDate > endDate || targetStart > targetEnd) {
      alert('Les dates de début doivent être antérieures aux dates de fin.');
      return;
    }

    setDesiderata(prev => {
      const newDesiderata = { ...prev };
      const pattern = {};

      // Extraire le pattern de la semaine source
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (prev[dateStr]) {
          pattern[d.getDay()] = prev[dateStr];
        }
      }

      // Appliquer le pattern sur la période cible
      let currentDate = new Date(targetStart);
      while (currentDate <= targetEnd) {
        const patternDay = pattern[currentDate.getDay()];
        if (patternDay) {
          const dateStr = currentDate.toISOString().split('T')[0];
          newDesiderata[dateStr] = { ...patternDay };
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return newDesiderata;
    });

    alert('Le pattern a été copié avec succès !');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user) {
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
          alert('Desiderata mis à jour avec succès!');
        } else {
          await addDesiderata(user.id, desiderataData);
          alert('Desiderata soumis avec succès!');
        }
        history.push('/dashboard-medecin');
      } catch (error) {
        console.error("Erreur lors de la soumission des desiderata:", error);
        setError('Une erreur est survenue lors de la soumission des desiderata: ' + error.message);
      }
    }
  };

  const isWeekendOrHoliday = (date) => {
    const day = date.getDay();
    const formattedDate = date.toISOString().split('T')[0];
    return day === 0 || day === 6 || joursFeries.includes(formattedDate);
  };

  const formatDate = (date) => {
    const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    
    const dayOfWeek = days[date.getDay()];
    const dayOfMonth = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    
    return `${dayOfWeek} ${dayOfMonth} ${month}`;
  };

  if (loading) return <div className="loading">Chargement...</div>;
  if (error) return <div className="error-message">Erreur: {error}</div>;
  if (!user || !periodeSaisie) return <div className="error-message">Utilisateur non trouvé ou période de saisie non définie</div>;

  const dates = generateDates();

  return (
    <div className="formulaire-container">
      <h1 className="page-title">Formulaire de Desiderata</h1>
      <Link to="/dashboard-medecin" className="back-link">Retour au tableau de bord</Link>
      
      <form onSubmit={handleSubmit} className="desiderata-form">
        <h2 className="section-title">
          Période de saisie: du {new Date(periodeSaisie.startDate).toLocaleDateString()} 
          au {new Date(periodeSaisie.endDate).toLocaleDateString()}
        </h2>
        
        <div className="form-group">
          <label htmlFor="nombreGardes">Nombre de gardes souhaitées par mois:</label>
          <input
            type="number"
            id="nombreGardes"
            value={nombreGardesSouhaitees}
            onChange={(e) => setNombreGardesSouhaitees(parseInt(e.target.value))}
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="nombreGardesMaxParSemaine">
            Nombre maximum de gardes par semaine:
          </label>
          <input
            type="number"
            id="nombreGardesMaxParSemaine"
            value={nombreGardesMaxParSemaine}
            onChange={(e) => setNombreGardesMaxParSemaine(parseInt(e.target.value))}
            min="1"
            max="7"
            required
          />
        </div>
        
        <div className="option-group">
          <label className="switch">
            <input
              type="checkbox"
              checked={gardesGroupees}
              onChange={(e) => setGardesGroupees(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span>Gardes groupées dans un même week-end</span>
        </div>
        
        <div className="option-group">
          <label className="switch">
            <input
              type="checkbox"
              checked={renfortsAssocies}
              onChange={(e) => setRenfortsAssocies(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span>Renforts associés à une garde</span>
        </div>

        <div className="quick-fill-section">
          <button 
            type="button" 
            className="toggle-quick-fill"
            onClick={() => setIsQuickFillVisible(!isQuickFillVisible)}
          >
            {isQuickFillVisible ? '▼ Masquer le remplissage rapide' : '▶ Afficher le remplissage rapide'}
          </button>

          <div className={`quick-fill-module ${isQuickFillVisible ? 'visible' : ''}`}>
            <div className="date-range-container">
              <div>
                <label>Période de remplissage:</label>
                <div className="date-inputs">
                  <div>
                    <label htmlFor="quickFillStartDate">Du:</label>
                    <input
                      type="date"
                      id="quickFillStartDate"
                      value={quickFillStartDate}
                      onChange={(e) => setQuickFillStartDate(e.target.value)}
                      min={periodeSaisie?.startDate.split('T')[0]}
                      max={periodeSaisie?.endDate.split('T')[0]}
                    />
                  </div>
                  <div>
                    <label htmlFor="quickFillEndDate">Au:</label>
                    <input
                      type="date"
                      id="quickFillEndDate"
                      value={quickFillEndDate}
                      onChange={(e) => setQuickFillEndDate(e.target.value)}
                      min={periodeSaisie?.startDate.split('T')[0]}
                      max={periodeSaisie?.endDate.split('T')[0]}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="select-full-period"
                    onClick={handleSelectFullPeriod}
                  >
                    Toute la période
                  </button>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>Créneaux:</label>
              <MultiSelect
                options={creneaux}
                value={selectedCreneaux}
                onChange={setSelectedCreneaux}
                placeholder="Sélectionnez les créneaux"
              />
            </div>

            <div className="form-group">
              <label>Jours de la semaine:</label>
              <MultiSelect
                options={joursMap}
                value={selectedJours}
                onChange={setSelectedJours}
                placeholder="Sélectionnez les jours"
              />
            </div>

            <div className="form-group">
              <label htmlFor="selectedDispo">Disponibilité:</label>
              <select
                id="selectedDispo"
                value={selectedDispo}
                onChange={(e) => setSelectedDispo(e.target.value)}
              >
                <option value="">Sélectionnez une disponibilité</option>
                {options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <button type="button" onClick={handleQuickFill} className="fill-button">
              Remplir les créneaux sélectionnés
            </button>
          </div>
        </div>

        <div className="copy-week-section">
          <button 
            type="button" 
            className="toggle-copy-week"
            onClick={() => setIsCopyWeekVisible(!isCopyWeekVisible)}
          >
            {isCopyWeekVisible ? '▼ Masquer la copie de semaine' : '▶ Afficher la copie de semaine'}
          </button>

          <div className={`copy-week-module ${isCopyWeekVisible ? 'visible' : ''}`}>
            <div className="date-range-container">
              <div>
                <h4>Semaine à copier :</h4>
                <div className="date-inputs">
                  <div>
                    <label htmlFor="copyStartDate">Du:</label>
                    <input
                      type="date"
                      id="copyStartDate"
                      value={copyStartDate}
                      onChange={(e) => setCopyStartDate(e.target.value)}
                      min={periodeSaisie?.startDate.split('T')[0]}
                      max={periodeSaisie?.endDate.split('T')[0]}
                    />
                  </div>
                  <div>
                    <label htmlFor="copyEndDate">Au:</label>
                    <input
                      type="date"
                      id="copyEndDate"
                      value={copyEndDate}
                      onChange={(e) => setCopyEndDate(e.target.value)}
                      min={periodeSaisie?.startDate.split('T')[0]}
                      max={periodeSaisie?.endDate.split('T')[0]}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h4>Appliquer sur la période :</h4>
                <div className="date-inputs">
                  <div>
                    <label htmlFor="copyTargetStartDate">Du:</label>
                    <input
                      type="date"
                      id="copyTargetStartDate"
                      value={copyTargetStartDate}
                      onChange={(e) => setCopyTargetStartDate(e.target.value)}
                      min={periodeSaisie?.startDate.split('T')[0]}
                      max={periodeSaisie?.endDate.split('T')[0]}
                    />
                  </div>
                  <div>
                    <label htmlFor="copyTargetEndDate">Au:</label>
                    <input
                      type="date"
                      id="copyTargetEndDate"
                      value={copyTargetEndDate}
                      onChange={(e) => setCopyTargetEndDate(e.target.value)}
                      min={periodeSaisie?.startDate.split('T')[0]}
                      max={periodeSaisie?.endDate.split('T')[0]}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button type="button" onClick={handleCopyWeek} className="copy-button">
              Copier le pattern
            </button>
          </div>
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {creneaux.map(creneau => (
                  <th key={creneau.id}>{creneau.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map(date => {
                const isHighlighted = isWeekendOrHoliday(date);
                const dateString = date.toISOString().split('T')[0];
                return (
                  <tr key={dateString} className={isHighlighted ? 'highlighted' : ''}>
                    <td>{formatDate(date)}</td>
                    {creneaux.map(creneau => (
                      <td key={`${dateString}-${creneau.id}`}>
                        {(!creneau.samediOnly || date.getDay() === 6) && (
                          <select
                            value={desiderata[dateString]?.[creneau.id] || ''}
                            onChange={(e) => handleDesiderataChange(dateString, creneau.id, e.target.value)}
                          >
                            <option value="">Sélectionnez</option>
                            {options.map(option => (
                              <option key={option} value={option}>{option}</option>
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
        
        <button type="submit" className="submit-button">
          {existingDesiderataId ? 'Mettre à jour les desiderata' : 'Soumettre les desiderata'}
        </button>
      </form>
    </div>
  );
}

export default FormulaireDesirata;