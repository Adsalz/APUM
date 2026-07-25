// src/components/planning/PlanningHeader.js
import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Save,
  Upload,
  RefreshCcw,
  Edit2,
  X,
  Download,
  FileSpreadsheet,
  Undo2
} from 'lucide-react';
import { Button } from '../ui';

const PlanningHeader = ({
  editMode,
  modified,
  nombreModifications = 0,
  onUndo,
  onEditToggle,
  onGenerateClick,
  onPublishClick,
  onSaveChanges,
  onBackClick,
  onExportClick,
  onExportPlanningClick,
  planning
}) => {
  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-ink-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={18} aria-hidden="true" />}
            onClick={onBackClick}
          >
            Retour
          </Button>
          <span className="flex items-center gap-2 font-bold text-primary-700">
            <Calendar size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Gestion du planning</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!editMode ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={16} aria-hidden="true" />}
                onClick={onExportClick}
              >
                Exporter desiderata
              </Button>
              {planning && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileSpreadsheet size={16} aria-hidden="true" />}
                  onClick={onExportPlanningClick}
                >
                  Exporter planning
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCcw size={16} aria-hidden="true" />}
                onClick={onGenerateClick}
              >
                {planning ? 'Regénérer' : 'Générer'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit2 size={16} aria-hidden="true" />}
                onClick={onEditToggle}
              >
                Modifier
              </Button>
              {planning && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload size={16} aria-hidden="true" />}
                  onClick={onPublishClick}
                >
                  Publier
                </Button>
              )}
            </>
          ) : (
            <>
              <span
                className={`hidden text-sm sm:inline ${modified ? 'font-semibold text-warning-700' : 'text-ink-400'}`}
                aria-live="polite"
              >
                {modified
                  ? `${nombreModifications} modification${nombreModifications > 1 ? 's' : ''} non sauvegardée${nombreModifications > 1 ? 's' : ''}`
                  : 'Aucune modification'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={<Undo2 size={16} aria-hidden="true" />}
                onClick={onUndo}
                disabled={!modified}
                title="Annuler la dernière affectation (Ctrl+Z)"
                aria-label="Annuler la dernière affectation"
              >
                <span className="hidden sm:inline">Annuler l&apos;action</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Save size={16} aria-hidden="true" />}
                onClick={onSaveChanges}
                disabled={!modified}
              >
                Sauvegarder
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<X size={16} aria-hidden="true" />}
                onClick={onEditToggle}
              >
                Annuler
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default PlanningHeader;
