// src/components/DashboardAdmin.js
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  ClipboardList,
  CheckSquare,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getMedecins } from '../services/userService';
import { getPeriodeSaisie, getPublishedPlanning } from '../services/planningService';
import { AppHeader, ActionCard, ErrorScreen, LoadingScreen, StatCard } from './ui';
import logger from '../utils/logger';

function DashboardAdmin() {
  const { profile } = useAuth();
  const [medecins, setMedecins] = useState([]);
  const [periodeSaisie, setPeriodeSaisie] = useState(null);
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const history = useHistory();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [medecinsList, periode, publishedPlan] = await Promise.all([
          getMedecins(),
          getPeriodeSaisie(),
          getPublishedPlanning(),
        ]);
        if (!cancelled) {
          setMedecins(medecinsList);
          setPeriodeSaisie(periode);
          setPlanning(publishedPlan);
        }
      } catch (err) {
        logger.error('Erreur lors du chargement du tableau de bord:', err);
        if (!cancelled) {
          setError('Erreur lors de la récupération des données.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-ink-100">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 animate-fade-up">
        {/* Bandeau de bienvenue */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-ink-800 bg-gradient-to-br from-ink-800 to-ink-950 p-6 text-white shadow-card sm:p-8">
          <p className="text-sm font-medium text-ink-300">Espace administration</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {profile?.prenom} {profile?.nom}
          </h1>
          <p className="mt-1 max-w-lg text-sm text-ink-300">
            Gérez les utilisateurs, les périodes de saisie et la génération des plannings.
          </p>
        </div>

        {/* Statistiques */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard tone="blue" icon={<Users size={22} />} label="Médecins">
            <p className="text-3xl font-extrabold text-ink-900">{medecins.length}</p>
          </StatCard>

          <StatCard tone="green" icon={<Clock size={22} />} label="Période de saisie">
            <p className={`text-sm font-semibold ${periodeSaisie ? 'text-success-600' : 'text-danger-600'}`}>
              {periodeSaisie
                ? `Du ${new Date(periodeSaisie.startDate).toLocaleDateString('fr-FR')} au ${new Date(
                    periodeSaisie.endDate
                  ).toLocaleDateString('fr-FR')}`
                : 'Aucune période définie'}
            </p>
          </StatCard>

          <StatCard tone="orange" icon={<Calendar size={22} />} label="Planning">
            <p className={`text-sm font-semibold ${planning ? 'text-success-600' : 'text-danger-600'}`}>
              {planning ? 'Planning publié' : 'Aucun planning publié'}
            </p>
          </StatCard>
        </div>

        {/* Actions principales */}
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">
          Actions principales
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              tone="blue"
              icon={<Users size={24} />}
              title="Gérer les utilisateurs"
              description="Ajouter ou modifier des utilisateurs"
              onClick={() => history.push('/gestion-utilisateurs')}
            />
            <ActionCard
              tone="purple"
              icon={<Calendar size={24} />}
              title="Gérer le planning"
              description="Générer et modifier le planning"
              onClick={() => history.push('/gestion-planning-admin')}
            />
            <ActionCard
              tone="green"
              icon={<ClipboardList size={24} />}
              title="Période de saisie"
              description="Définir la période de saisie des desiderata"
              onClick={() => history.push('/gestion-periode-saisie')}
            />
            <ActionCard
              tone="orange"
              icon={<CheckSquare size={24} />}
              title="État des desiderata"
              description="Suivre la saisie des desiderata"
              onClick={() => history.push('/gestion-desiderata')}
            />
            <ActionCard
              tone="red"
              icon={<UserPlus size={24} />}
              title="Remplir desiderata"
              description="Saisir les desiderata pour un médecin"
              onClick={() => history.push('/desiderata-admin')}
            />
          </div>
      </main>
    </div>
  );
}

export default DashboardAdmin;
