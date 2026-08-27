// src/components/desiderata/useDesiderataForm.js
// Logique partagée des deux écrans de saisie de desiderata (médecin & admin) :
// état de la grille + préférences, suivi des modifications non enregistrées,
// et handlers de remplissage. La couche présentation (tableau, préférences) et
// les spécificités d'écran (chargement, toasts, navigation) restent dans les
// composants appelants.
import { useState, useCallback } from 'react';

// ── Validation des préférences générales (pure, partagée médecin/admin) ──────
// « Gardes souhaitées par mois » est OBLIGATOIRE et ≥ 1 (décision du 27/08/2026) :
// pour le générateur, un 0 signifie « sans limite », ce qu'aucun médecin ne veut
// dire ; la coordinatrice connaît le vrai nombre de chacun, la fiche doit le porter.
export const erreurGardesSouhaitees = (valeur) => {
  const n = Number(valeur);
  if (valeur === '' || valeur === null || valeur === undefined || Number.isNaN(n)) {
    return 'Indiquez le nombre de gardes souhaitées par mois.';
  }
  if (!Number.isInteger(n) || n < 1) {
    return 'Au moins 1 garde par mois — 0 n\'est pas accepté.';
  }
  return null;
};

export const erreurMaxParSemaine = (valeur) => {
  const n = Number(valeur);
  if (!Number.isInteger(n) || n < 1 || n > 7) {
    return 'Le maximum de gardes par semaine doit être entre 1 et 7.';
  }
  return null;
};

// Première erreur trouvée, ou null si les préférences sont valides.
export const erreurPreferences = ({ nombreGardesSouhaitees, nombreGardesMaxParSemaine }) =>
  erreurGardesSouhaitees(nombreGardesSouhaitees) || erreurMaxParSemaine(nombreGardesMaxParSemaine);

export default function useDesiderataForm(periodeSaisie) {
  const [desiderata, setDesiderata] = useState({});
  // Vide tant que le médecin n'a rien saisi : le champ est obligatoire.
  const [nombreGardesSouhaitees, setNombreGardesSouhaitees] = useState('');
  // Passe à true à la première tentative d'envoi : les champs vides s'affichent alors en erreur.
  const [tentativeEnvoi, setTentativeEnvoi] = useState(false);
  const [nombreGardesMaxParSemaine, setNombreGardesMaxParSemaine] = useState(3);
  const [gardesGroupees, setGardesGroupees] = useState(false);
  const [renfortsAssocies, setRenfortsAssocies] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Liste des jours de la période (heure fixée à midi pour éviter les décalages).
  const generateDates = useCallback(() => {
    if (!periodeSaisie) { return []; }
    const dates = [];
    const currentDate = new Date(periodeSaisie.startDate);
    currentDate.setHours(12, 0, 0, 0);
    const end = new Date(periodeSaisie.endDate);
    end.setHours(12, 0, 0, 0);
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [periodeSaisie]);

  const handleDesiderataChange = useCallback((date, creneau, value) => {
    setIsDirty(true);
    setDesiderata((prev) => {
      const next = { ...prev };
      if (!next[date]) { next[date] = {}; }
      next[date][creneau] = value;
      return next;
    });
  }, []);

  const handleQuickFill = useCallback(
    ({ creneaux: selectedCreneaux, jours: selectedJours, disponibilite, startDate, endDate }) => {
      setIsDirty(true);
      const start = new Date(startDate);
      start.setHours(12, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(12, 0, 0, 0);

      setDesiderata((prev) => {
        const next = { ...prev };
        const dates = generateDates().filter((date) => {
          date.setHours(12, 0, 0, 0);
          return date >= start && date <= end;
        });
        dates.forEach((date) => {
          const dayOfWeek = date.getDay().toString();
          if (selectedJours.includes(dayOfWeek)) {
            const dateString = date.toISOString().split('T')[0];
            if (!next[dateString]) { next[dateString] = {}; }
            selectedCreneaux.forEach((creneauId) => {
              if (creneauId !== 'RENFORT_1' || date.getDay() === 6) {
                next[dateString][creneauId] = disponibilite;
              }
            });
          }
        });
        return next;
      });
    },
    [generateDates]
  );

  const handleApplyPattern = useCallback((pattern, startDate, endDate) => {
    setIsDirty(true);
    // Heure fixée à midi (comme generateDates) : neutralise le passage heure
    // d'été↔hiver quand la date devient une clé 'YYYY-MM-DD' via toISOString.
    const start = new Date(startDate);
    start.setHours(12, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(12, 0, 0, 0);
    setDesiderata((prev) => {
      const next = { ...prev };
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay().toString();
        const dateString = currentDate.toISOString().split('T')[0];
        if (pattern[dayOfWeek]) {
          next[dateString] = { ...pattern[dayOfWeek] };
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return next;
    });
  }, []);

  // Modification d'une préférence générale (marque le formulaire modifié).
  const setPreference = useCallback((patch) => {
    setIsDirty(true);
    if ('nombreGardesSouhaitees' in patch) { setNombreGardesSouhaitees(patch.nombreGardesSouhaitees); }
    if ('nombreGardesMaxParSemaine' in patch) { setNombreGardesMaxParSemaine(patch.nombreGardesMaxParSemaine); }
    if ('gardesGroupees' in patch) { setGardesGroupees(patch.gardesGroupees); }
    if ('renfortsAssocies' in patch) { setRenfortsAssocies(patch.renfortsAssocies); }
  }, []);

  // Charge des données existantes. markDirty=false pour un chargement serveur
  // (rien à sauvegarder), true pour un import de fichier (à enregistrer).
  const hydrate = useCallback((data, markDirty = false) => {
    setDesiderata(data?.desiderata || {});
    // Un 0 enregistré autrefois s'affiche vide : il faudra le renseigner pour réenregistrer.
    setNombreGardesSouhaitees(data?.nombreGardesSouhaitees || '');
    setTentativeEnvoi(false);
    setNombreGardesMaxParSemaine(data?.nombreGardesMaxParSemaine || 3);
    setGardesGroupees(data?.gardesGroupees || false);
    setRenfortsAssocies(data?.renfortsAssocies || false);
    setIsDirty(markDirty);
  }, []);

  const reset = useCallback(() => hydrate(null, false), [hydrate]);

  // Valide les préférences avant envoi ; renvoie le message d'erreur ou null.
  const validerPreferences = useCallback(() => {
    setTentativeEnvoi(true);
    return erreurPreferences({ nombreGardesSouhaitees, nombreGardesMaxParSemaine });
  }, [nombreGardesSouhaitees, nombreGardesMaxParSemaine]);

  const buildPayload = useCallback(
    () => ({
      startDate: periodeSaisie?.startDate,
      endDate: periodeSaisie?.endDate,
      desiderata,
      nombreGardesSouhaitees: Number(nombreGardesSouhaitees),
      nombreGardesMaxParSemaine,
      gardesGroupees,
      renfortsAssocies,
    }),
    [periodeSaisie, desiderata, nombreGardesSouhaitees, nombreGardesMaxParSemaine, gardesGroupees, renfortsAssocies]
  );

  const filledCount = Object.values(desiderata).reduce(
    (acc, day) => acc + Object.values(day || {}).filter(Boolean).length,
    0
  );

  return {
    desiderata,
    preferences: { nombreGardesSouhaitees, nombreGardesMaxParSemaine, gardesGroupees, renfortsAssocies },
    tentativeEnvoi,
    validerPreferences,
    isDirty,
    setIsDirty,
    filledCount,
    generateDates,
    handleDesiderataChange,
    handleQuickFill,
    handleApplyPattern,
    setPreference,
    hydrate,
    reset,
    buildPayload,
  };
}
