// src/components/WeeklyPattern.js
import React, { useState } from 'react';
import { Calendar, Copy, ChevronDown, ChevronUp } from 'lucide-react';

function WeeklyPattern({ creneaux, onApplyPattern, periodeSaisie }) {
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [pattern, setPattern] = useState({});
 const [isExpanded, setIsExpanded] = useState(false);
 
 const jours = [
   { id: '1', label: 'Lundi' },
   { id: '2', label: 'Mardi' },
   { id: '3', label: 'Mercredi' },
   { id: '4', label: 'Jeudi' },
   { id: '5', label: 'Vendredi' },
   { id: '6', label: 'Samedi' },
   { id: '0', label: 'Dimanche' }
 ];

 const handlePatternChange = (jour, creneau, value) => {
   setPattern(prev => ({
     ...prev,
     [jour]: {
       ...(prev[jour] || {}),
       [creneau]: value
     }
   }));
 };

 const handleSelectFullPeriod = () => {
   if (periodeSaisie) {
     setStartDate(periodeSaisie.startDate.split('T')[0]);
     setEndDate(periodeSaisie.endDate.split('T')[0]);
   }
 };

 const handleApplyPattern = () => {
   if (!startDate || !endDate) {
     alert('Veuillez sélectionner une période');
     return;
   }

   if (Object.keys(pattern).length === 0) {
     alert('Veuillez définir au moins une préférence dans le pattern');
     return;
   }

   onApplyPattern(pattern, startDate, endDate);
 };

 return (
   <div style={{
     backgroundColor: 'white',
     borderRadius: '8px',
     boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
     width: '100%'
   }}>
     {/* En-tête avec bouton pour replier/déplier */}
     <button
       onClick={() => setIsExpanded(!isExpanded)}
       style={{
         width: '100%',
         padding: '1rem 1.5rem',
         display: 'flex',
         justifyContent: 'space-between',
         alignItems: 'center',
         border: 'none',
         background: 'none',
         cursor: 'pointer',
         borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
         transition: 'background-color 0.2s',
         borderRadius: '8px'
       }}
     >
       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
         <h3 style={{
           fontSize: '1.125rem',
           fontWeight: '600',
           color: '#1F2937',
           margin: 0
         }}>
           Pattern hebdomadaire
         </h3>
       </div>
       <div style={{
         display: 'flex',
         alignItems: 'center',
         color: '#6B7280',
         fontSize: '0.875rem',
         gap: '0.5rem'
       }}>
         {isExpanded ? 'Replier' : 'Déplier'}
         {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
       </div>
     </button>

     {isExpanded && (
       <div style={{ padding: '1.5rem' }}>
         <div style={{ marginBottom: '1.5rem' }}>
           <p style={{
             fontSize: '0.875rem',
             color: '#6B7280',
             marginBottom: '1rem'
           }}>
             Définissez votre semaine type ci-dessous. Ce pattern sera appliqué automatiquement sur la période sélectionnée.
           </p>

           {/* Table du pattern */}
           <div style={{ 
             overflowX: 'auto',
             marginBottom: '1.5rem',
             maxWidth: '100%'
           }}>
             <table style={{
               width: '100%',
               borderCollapse: 'collapse',
               fontSize: '0.875rem',
               minWidth: '600px'
             }}>
               <thead>
                 <tr>
                   <th style={{
                     padding: '0.75rem',
                     backgroundColor: '#F3F4F6',
                     borderBottom: '1px solid #E5E7EB',
                     textAlign: 'left',
                     fontWeight: '600',
                     minWidth: '100px'
                   }}>
                     Jour
                   </th>
                   {creneaux.map(creneau => (
                     <th key={creneau.id} style={{
                       padding: '0.75rem',
                       backgroundColor: '#F3F4F6',
                       borderBottom: '1px solid #E5E7EB',
                       textAlign: 'left',
                       fontWeight: '600'
                     }}>
                       <div>{creneau.label}</div>
                       <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{creneau.hours}</div>
                     </th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {jours.map(jour => (
                   <tr key={jour.id}>
                     <td style={{
                       padding: '0.75rem',
                       borderBottom: '1px solid #E5E7EB',
                       fontWeight: '500'
                     }}>
                       {jour.label}
                     </td>
                     {creneaux.map(creneau => (
                       <td key={creneau.id} style={{
                         padding: '0.75rem',
                         borderBottom: '1px solid #E5E7EB'
                       }}>
                         {(!creneau.samediOnly || jour.id === '6') && (
                           <select
                             value={pattern[jour.id]?.[creneau.id] || ''}
                             onChange={(e) => handlePatternChange(jour.id, creneau.id, e.target.value)}
                             style={{
                               width: '100%',
                               padding: '0.5rem',
                               border: '1px solid #D1D5DB',
                               borderRadius: '0.375rem',
                               backgroundColor: 'white'
                             }}
                           >
                             <option value="">-</option>
                             <option value="Oui">Oui</option>
                             <option value="Possible">Possible</option>
                             <option value="Non">Non</option>
                           </select>
                         )}
                       </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {/* Sélection de la période */}
           <div style={{
             display: 'flex',
             flexDirection: 'column',
             gap: '1rem',
             marginBottom: '1.5rem'
           }}>
             <div style={{
               display: 'flex',
               flexWrap: 'wrap',
               gap: '1rem',
               marginBottom: '1rem'
             }}>
               <div style={{ minWidth: '140px', flex: 1 }}>
                 <label style={{
                   display: 'block',
                   fontSize: '0.875rem',
                   fontWeight: '500',
                   color: '#374151',
                   marginBottom: '0.5rem'
                 }}>
                   Du :
                 </label>
                 <input
                   type="date"
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                   style={{
                     padding: '0.5rem',
                     border: '1px solid #D1D5DB',
                     borderRadius: '0.375rem',
                     width: '100%'
                   }}
                 />
               </div>
               <div style={{ minWidth: '140px', flex: 1 }}>
                 <label style={{
                   display: 'block',
                   fontSize: '0.875rem',
                   fontWeight: '500',
                   color: '#374151',
                   marginBottom: '0.5rem'
                 }}>
                   Au :
                 </label>
                 <input
                   type="date"
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                   style={{
                     padding: '0.5rem',
                     border: '1px solid #D1D5DB',
                     borderRadius: '0.375rem',
                     width: '100%'
                   }}
                 />
               </div>
             </div>
             
             <button
               onClick={handleSelectFullPeriod}
               style={{
                 padding: '0.75rem 1rem',
                 backgroundColor: '#EBF5FF',
                 border: '1px solid #2563EB',
                 borderRadius: '0.375rem',
                 color: '#2563EB',
                 fontSize: '0.875rem',
                 cursor: 'pointer',
                 width: '100%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '0.5rem',
                 fontWeight: '500',
                 transition: 'all 0.2s'
               }}
               onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
               onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#EBF5FF'}
             >
               <Calendar size={16} />
               Toute la période
             </button>
           </div>

           {/* Bouton d'application */}
           <button
             onClick={handleApplyPattern}
             style={{
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '0.5rem',
               width: '100%',
               padding: '0.75rem',
               backgroundColor: '#2563EB',
               color: 'white',
               border: 'none',
               borderRadius: '0.375rem',
               fontWeight: '500',
               cursor: 'pointer'
             }}
           >
             <Copy size={18} />
             Appliquer le pattern
           </button>
         </div>
       </div>
     )}
   </div>
 );
}

export default WeeklyPattern;