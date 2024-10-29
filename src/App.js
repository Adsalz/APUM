// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Login from './components/Login';
import DashboardMedecin from './components/DashboardMedecin';
import DashboardAdmin from './components/DashboardAdmin';
import FormulaireDesirata from './components/FormulaireDesirata';
import GestionUtilisateurs from './components/GestionUtilisateurs';
import GestionPlanning from './components/planning/GestionPlanning';
import GestionPeriodeSaisie from './components/GestionPeriodeSaisie';
import PlanningVisualisation from './components/PlanningVisualisation'; // Ajout de l'import

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" component={Login} />
          <Route path="/dashboard-medecin" component={DashboardMedecin} />
          <Route path="/dashboard-admin" component={DashboardAdmin} />
          <Route path="/formulaire-desirata" component={FormulaireDesirata} />
          <Route path="/gestion-utilisateurs" component={GestionUtilisateurs} />
          <Route path="/gestion-planning-admin" render={() => <GestionPlanning isAdmin={true} />} />
          <Route path="/planning-visualisation" component={PlanningVisualisation} />
          <Route path="/gestion-periode-saisie" component={GestionPeriodeSaisie} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;