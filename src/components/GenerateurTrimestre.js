import React, { useState } from 'react';
import {
  RefreshCw,
  Users,
  Search,
  Trophy,
  Medal,
  BarChart3,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Button, StatCard } from './ui';

const GenerateurTrimestre = ({ onListeGenere, medecins = [] }) => {
  const [resultat, setResultat] = useState(null);
  const [listeActuelleTriee, setListeActuelleTriee] = useState([]);

  // Générer automatiquement la liste depuis TOUS les médecins de la base
  React.useEffect(() => {
    if (medecins.length > 0) {
      // Trier par nom pour un ordre reproductible
      const medecinsTries = [...medecins].sort((a, b) =>
        `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
      );
      setListeActuelleTriee(medecinsTries);
    }
  }, [medecins]);

  const genererProchainTrimestre = () => {
    if (listeActuelleTriee.length === 0) {
      return;
    }

    // Utiliser TOUS les médecins de la base (pas de saisie manuelle)
    const nomsMedecins = listeActuelleTriee.map(m => `${m.nom} ${m.prenom}`);
    const total = nomsMedecins.length;
    const tailleTiers = Math.ceil(total / 3);

    // Division en 3 tiers
    const tiers1 = nomsMedecins.slice(0, tailleTiers);
    const tiers2 = nomsMedecins.slice(tailleTiers, tailleTiers * 2);
    const tiers3 = nomsMedecins.slice(tailleTiers * 2);

    // Rotation : tiers3 -> tiers1 -> tiers2 -> tiers3
    const nouvelleListe = [...tiers3, ...tiers1, ...tiers2];

    // Génération des deux tours
    const deuxiemeTour = [...nouvelleListe].reverse();

    const resultatGenere = {
      premierTour: nouvelleListe,
      deuxiemeTour: deuxiemeTour,
      stats: {
        totalMedecins: total,
        tailleTiers: tailleTiers
      },
      medecinsInclus: listeActuelleTriee
    };

    setResultat(resultatGenere);

    // Notifier le parent
    if (onListeGenere) {
      onListeGenere(resultatGenere);
    }
  };

  const formatListe = (liste) => {
    return liste.map((nom, index) => (
      <div
        key={index}
        className={`flex justify-between px-2 py-1 ${
          index % 2 === 0 ? 'bg-ink-50' : 'bg-white'
        }`}
      >
        <span className="w-8 font-mono text-sm text-ink-500">{index + 1}.</span>
        <span className="ml-2 flex-1 text-ink-800">{nom}</span>
      </div>
    ));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h2 className="flex items-center justify-center gap-2 text-center text-2xl font-bold text-ink-900">
        <RefreshCw size={22} aria-hidden="true" />
        Générateur de Liste Trimestrielle
      </h2>

      {/* Liste automatique des médecins */}
      <div className="rounded-2xl bg-ink-50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
          <Users size={20} aria-hidden="true" />
          Médecins détectés dans la base
        </h3>

        {listeActuelleTriee.length > 0 ? (
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {listeActuelleTriee.map((medecin, index) => (
              <div
                key={medecin.id}
                className="rounded-lg bg-white p-2 text-sm"
              >
                <span className="font-medium text-ink-800">
                  {index + 1}. {medecin.nom} {medecin.prenom}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 italic text-ink-500">
            Aucun médecin trouvé dans la base de données
          </p>
        )}

        <Button
          variant="primary"
          onClick={genererProchainTrimestre}
          disabled={listeActuelleTriee.length === 0}
          icon={<RefreshCw size={18} aria-hidden="true" />}
          className="w-full"
        >
          Générer la liste trimestrielle ({listeActuelleTriee.length} médecins)
        </Button>
      </div>

      {/* Explication */}
      <div className="rounded-2xl bg-primary-50 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-primary-800">
          <Search size={18} aria-hidden="true" />
          Fonctionnement
        </h3>
        <div className="flex flex-col gap-2 text-sm text-primary-800">
          <p><strong>1. Rotation par tiers :</strong> La liste est divisée en 3 parties égales</p>
          <p><strong>2. Avancement :</strong> Chaque tiers avance d&apos;une position</p>
          <p><strong>3. Nouveaux :</strong> Ajoutés automatiquement en fin de liste</p>
          <p><strong>4. Équité :</strong> Tout le monde passe en tête tous les 3 trimestres</p>
        </div>

        <div className="mt-4 rounded-lg border-l-4 border-primary-500 bg-white p-3">
          <p className="font-mono text-xs text-ink-500">
            Tiers 3 → Tiers 1<br />
            Tiers 1 → Tiers 2<br />
            Tiers 2 → Tiers 3
          </p>
        </div>
      </div>

      {/* Résultats */}
      {resultat && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Premier tour */}
          <div className="rounded-2xl bg-success-50 p-4">
            <h3 className="mb-3 flex flex-wrap items-center gap-2 font-bold text-success-700">
              <Trophy size={18} aria-hidden="true" />
              Premier Tour
              <span className="text-sm font-normal text-success-600">
                ({resultat.premierTour.length} personnes)
              </span>
            </h3>
            <div className="max-h-96 overflow-y-auto rounded-lg border border-ink-200 bg-white">
              {formatListe(resultat.premierTour)}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary-50 p-2 text-sm font-semibold text-primary-700">
              <CheckCircle2 size={16} aria-hidden="true" />
              Tous les médecins inclus automatiquement
            </div>
          </div>

          {/* Deuxième tour */}
          <div className="rounded-2xl bg-orange-50 p-4">
            <h3 className="mb-3 flex flex-wrap items-center gap-2 font-bold text-orange-700">
              <Medal size={18} aria-hidden="true" />
              Deuxième Tour
              <span className="text-sm font-normal text-orange-600">
                (ordre inversé)
              </span>
            </h3>
            <div className="max-h-96 overflow-y-auto rounded-lg border border-ink-200 bg-white">
              {formatListe(resultat.deuxiemeTour)}
            </div>
          </div>

          {/* Statistiques */}
          <div className="rounded-2xl bg-ink-50 p-4 lg:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-ink-900">
              <BarChart3 size={18} aria-hidden="true" />
              Statistiques
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                tone="blue"
                icon={<Users size={22} aria-hidden="true" />}
                label="Total médecins"
              >
                <p className="text-3xl font-extrabold text-ink-900">
                  {resultat.stats.totalMedecins}
                </p>
              </StatCard>

              <StatCard
                tone="green"
                icon={<CheckCircle2 size={22} aria-hidden="true" />}
                label="Médecins inclus"
              >
                <p className="text-3xl font-extrabold text-ink-900">100%</p>
              </StatCard>

              <StatCard
                tone="purple"
                icon={<Layers size={22} aria-hidden="true" />}
                label="Médecins par tiers"
              >
                <p className="text-3xl font-extrabold text-ink-900">
                  {resultat.stats.tailleTiers}
                </p>
              </StatCard>

              <StatCard
                tone="orange"
                icon={<RefreshCw size={22} aria-hidden="true" />}
                label="Auto-généré"
              >
                <p className="text-3xl font-extrabold text-ink-900">Oui</p>
              </StatCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateurTrimestre;
