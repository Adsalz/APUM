// src/utils/joursFeries.js
// Calcul des jours fériés français pour n'importe quelle année.
// Remplace la liste codée en dur (limitée à 2024) qui faisait que les
// fériés de 2025+ n'étaient plus détectés dans les formulaires.

// Algorithme de Meeus/Jones/Butcher : date du dimanche de Pâques
function getPaques(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = mars, 4 = avril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUTC(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

const cache = new Map();

/**
 * Retourne la liste des jours fériés français d'une année,
 * au format 'YYYY-MM-DD'.
 */
export function getJoursFeries(year) {
  if (cache.has(year)) {
    return cache.get(year);
  }

  const paques = getPaques(year);
  const feries = [
    `${year}-01-01`, // Jour de l'an
    formatUTC(addDays(paques, 1)), // Lundi de Pâques
    `${year}-05-01`, // Fête du Travail
    `${year}-05-08`, // Victoire 1945
    formatUTC(addDays(paques, 39)), // Ascension
    formatUTC(addDays(paques, 50)), // Lundi de Pentecôte
    `${year}-07-14`, // Fête nationale
    `${year}-08-15`, // Assomption
    `${year}-11-01`, // Toussaint
    `${year}-11-11`, // Armistice 1918
    `${year}-12-25`, // Noël
  ];

  cache.set(year, feries);
  return feries;
}

/**
 * Indique si une date (au format 'YYYY-MM-DD') est un jour férié français.
 */
export function estJourFerie(dateString) {
  if (!dateString || dateString.length < 4) {
    return false;
  }
  const year = parseInt(dateString.slice(0, 4), 10);
  if (Number.isNaN(year)) {
    return false;
  }
  return getJoursFeries(year).includes(dateString);
}
