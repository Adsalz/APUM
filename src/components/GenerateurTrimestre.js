import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Users,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ArrowDownToLine,
  Sparkles,
  UserMinus,
  Lock,
} from 'lucide-react';
import { Button, Alert } from './ui';
import { genererProchainOrdreChoix } from '../utils/ordreChoix';
import { idPeriode as calculerIdPeriode, libellePeriode } from '../utils/periodeId';
import {
  getOrdreChoixPeriode,
  getOrdreChoixPrecedent,
  saveOrdreChoixPeriode,
} from '../services/ordreChoixService';
import logger from '../utils/logger';

// L'ordre de choix appartient au TRIMESTRE, pas à la génération de planning.
// Deux états possibles à l'ouverture :
//   - « figé »    : ce trimestre a déjà son ordre de choix validé → on le relit
//                   tel quel. Régénérer le tableau autant de fois qu'on veut ne
//                   le fait PAS évoluer.
//   - « proposé » : premier passage sur ce trimestre → on applique la règle de
//                   bascule (N=10) à l'ordre du trimestre précédent, et l'admin
//                   ajuste avant de figer.
const GenerateurTrimestre = ({ onListeGenere, medecins = [], periodeSaisie = null }) => {
  const [liste, setListe] = useState([]);           // 1er tour (éditable avant validation)
  const [nouveaux, setNouveaux] = useState([]);
  const [partis, setPartis] = useState([]);
  const [fige, setFige] = useState(false);          // liste déjà validée pour ce trimestre
  const [basePeriode, setBasePeriode] = useState(null); // trimestre dont on a hérité
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);

  const idPeriode = calculerIdPeriode(periodeSaisie);
  const libelle = libellePeriode(periodeSaisie);

  // forcerRecalcul : ne sert qu'au bouton explicite « repartir du trimestre
  // précédent », jamais au chargement.
  const charger = useCallback(async (forcerRecalcul = false) => {
    setLoading(true);
    setErreur(null);
    try {
      const noms = medecins.map((m) => `${m.nom} ${m.prenom}`.trim());

      if (!forcerRecalcul) {
        const existant = await getOrdreChoixPeriode(idPeriode);
        if (existant?.premierTour?.length) {
          setListe(existant.premierTour);
          setNouveaux([]);
          setPartis([]);
          setBasePeriode(existant.baseSur || null);
          setFige(true);
          return;
        }
      }

      const precedent = await getOrdreChoixPrecedent(idPeriode);
      const res = genererProchainOrdreChoix(precedent?.premierTour, noms);
      setListe(res.premierTour);
      setNouveaux(res.nouveaux);
      setPartis(res.partis);
      setBasePeriode(precedent?.idPeriode || null);
      setFige(false);
    } catch (e) {
      logger.error('Génération de l’ordre de choix impossible:', e);
      setErreur('Impossible de charger l’ordre de choix précédent.');
    } finally {
      setLoading(false);
    }
  }, [medecins, idPeriode]);

  useEffect(() => {
    if (medecins.length > 0) {
      charger();
    } else {
      setLoading(false);
    }
  }, [medecins, charger]);

  const modifierListe = (maj) => {
    setFige(false); // toute retouche manuelle redemande une validation explicite
    setListe(maj);
  };

  const deplacer = (index, delta) => {
    const cible = index + delta;
    if (cible < 0 || cible >= liste.length) { return; }
    const copie = [...liste];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    modifierListe(copie);
  };

  const envoyerEnBas = (index) => {
    const copie = [...liste];
    const [item] = copie.splice(index, 1);
    copie.push(item);
    modifierListe(copie);
  };

  const emettre = (premierTour, deuxiemeTour) => {
    if (onListeGenere) {
      onListeGenere({
        premierTour,
        deuxiemeTour,
        stats: { totalMedecins: premierTour.length },
        medecinsInclus: medecins,
      });
    }
  };

  const valider = async () => {
    const premierTour = liste;
    const deuxiemeTour = [...liste].reverse();

    // Liste déjà figée et non retouchée : rien à réécrire, on la transmet.
    if (fige) {
      emettre(premierTour, deuxiemeTour);
      return;
    }

    setSaving(true);
    setErreur(null);
    try {
      await saveOrdreChoixPeriode(idPeriode, {
        premierTour,
        deuxiemeTour,
        libelle,
        baseSur: basePeriode,
      });
      setFige(true);
      emettre(premierTour, deuxiemeTour);
    } catch (e) {
      logger.error('Sauvegarde de l’ordre de choix impossible:', e);
      setErreur(
        idPeriode
          ? 'La sauvegarde de l’ordre de choix a échoué.'
          : 'Définissez d’abord la période de saisie du trimestre.'
      );
    } finally {
      setSaving(false);
    }
  };

  const estNouveau = (nom) => nouveaux.includes(nom);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h2 className="flex items-center justify-center gap-2 text-center text-xl font-bold text-ink-900">
        <RefreshCw size={20} aria-hidden="true" />
        Ordre de choix{libelle ? ` — ${libelle}` : ''}
      </h2>

      {fige ? (
        <Alert kind="info">
          <span className="inline-flex items-center gap-1.5">
            <Lock size={14} aria-hidden="true" />
            Ordre de choix déjà figé pour ce trimestre : il est réutilisé tel quel à chaque
            génération du tableau. Il n’évoluera qu’au trimestre suivant.
          </span>
        </Alert>
      ) : (
        <Alert kind="warning">
          Proposition {basePeriode ? `dérivée de l’ordre de choix ${basePeriode}` : 'initiale'} —
          les 10 premiers du trimestre précédent basculent en bas de liste. Ajustez si besoin,
          puis validez : la liste sera figée pour tout le trimestre.
        </Alert>
      )}

      {(nouveaux.length > 0 || partis.length > 0) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {nouveaux.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-success-50 px-2 py-1 text-success-700">
              <Sparkles size={14} aria-hidden="true" /> {nouveaux.length} nouveau(x) : {nouveaux.join(', ')}
            </span>
          )}
          {partis.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-ink-100 px-2 py-1 text-ink-600">
              <UserMinus size={14} aria-hidden="true" /> {partis.length} retiré(s) : {partis.join(', ')}
            </span>
          )}
        </div>
      )}

      {erreur && <Alert kind="danger">{erreur}</Alert>}

      {loading ? (
        <p className="py-8 text-center italic text-ink-500">Chargement…</p>
      ) : liste.length === 0 ? (
        <p className="py-8 text-center italic text-ink-500">Aucun médecin dans la base.</p>
      ) : (
        <div className="rounded-2xl border border-ink-200 bg-white">
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2 text-sm font-semibold text-ink-700">
            <span className="flex items-center gap-1.5"><Users size={16} aria-hidden="true" /> 1er tour ({liste.length})</span>
            <span className="text-xs font-normal text-ink-400">2ᵉ tour = inverse</span>
          </div>
          <ol className="max-h-96 overflow-y-auto">
            {liste.map((nom, i) => (
              <li
                key={nom}
                className={`flex items-center gap-2 px-3 py-1.5 ${i % 2 === 0 ? 'bg-ink-50' : 'bg-white'}`}
              >
                <span className="w-7 shrink-0 font-mono text-xs text-ink-400">{i + 1}.</span>
                <span className="flex-1 text-sm text-ink-800">
                  {nom}
                  {estNouveau(nom) && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-success-100 px-1.5 py-0.5 text-xs text-success-700">
                      <Sparkles size={11} aria-hidden="true" /> nouveau
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => deplacer(i, -1)}
                    disabled={i === 0}
                    aria-label={`Monter ${nom}`}
                    className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
                  >
                    <ChevronUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deplacer(i, 1)}
                    disabled={i === liste.length - 1}
                    aria-label={`Descendre ${nom}`}
                    className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => envoyerEnBas(i)}
                    disabled={i === liste.length - 1}
                    aria-label={`Envoyer ${nom} en bas`}
                    title="Envoyer en bas de liste"
                    className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
                  >
                    <ArrowDownToLine size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => charger(true)}
          disabled={loading || saving}
          icon={<RefreshCw size={16} aria-hidden="true" />}
          title="Écrase la liste affichée et réapplique la règle de bascule à l’ordre du trimestre précédent"
        >
          Recalculer depuis le trimestre précédent
        </Button>
        <Button
          variant="primary"
          onClick={valider}
          disabled={loading || saving || liste.length === 0}
          icon={<CheckCircle2 size={16} aria-hidden="true" />}
        >
          {saving ? 'Enregistrement…' : fige ? 'Utiliser cet ordre de choix' : 'Figer cet ordre de choix'}
        </Button>
      </div>
    </div>
  );
};

export default GenerateurTrimestre;
