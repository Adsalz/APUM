import React, { useState } from 'react';
import { X, Download, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';

function ExportDesiderataModal({ 
  isOpen, 
  onClose, 
  medecins, 
  desiderata,
  periodeSaisie,
  creneaux 
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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '2rem',
        width: '90%',
        maxWidth: '600px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          <X size={20} color="#6B7280" />
        </button>

        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Download size={24} />
          Exporter les desiderata
        </h2>

        <div style={{ marginBottom: '1rem' }}>
          {/* Barre de recherche */}
          <div style={{
            position: 'relative',
            marginBottom: '1rem'
          }}>
            <div style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B7280'
            }}>
              <Search size={20} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un médecin..."
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingLeft: '2.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #D1D5DB',
                fontSize: '0.875rem'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '0.25rem',
                  cursor: 'pointer',
                  color: '#6B7280'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sélection en masse */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#F3F4F6',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
              style={{ width: 'auto' }}
            />
            <span style={{ fontWeight: '500' }}>Sélectionner tous les médecins</span>
          </label>

          {/* Liste des médecins filtrée */}
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #E5E7EB',
            borderRadius: '0.375rem',
            padding: '0.5rem'
          }}>
            {filteredMedecins.length > 0 ? (
              filteredMedecins.map(medecin => (
                <label
                  key={medecin.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    borderRadius: '0.25rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={selectedMedecins[medecin.id] || false}
                    onChange={() => toggleMedecin(medecin.id)}
                    style={{ width: 'auto' }}
                  />
                  <span>Dr. {medecin.prenom} {medecin.nom}</span>
                </label>
              ))
            ) : (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: '#6B7280'
              }}>
                Aucun médecin trouvé
              </div>
            )}
          </div>
        </div>

        <div style={{
          marginTop: '2rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              color: '#374151'
            }}
          >
            Annuler
          </button>
          <button
            onClick={generatePDF}
            disabled={Object.values(selectedMedecins).filter(Boolean).length === 0}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: Object.values(selectedMedecins).filter(Boolean).length === 0 ? '#9CA3AF' : '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: Object.values(selectedMedecins).filter(Boolean).length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={18} />
            Exporter en PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDesiderataModal;