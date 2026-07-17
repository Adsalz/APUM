// src/components/desiderata/DesiderataPreferences.js
// Carte « Préférences générales » partagée par les deux écrans de saisie.
import React from 'react';
import { Card, FormField, Checkbox } from '../ui';

function DesiderataPreferences({ preferences, onChange }) {
  const {
    nombreGardesSouhaitees,
    nombreGardesMaxParSemaine,
    gardesGroupees,
    renfortsAssocies,
  } = preferences;

  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">
        Préférences générales
      </h2>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <FormField
          label="Gardes souhaitées par mois"
          type="number"
          min="0"
          className="mb-0"
          value={nombreGardesSouhaitees}
          onChange={(e) => onChange({ nombreGardesSouhaitees: parseInt(e.target.value, 10) || 0 })}
        />
        <FormField
          label="Maximum de gardes par semaine"
          type="number"
          min="1"
          max="7"
          className="mb-0"
          value={nombreGardesMaxParSemaine}
          onChange={(e) => onChange({ nombreGardesMaxParSemaine: parseInt(e.target.value, 10) || 1 })}
        />
        <Checkbox
          checked={gardesGroupees}
          onChange={(v) => onChange({ gardesGroupees: v })}
          label="Gardes groupées dans un même week-end"
        />
        <Checkbox
          checked={renfortsAssocies}
          onChange={(v) => onChange({ renfortsAssocies: v })}
          label="Renforts associés à une garde"
        />
      </div>
    </Card>
  );
}

export default DesiderataPreferences;
