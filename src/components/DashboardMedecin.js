// src/components/DashboardMedecin.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { ClipboardList, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDesiderataByUser } from '../services/planningService';
import { AppHeader, ActionCard, Card, ErrorScreen, LoadingScreen } from './ui';
import logger from '../utils/logger';

function DashboardMedecin() {
  const { profile } = useAuth();
  const [desiderata, setDesiderata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const history = useHistory();

  useEffect(() => {
    let cancelled = false;

    const loadDesiderata = async () => {
      if (!profile) {
        return;
      }
      try {
        const userDesiderata = await getDesiderataByUser(profile.id);
        if (!cancelled) {
          setDesiderata(userDesiderata);
        }
      } catch (err) {
        logger.error('Erreur lors de la récupération des desiderata:', err);
        if (!cancelled) {
          setError('Impossible de charger vos desiderata.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDesiderata();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-24">
        {/* Carte de bienvenue */}
        <Card className="mb-8">
          <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            Bienvenue, Dr {profile?.nom}
          </h1>
          <p className="text-gray-500">
            Gérez vos gardes et consultez le planning depuis votre tableau de bord
          </p>
        </Card>

        {/* Actions principales */}
        <Card className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Actions principales
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ActionCard
              tone="purple"
              icon={<ClipboardList size={24} />}
              title="Saisir desiderata"
              description="Indiquez vos disponibilités"
              onClick={() => history.push('/formulaire-desirata')}
            />
            <ActionCard
              tone="green"
              icon={<Calendar size={24} />}
              title="Voir planning"
              description="Consultez le planning publié"
              onClick={() => history.push('/planning-visualisation')}
            />
          </div>
        </Card>

        {/* Derniers desiderata */}
        <Card className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Derniers desiderata
          </h2>
          {desiderata.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {desiderata.map((d, index) => (
                <li
                  key={d.id || index}
                  className="rounded-md bg-gray-50 p-3 text-sm text-gray-700"
                >
                  Pour la période du {new Date(d.startDate).toLocaleDateString('fr-FR')} au{' '}
                  {new Date(d.endDate).toLocaleDateString('fr-FR')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Aucun desiderata saisi</p>
          )}
        </Card>
      </main>
    </div>
  );
}

export default DashboardMedecin;
