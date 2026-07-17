// src/components/DashboardMedecin.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { ClipboardList, CalendarDays, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDesiderataByUser } from '../services/planningService';
import { AppHeader, ActionCard, Card, EmptyState, ErrorScreen, LoadingScreen } from './ui';
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
    <div className="min-h-screen bg-ink-100">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 animate-fade-up">
        {/* Bandeau de bienvenue */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white shadow-card sm:p-8">
          <p className="text-sm font-medium text-primary-100">Bonjour 👋</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Dr {profile?.prenom} {profile?.nom}
          </h1>
          <p className="mt-1 max-w-md text-sm text-primary-100">
            Gérez vos gardes et consultez le planning publié depuis votre espace.
          </p>
        </div>

        {/* Actions principales */}
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">
          Actions principales
        </h2>
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <ActionCard
            tone="blue"
            icon={<ClipboardList size={22} />}
            title="Saisir mes desiderata"
            description="Indiquez vos disponibilités"
            onClick={() => history.push('/formulaire-desirata')}
          />
          <ActionCard
            tone="green"
            icon={<CalendarDays size={22} />}
            title="Voir le planning"
            description="Consultez le planning publié"
            onClick={() => history.push('/planning-visualisation')}
          />
        </div>

        {/* Derniers desiderata */}
        <Card className="p-0">
          <h2 className="border-b border-ink-100 px-6 py-4 text-sm font-bold uppercase tracking-wide text-ink-500">
            Mes desiderata enregistrés
          </h2>
          {desiderata.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {desiderata.map((d, index) => (
                <li
                  key={d.id || index}
                  className="flex items-center gap-3 px-6 py-3.5 text-sm text-ink-700"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <FileText size={17} />
                  </span>
                  Période du{' '}
                  <span className="font-semibold text-ink-900">
                    {new Date(d.startDate).toLocaleDateString('fr-FR')}
                  </span>{' '}
                  au{' '}
                  <span className="font-semibold text-ink-900">
                    {new Date(d.endDate).toLocaleDateString('fr-FR')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<ClipboardList size={24} />}
              title="Aucun desiderata saisi"
              description="Commencez par indiquer vos disponibilités pour la période en cours."
            />
          )}
        </Card>
      </main>
    </div>
  );
}

export default DashboardMedecin;
