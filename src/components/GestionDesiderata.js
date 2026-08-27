import React, { useState, useEffect } from 'react';
import { getMedecins } from '../services/userService';
import { getDesiderataStatus, getPeriodeSaisie } from '../services/planningService';
import { Search, Mail, Download, FileSpreadsheet } from 'lucide-react';
import DesiderataStatus from './DesiderataStatus';
import RelanceEmailModal from './RelanceEmailModal';
import { getMedecinsSansDesiderata } from '../services/emailService';
import { exportDesiderataToExcel, exportFicheViergeToExcel } from '../services/excelExportService';
import { trierMedecinsParNom } from '../utils/medecins';
import {
  AppHeader,
  LoadingScreen,
  ErrorScreen,
  Button,
  Card,
  SegmentedControl,
  EmptyState,
  useToast,
} from './ui';
import logger from '../utils/logger';

function GestionDesiderata() {
  const [medecins, setMedecins] = useState([]);
  const [desiderataStatus, setDesiderataStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [showRelanceModal, setShowRelanceModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingVierge, setIsGeneratingVierge] = useState(false);
  const toast = useToast();

  // Auth/rôle admin garantis par ProtectedRoute : on charge uniquement les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Tri alphabétique (demande admin) : liste de suivi, relances et
        // classeur Excel exporté suivent tous cet ordre.
        const medecinsList = trierMedecinsParNom(await getMedecins());
        setMedecins(medecinsList);

        const statusData = await getDesiderataStatus();
        setDesiderataStatus(statusData.desiderata);

      } catch (error) {
        logger.error('Erreur:', error);
        setError('Erreur lors de la récupération des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getFilteredMedecins = () => {
    if (!medecins) {return [];}

    let filtered = medecins;

    // Filtre par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(medecin =>
        `${medecin.prenom} ${medecin.nom}`.toLowerCase().includes(search)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'tous') {
      filtered = filtered.filter(medecin => {
        const medecinDesiderata = desiderataStatus?.find(d => d.userId === medecin.id);

        switch (statusFilter) {
        case 'complet':
          return medecinDesiderata && Object.keys(medecinDesiderata.desiderata || {}).length > 0;
        case 'non_saisi':
          return !medecinDesiderata;
        default:
          return true;
        }
      });
    }

    return filtered;
  };

  const handleRelanceSuccess = (resultats) => {
    toast.success(`${resultats.succes} email(s) de relance envoyé(s) avec succès !`);
  };

  const medecinsSansDesiderata = getMedecinsSansDesiderata(medecins, desiderataStatus || []);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const periode = await getPeriodeSaisie();
      if (!periode) {
        toast.error('Aucune période de saisie définie');
        return;
      }

      const result = await exportDesiderataToExcel(medecins, desiderataStatus || [], periode);
      toast.success(result.message);
    } catch (error) {
      logger.error('Erreur lors de l\'export Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Fiche vierge (dates de la période, aucune réponse) : à envoyer aux médecins
  // qui ne saisissent pas leurs desiderata dans l'application. Ils la remplissent
  // dans Excel et la renvoient ; l'admin la reporte via « Remplir desiderata ».
  const handleFicheVierge = async () => {
    setIsGeneratingVierge(true);
    try {
      const periode = await getPeriodeSaisie();
      if (!periode) {
        toast.error('Aucune période de saisie définie');
        return;
      }

      const result = await exportFicheViergeToExcel(periode);
      toast.success(result.message);
    } catch (error) {
      logger.error('Erreur lors de la génération de la fiche vierge:', error);
      toast.error('Erreur lors de la génération de la fiche vierge');
    } finally {
      setIsGeneratingVierge(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  return (
    <div className="min-h-screen bg-ink-100">
      {/* Menu fixe en haut */}
      <AppHeader backTo="/dashboard-admin" />

      {/* Contenu principal */}
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 animate-fade-up">
        {/* En-tête de la page + actions */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Suivi des desiderata
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Visualisez l'état de saisie des desiderata pour chaque médecin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={<FileSpreadsheet size={16} />}
              loading={isGeneratingVierge}
              disabled={isGeneratingVierge}
              onClick={handleFicheVierge}
              title="Télécharger une fiche vierge aux dates de la période, à envoyer aux médecins qui n'utilisent pas l'application"
            >
              Fiche vierge
            </Button>
            <Button
              variant="success"
              icon={<Download size={16} />}
              loading={isExporting}
              disabled={isExporting || medecins.length === 0}
              onClick={handleExportExcel}
              title="Exporter tous les desiderata vers Excel"
            >
              Exporter Excel
            </Button>
            <Button
              variant="danger"
              icon={<Mail size={16} />}
              disabled={medecinsSansDesiderata.length === 0}
              onClick={() => setShowRelanceModal(true)}
              title={medecinsSansDesiderata.length === 0 ? 'Tous les médecins ont saisi leurs desiderata' : 'Envoyer des relances par email'}
            >
              Relancer par email ({medecinsSansDesiderata.length})
            </Button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <Card className="mb-5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Barre de recherche */}
            <div className="relative sm:max-w-md sm:flex-1">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="text"
                aria-label="Rechercher un médecin"
                placeholder="Rechercher un médecin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              />
            </div>

            {/* Filtres par statut */}
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'tous', label: 'Tous' },
                { value: 'complet', label: 'Complet' },
                { value: 'non_saisi', label: 'Non saisi' },
              ]}
            />
          </div>
        </Card>

        {/* Liste des médecins et leur statut */}
        {getFilteredMedecins().length > 0 ? (
          <DesiderataStatus
            medecins={getFilteredMedecins()}
            desiderata={desiderataStatus || []}
          />
        ) : (
          <Card className="p-0">
            <EmptyState
              icon={<Search size={26} />}
              title="Aucun médecin trouvé"
              description="Aucun médecin ne correspond aux critères de recherche."
            />
          </Card>
        )}
      </main>

      {/* Modals */}
      <RelanceEmailModal
        isOpen={showRelanceModal}
        onClose={() => setShowRelanceModal(false)}
        medecins={medecins}
        desiderataStatus={desiderataStatus || []}
        onSuccess={handleRelanceSuccess}
      />

    </div>
  );
}

export default GestionDesiderata;
