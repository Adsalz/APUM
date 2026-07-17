import React, { useState } from 'react';
import { X, Download, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Modal, Button, Checkbox } from './ui';

function ExportDesiderataModal({
  isOpen,
  onClose,
  medecins,
  desiderata,
  _periodeSaisie,
  _creneaux
}) {
  const [selectedMedecins, setSelectedMedecins] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMedecins = medecins.filter(medecin => 
    medecin.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medecin.prenom.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return `${days[date.getDay()]} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const getPreferenceSymbol = (preference) => {
    switch(preference) {
    case 'Oui': return 'O';
    case 'Possible': return 'P';
    case 'Non': return 'N';
    default: return '-';
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const selectedMedecinsList = medecins.filter(m => selectedMedecins[m.id]);
    const creneauxSimplifies = [
      { id: 'QUART_1', label: 'Q1' },
      { id: 'QUART_2', label: 'Q2' },
      { id: 'RENFORT_1', label: 'RM' },
      { id: 'QUART_3', label: 'Q3' },
      { id: 'RENFORT_2', label: 'RS' },
      { id: 'QUART_4', label: 'Q4' }
    ];

    let currentPage = 1;
    selectedMedecinsList.forEach((medecin, index) => {
      if (index > 0) {
        doc.addPage();
        currentPage++;
      }

      const medecinDesiderata = desiderata.find(d => d.userId === medecin.id);
      const startY = 20;

      // En-tête du médecin
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Dr. ${medecin.prenom} ${medecin.nom}`, 20, startY);

      // Informations générales
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const infoY = startY + 10;
      doc.text(`Gardes/mois: ${medecinDesiderata?.nombreGardesSouhaitees || '-'}`, 20, infoY);
      doc.text(`Max/semaine: ${medecinDesiderata?.nombreGardesMaxParSemaine || '-'}`, 90, infoY);
      doc.text(`Gardes groupées: ${medecinDesiderata?.gardesGroupees ? 'Oui' : 'Non'}`, 20, infoY + 7);
      doc.text(`Renforts associés: ${medecinDesiderata?.renfortsAssocies ? 'Oui' : 'Non'}`, 90, infoY + 7);

      // Tableau des desiderata
      const tableStartY = infoY + 15;
      const cellWidth = 20;
      const dateWidth = 40;
      const rowHeight = 7;
      let currentY = tableStartY;

      // En-têtes des créneaux
      doc.setFont('helvetica', 'bold');
      doc.text('Date', 20, currentY);
      creneauxSimplifies.forEach((creneau, index) => {
        doc.text(creneau.label, dateWidth + (index * cellWidth) + 7, currentY);
      });
      currentY += 5;

      // Ligne de séparation
      doc.setLineWidth(0.1);
      doc.line(20, currentY, dateWidth + (creneauxSimplifies.length * cellWidth), currentY);
      currentY += 5;

      // Données du tableau
      doc.setFont('helvetica', 'normal');
      const dates = Object.keys(medecinDesiderata?.desiderata || {}).sort();
      
      dates.forEach(date => {
        // Vérifier s'il faut ajouter une nouvelle page
        if (currentY > 270) {
          doc.addPage();
          currentPage++;
          currentY = 20;
          
          // Répéter les en-têtes sur la nouvelle page
          doc.setFont('helvetica', 'bold');
          doc.text('Date', 20, currentY);
          creneauxSimplifies.forEach((creneau, index) => {
            doc.text(creneau.label, dateWidth + (index * cellWidth) + 7, currentY);
          });
          currentY += 5;
          doc.line(20, currentY, dateWidth + (creneauxSimplifies.length * cellWidth), currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        // Date
        doc.text(formatDate(date), 20, currentY);

        // Préférences
        creneauxSimplifies.forEach((creneau, index) => {
          const preference = medecinDesiderata?.desiderata[date]?.[creneau.id];
          const symbol = getPreferenceSymbol(preference);
          
          // Ajouter un rectangle coloré selon la préférence
          if (symbol !== '-') {
            doc.setFillColor(
              symbol === 'O' ? '#BBF7D0' :
                symbol === 'P' ? '#FEF08A' :
                  '#FECACA'
            );
            doc.rect(dateWidth + (index * cellWidth), currentY - 4, cellWidth, rowHeight, 'F');
          }
          
          doc.text(symbol, dateWidth + (index * cellWidth) + 7, currentY);
        });

        currentY += rowHeight;
      });

      // Légende
      currentY += 10;
      if (currentY > 270) {
        doc.addPage();
        currentPage++;
        currentY = 20;
      }

      doc.setFontSize(8);
      doc.setFillColor('#BBF7D0');
      doc.rect(20, currentY, 5, 5, 'F');
      doc.text('O: Oui', 30, currentY + 4);

      doc.setFillColor('#FEF08A');
      doc.rect(50, currentY, 5, 5, 'F');
      doc.text('P: Possible', 60, currentY + 4);

      doc.setFillColor('#FECACA');
      doc.rect(90, currentY, 5, 5, 'F');
      doc.text('N: Non', 100, currentY + 4);

      doc.setFillColor('#F3F4F6');
      doc.rect(130, currentY, 5, 5, 'F');
      doc.text('-: Non spécifié', 140, currentY + 4);

      // Numéro de page
      doc.setFontSize(8);
      doc.text(`Page ${currentPage}`, 180, 290);
    });

    doc.save('desiderata.pdf');
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
            onClick={generatePDF}
            disabled={Object.values(selectedMedecins).filter(Boolean).length === 0}
            icon={<Download size={18} />}
          >
            Exporter en PDF
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