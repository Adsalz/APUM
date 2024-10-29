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
    
    if (!planning || !planning.planning) return 0;
    
    Object.values(planning.planning).forEach(joursCreneaux => {
      Object.values(joursCreneaux).forEach(medecins => {
        if (medecins.includes(medecinId)) count++;
      });
    });
    
    return count;
  };
  
  export const getMedecinPreference = (desiderata, medecinId, date, creneauId) => {
    return desiderata
      .find(d => d.userId === medecinId)?.desiderata[date]?.[creneauId] || '';
  };
  
  export const getNombreGardesSouhaitees = (desiderata, medecinId) => {
    const medecinDesiderata = desiderata.find(d => d.userId === medecinId);
    return medecinDesiderata?.nombreGardesSouhaitees || 0;
  };