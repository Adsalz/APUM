import React, { useMemo, useState, useEffect } from 'react';
import { Download, CalendarDays } from 'lucide-react';
import { Modal, Button, Checkbox, Alert } from './ui';
import {
  groupPlanningByMonth,
  formatMonthTitle,
  exportPlanningToExcel
} from '../services/excelExportService';
import logger from '../utils/logger';

// Modale d'export du planning généré en Excel : un onglet par mois.
// Le planning est découpé automatiquement en mois ; l'admin peut restreindre
// l'export à un sous-ensemble de mois.
function ExportPlanningModal({ isOpen, onClose, planning, medecins }) {
  const mois = useMemo(() => groupPlanningByMonth(planning), [planning]);

  const [selection, setSelection] = useState({});
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // (Ré)initialise la sélection (tous les mois cochés) à l'ouverture.
  useEffect(() => {
    if (isOpen) {
      const initiale = {};
      mois.forEach((m) => { initiale[m.monthKey] = true; });
      setSelection(initiale);
      setError(null);
    }
  }, [isOpen, mois]);

  const toggleMois = (monthKey) => {
    setSelection((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const moisSelectionnes = mois.filter((m) => selection[m.monthKey]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await exportPlanningToExcel(planning, medecins, {
        months: moisSelectionnes.map((m) => m.monthKey)
      });
      onClose();
    } catch (err) {
      logger.error('Erreur export planning:', err);
      setError("Une erreur est survenue lors de l'export du planning.");
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) { return null; }

  return (
    <Modal
      open
      onClose={onClose}
      title="Exporter le planning (Excel)"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={moisSelectionnes.length === 0 || exporting}
            loading={exporting}
            icon={<Download size={18} aria-hidden="true" />}
          >
            Exporter en Excel
          </Button>
        </>
      }
    >
      {error && <Alert kind="error" className="mb-4">{error}</Alert>}

      {mois.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-ink-500">
          Aucune date dans le planning à exporter.
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-600">
            Le planning est découpé par mois : un onglet par mois dans le fichier
            Excel. Sélectionnez les mois à inclure.
          </p>

          <div className="space-y-0.5 rounded-lg border border-ink-200 p-2">
            {mois.map((m) => (
              <Checkbox
                key={m.monthKey}
                checked={selection[m.monthKey] || false}
                onChange={() => toggleMois(m.monthKey)}
                label={
                  <span className="flex items-center gap-2">
                    <CalendarDays size={16} aria-hidden="true" className="text-ink-400" />
                    {formatMonthTitle(m.monthKey)}
                    <span className="text-ink-400">
                      ({m.dates.length} jour{m.dates.length > 1 ? 's' : ''})
                    </span>
                  </span>
                }
                className="m-0 rounded-lg px-2.5 py-2 hover:bg-ink-50"
              />
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

export default ExportPlanningModal;
