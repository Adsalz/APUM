// src/utils/modificationDesiderata.js
// Date de dernière modification d'une fiche de desiderata, telle que l'admin
// la lit (champs modifieLe / modifiePar posés par planningService).

const FUSEAU = 'Europe/Paris';

// « le 4 octobre à 13:29 », suivi de « par l'admin » quand la fiche a été
// écrite par quelqu'un d'autre que le médecin (report d'une fiche reçue par
// mail, changement accordé après la clôture). Heure de Paris quel que soit le
// poste. null pour une fiche sans date.
export const libelleModification = (fiche) => {
  if (!fiche || !fiche.modifieLe) { return null; }
  const instant = new Date(fiche.modifieLe);
  if (Number.isNaN(instant.getTime())) { return null; }
  const jour = instant.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: FUSEAU })
    .replace(/^1 /, '1er ');
  const heure = instant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: FUSEAU });
  const parAdmin = fiche.modifiePar && fiche.modifiePar !== fiche.userId ? ' par l’admin' : '';
  return `le ${jour} à ${heure}${parAdmin}`;
};
