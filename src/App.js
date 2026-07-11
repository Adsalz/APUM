// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import DashboardMedecin from './components/DashboardMedecin';
import DashboardAdmin from './components/DashboardAdmin';
import FormulaireDesirata from './components/FormulaireDesirata';
import FormulaireDesiderataAdmin from './components/FormulaireDesiderataAdmin';
import GestionUtilisateurs from './components/GestionUtilisateurs';
import GestionPlanning from './components/planning/GestionPlanning';
import GestionPeriodeSaisie from './components/GestionPeriodeSaisie';
import PlanningVisualisation from './components/PlanningVisualisation';
import GestionDesiderata from './components/GestionDesiderata';

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-6 text-center">
      <h1 className="text-3xl font-bold text-gray-900">Page introuvable</h1>
      <p className="text-gray-600">La page demandée n'existe pas ou a été déplacée.</p>
      <Link to="/" className="font-medium text-primary-600 hover:underline">
        Retour à l'accueil
      </Link>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Switch>
          <Route exact path="/" component={Login} />

          {/* Espace médecin */}
          <ProtectedRoute
            path="/dashboard-medecin"
            roles={['medecin']}
            component={DashboardMedecin}
          />
          <ProtectedRoute
            path="/formulaire-desirata"
            roles={['medecin', 'admin']}
            component={FormulaireDesirata}
          />
          <ProtectedRoute
            path="/planning-visualisation"
            roles={['medecin', 'admin']}
            component={PlanningVisualisation}
          />

          {/* Espace administrateur */}
          <ProtectedRoute
            path="/dashboard-admin"
            roles={['admin']}
            component={DashboardAdmin}
          />
          <ProtectedRoute
            path="/desiderata-admin"
            roles={['admin']}
            component={FormulaireDesiderataAdmin}
          />
          <ProtectedRoute
            path="/gestion-utilisateurs"
            roles={['admin']}
            component={GestionUtilisateurs}
          />
          <ProtectedRoute
            path="/gestion-planning-admin"
            roles={['admin']}
            render={() => <GestionPlanning isAdmin={true} />}
          />
          <ProtectedRoute
            path="/gestion-periode-saisie"
            roles={['admin']}
            component={GestionPeriodeSaisie}
          />
          <ProtectedRoute
            path="/gestion-desiderata"
            roles={['admin']}
            component={GestionDesiderata}
          />

          <Route component={NotFound} />
        </Switch>
      </Router>
    </AuthProvider>
  );
}

export default App;
