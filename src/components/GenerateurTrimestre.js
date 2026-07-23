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
} from 'lucide-react';
import { Button, Alert } from './ui';
import { genererProchainOrdreChoix } from '../utils/ordreChoix';
import { getOrdreChoix, saveOrdreChoix } from '../services/ordreChoixService';
import logger from '../utils/logger';

const GenerateurTrimestre = ({ onListeGenere, medecins = [] }) => {
  const [liste, setListe] = useState([]);           // 1er tour proposé (éditable)
  const [nouveaux, setNouveaux] = useState([]);
  const [partis, setPartis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);

  const construireProposition = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      const precedent = await getOrdreChoix();
      const noms = medecins.map((m) => `${m.nom} ${m.prenom}`.trim());
      const res = genererProchainOrdreChoix(precedent?.premierTour, noms);
      setListe(res.premierTour);
      setNouveaux(res.nouveaux);
      setPartis(res.partis);
    } catch (e) {
      logger.error('Génération de l’ordre de choix impossible:', e);
      setErreur('Impossible de charger l’ordre de choix précédent.');
    } finally {
      setLoading(false);
    }
  }, [medecins]);

  useEffect(() => {
    if (medecins.length > 0) {
      construireProposition();
    } else {
      setLoading(false);
    }
  }, [medecins, construireProposition]);

  const deplacer = (index, delta) => {
    setListe((prev) => {
      const cible = index + delta;
      if (cible < 0 || cible >= prev.length) { return prev; }
      const copie = [...prev];
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return copie;
    });
  };

  const envoyerEnBas = (index) => {
    setListe((prev) => {
      const copie = [...prev];
      const [item] = copie.splice(index, 1);
      copie.push(item);
      return copie;
    });
  };

  const valider = async () => {
    setSaving(true);
    setErreur(null);
    try {
      const premierTour = liste;
      const deuxiemeTour = [...liste].reverse();
      await saveOrdreChoix({ premierTour, deuxiemeTour });
      if (onListeGenere) {
        onListeGenere({
          premierTour,
          deuxiemeTour,
          stats: { totalMedecins: premierTour.length },
          medecinsInclus: medecins,
        });
      }
    } catch (e) {
      logger.error('Sauvegarde de l’ordre de choix impossible:', e);
      setErreur('La sauvegarde de l’ordre de choix a échoué.');
    } finally {
      setSaving(false);
    }
  };

  const estNouveau = (nom) => nouveaux.includes(nom);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h2 className="flex items-center justify-center gap-2 text-center text-xl font-bold text-ink-900">
        <RefreshCw size={20} aria-hidden="true" />
        Ordre de choix — proposition
      </h2>

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
          onClick={construireProposition}
          disabled={loading || saving}
          icon={<RefreshCw size={16} aria-hidden="true" />}
        >
          Réinitialiser la proposition
        </Button>
        <Button
          variant="primary"
          onClick={valider}
          disabled={loading || saving || liste.length === 0}
          icon={<CheckCircle2 size={16} aria-hidden="true" />}
        >
          {saving ? 'Enregistrement…' : 'Valider cet ordre de choix'}
        </Button>
      </div>
    </div>
  );
};

export default GenerateurTrimestre;
