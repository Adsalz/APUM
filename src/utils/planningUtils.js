// src/utils/planningUtils.js

export const sortMedecinsByPreference = (medecins, desiderata, date, creneauId) => {
  // Organise les médecins par leurs préférences pour un créneau donné
  const sorted = {
    oui: [],
    possible: [],
    nonSpecifie: [],
    non: []
  };
  
  medecins.forEach(medecin => {
    const preference = desiderata
      .find(d => d.userId === medecin.id)?.desiderata[date]?.[creneauId];
  
    switch(preference) {
    case 'Oui':
      sorted.oui.push(medecin);
      break;
    case 'Possible':
      sorted.possible.push(medecin);
      break;
    case 'Non':
      sorted.non.push(medecin);
      break;
    default:
      sorted.nonSpecifie.push(medecin);
    }
  });
  
  return {
    ...sorted,
    all: [
      ...sorted.oui,
      ...sorted.possible,
      ...sorted.nonSpecifie,
      ...sorted.non
    ]
  };
};
  
export const getPreferenceStyle = (preference) => {
  switch(preference) {
  case 'Oui':
    return { color: '#059669', backgroundColor: '#ECFDF5' };
  case 'Possible':
    return { color: '#D97706', backgroundColor: '#FFFBEB' };
  case 'Non':
    return { color: '#DC2626', backgroundColor: '#FEF2F2' };
  default:
    return { color: '#6B7280', backgroundColor: 'transparent' };
  }
};
  
export const compterGardesParMedecin = (planning, medecinId) => {
  let count = 0;
    
  if (!planning || !planning.planning) {return 0;}
    
  Object.values(planning.planning).forEach(joursCreneaux => {
    Object.values(joursCreneaux).forEach(medecins => {
      if (medecins.includes(medecinId)) {count++;}
    });
  });
    
  return count;
};
  
// Nombre de gardes attribuées PAR MOIS et PAR MÉDECIN dans le planning courant.
// Renvoie { 'YYYY-MM': { medecinId: nombre } }. Sert la jauge d'édition (le souhait
// « gardes souhaitées » étant mensuel, on compare au compte du mois du jour édité).
export const compterGardesMoisParMedecin = (planning) => {
  const parMois = {};
  if (!planning || !planning.planning) { return parMois; }

  Object.entries(planning.planning).forEach(([date, joursCreneaux]) => {
    const mois = date.slice(0, 7);
    if (!parMois[mois]) { parMois[mois] = {}; }
    Object.values(joursCreneaux).forEach(medecins => {
      medecins.forEach(medecinId => {
        if (medecinId) {
          parMois[mois][medecinId] = (parMois[mois][medecinId] || 0) + 1;
        }
      });
    });
  });

  return parMois;
};

export const getMedecinPreference = (desiderata, medecinId, date, creneauId) => {
  return desiderata
    .find(d => d.userId === medecinId)?.desiderata[date]?.[creneauId] || '';
};
  
export const getNombreGardesSouhaitees = (desiderata, medecinId) => {
  const medecinDesiderata = desiderata.find(d => d.userId === medecinId);
  return medecinDesiderata?.nombreGardesSouhaitees || 0;
};