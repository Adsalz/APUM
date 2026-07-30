import React, { useState } from 'react';
import { X, Download, Search } from 'lucide-react';
import { Modal, Button, Checkbox, useToast } from './ui';
import { exportDesiderataToExcel } from '../services/excelExportService';
import { getPeriodeSaisie } from '../services/planningService';
import { trierMedecinsParNom } from '../utils/medecins';
import logger from '../utils/logger';

// Exporte les desiderata des médecins SÉLECTIONNÉS au format Excel de la fiche
// de référence « DESIDERATA ASO26 » (une feuille par médecin) — le même
// classeur que l'export de l'écran « Suivi des desiderata ».
function ExportDesiderataModal({
  isOpen,
  onClose,
  medecins,
  desiderata,
  periodeSaisie
}) {
  const [selectedMedecins, setSelectedMedecins] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const filteredMedecins = trierMedecinsParNom(medecins.filter(medecin =>
    medecin.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medecin.prenom.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const toggleSelectAll = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    const newSelected = {};
    filteredMedecins.forEach(medecin => {
      newSelected[medecin.id] = newState;
    });
    setSelectedMedecins(newSelected);
  };

  const toggleMedecin = (medecinId) => {
    setSelectedMedecins(prev => ({
      ...prev,
      [medecinId]: !prev[medecinId]
    }));
  };

  const nbSelectionnes = Object.values(selectedMedecins).filter(Boolean).length;

  const exporterExcel = async () => {
    const selection = trierMedecinsParNom(medecins.filter((m) => selectedMedecins[m.id]));
    if (selection.length === 0) { return; }

    setIsExporting(true);
    try {
      // Filet : l'écran parent peut ne pas avoir encore chargé la période.
      const periode = periodeSaisie || await getPeriodeSaisie();
      if (!periode) {
        toast.error('Aucune période de saisie définie');
        return;
      }
      const result = await exportDesiderataToExcel(selection, desiderata || [], periode);
      toast.success(result.message);
      onClose();
    } catch (error) {
      logger.error('Erreur lors de l\'export Excel des desiderata:', error);
      toast.error('Erreur lors de l\'export Excel');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) {return null;}

  return (
    <Modal
      open
      onClose={onClose}
      title="Exporter les desiderata"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={exporterExcel}
            loading={isExporting}
            disabled={nbSelectionnes === 0 || isExporting}
            icon={<Download size={18} />}
          >
            Exporter en Excel
          </Button>
        </>
      }
    >
      {/* Barre de recherche */}
      <div className="relative mb-4">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un médecin..."
          className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pl-10 pr-10 text-sm text-ink-900 placeholder-ink-400 shadow-sm transition-colors hover:border-ink-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            aria-label="Effacer la recherche"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Sélection en masse */}
      <div className="mb-3 rounded-lg bg-ink-50 px-3 py-2.5">
        <Checkbox
          checked={selectAll}
          onChange={toggleSelectAll}
          label="Sélectionner tous les médecins"
        />
      </div>

      {/* Liste des médecins filtrée */}
      <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border border-ink-200 p-2">
        {filteredMedecins.length > 0 ? (
          filteredMedecins.map(medecin => (
            <Checkbox
              key={medecin.id}
              checked={selectedMedecins[medecin.id] || false}
              onChange={() => toggleMedecin(medecin.id)}
              label={`Dr. ${medecin.prenom} ${medecin.nom}`}
              className="m-0 rounded-lg px-2.5 py-2 hover:bg-ink-50"
            />
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-ink-500">
            Aucun médecin trouvé
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ExportDesiderataModal;
