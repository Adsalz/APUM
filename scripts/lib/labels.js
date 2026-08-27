// scripts/lib/labels.js
//
// ⚠️ Miroir CommonJS de computeAnnuaireLabels (src/services/annuaireService.js),
// couvert par src/services/__tests__/annuaireService.test.js. Les deux doivent
// rester alignés : « Prénom N. » élargi en cas de collision, suffixe (1)/(2)
// en dernier recours. La collision se juge sur une clé NORMALISÉE (accents,
// casse, tirets, espaces, points ignorés) : « Jean-Luc F. » et « Jean Luc F. »
// se lisent pareil dans une liste, on les distingue donc comme des homonymes.

const capitalize = (s) => {
  const t = (s || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
};

const labelWith = (prenom, nom, k) => {
  const p = (prenom || '').trim();
  const n = (nom || '').trim();
  if (!n) return p || '(sans nom)';
  if (k >= n.length) return `${p} ${capitalize(n)}`.trim();
  return `${p} ${capitalize(n.slice(0, k))}.`.trim();
};

const cleLabel = (lbl) =>
  (lbl || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

function computeAnnuaireLabels(medecins) {
  const entries = medecins.map((m) => ({ id: m.id, prenom: m.prenom, nom: m.nom, k: 1 }));

  for (let iter = 0; iter < 30; iter += 1) {
    const counts = {};
    entries.forEach((e) => {
      const cle = cleLabel(labelWith(e.prenom, e.nom, e.k));
      counts[cle] = (counts[cle] || 0) + 1;
    });

    let changed = false;
    entries.forEach((e) => {
      const cle = cleLabel(labelWith(e.prenom, e.nom, e.k));
      const nomLen = (e.nom || '').trim().length;
      if (counts[cle] > 1 && e.k < nomLen) {
        e.k += 1;
        changed = true;
      }
    });
    if (!changed) break;
  }

  const finals = entries.map((e) => {
    const lbl = labelWith(e.prenom, e.nom, e.k);
    return { id: e.id, lbl, cle: cleLabel(lbl) };
  });
  const groupCount = {};
  finals.forEach((f) => { groupCount[f.cle] = (groupCount[f.cle] || 0) + 1; });

  const seen = {};
  const result = {};
  finals.forEach((f) => {
    if (groupCount[f.cle] > 1) {
      seen[f.cle] = (seen[f.cle] || 0) + 1;
      result[f.id] = `${f.lbl} (${seen[f.cle]})`;
    } else {
      result[f.id] = f.lbl;
    }
  });
  return result;
}

module.exports = { computeAnnuaireLabels, cleLabel };
