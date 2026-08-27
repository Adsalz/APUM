// src/utils/periodeId.js
// Identité d'un trimestre APUM.
//
// Deux besoins distincts :
//   - `idPeriode`      : clé TECHNIQUE, stable et triable (« 2026-08 »), utilisée
//                        comme identifiant de document Firestore. Elle ne dépend
//                        que du mois de début, donc elle ne bouge pas si l'admin
//                        rectifie la date de fin d'un jour ou deux.
//   - `libellePeriode` : étiquette HUMAINE au format APUM (« ASO26 »,
//                        « NDJ25-26 »), telle qu'elle apparaît sur les listes de
//                        Bettina Bedrossian. Purement décorative.
//
// L'id sert à figer l'ordre de choix PAR TRIMESTRE : tant que la période de
// saisie ne change pas, régénérer le tableau relit la même liste au lieu d'en
// fabriquer une nouvelle (cf. src/services/ordreChoixService.js).

const INITIALES_MOIS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const toDate = (valeur) => {
  if (!valeur) { return null; }
  const d = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d;
};

// « 2026-08 » — null si la période n'est pas exploitable.
export const idPeriode = (periode) => {
  const debut = toDate(periode?.startDate);
  if (!debut) { return null; }
  return `${debut.getFullYear()}-${String(debut.getMonth() + 1).padStart(2, '0')}`;
};

// « ASO26 » (même année) ou « NDJ25-26 » (à cheval sur deux années).
export const libellePeriode = (periode) => {
  const debut = toDate(periode?.startDate);
  const fin = toDate(periode?.endDate);
  if (!debut) { return ''; }

  const finEffective = fin && fin >= debut ? fin : debut;
  const nbMois = Math.min(
    12,
    (finEffective.getFullYear() - debut.getFullYear()) * 12 + (finEffective.getMonth() - debut.getMonth()) + 1
  );

  let initiales = '';
  for (let i = 0; i < nbMois; i++) {
    initiales += INITIALES_MOIS[(debut.getMonth() + i) % 12];
  }

  const anneeDebut = String(debut.getFullYear()).slice(-2);
  const anneeFin = String(finEffective.getFullYear()).slice(-2);
  return anneeDebut === anneeFin ? `${initiales}${anneeDebut}` : `${initiales}${anneeDebut}-${anneeFin}`;
};
