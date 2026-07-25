// src/App.js
import React, { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Outlet,
  Link,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, LoadingScreen } from './components/ui';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';

// Écrans chargés à la demande (code-splitting par route) : seul l'écran de
// connexion est dans le bundle initial, le reste est récupéré à la navigation.
const DashboardMedecin = lazy(() => import('./components/DashboardMedecin'));
const DashboardAdmin = lazy(() => import('./components/DashboardAdmin'));
const FormulaireDesirata = lazy(() => import('./components/FormulaireDesirata'));
const FormulaireDesiderataAdmin = lazy(() => import('./components/FormulaireDesiderataAdmin'));
const GestionUtilisateurs = lazy(() => import('./components/GestionUtilisateurs'));
const GestionPlanning = lazy(() => import('./components/planning/GestionPlanning'));
const GestionPeriodeSaisie = lazy(() => import('./components/GestionPeriodeSaisie'));
const PlanningVisualisation = lazy(() => import('./components/PlanningVisualisation'));
const GestionDesiderata = lazy(() => import('./components/GestionDesiderata'));

// Harnais de développement (jamais monté en production) : rejoue l'écran
// d'édition du planning sur des données fictives, sans Firebase ni auth.
const isDev = process.env.NODE_ENV === 'development';
const PlanningEditPreview = isDev
  ? lazy(() => import('./devtools/PlanningEditPreview'))
  : null;

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-100 p-6 text-center">
      <p className="text-6xl font-extrabold text-primary-600">404</p>
      <h1 className="text-2xl font-bold text-ink-900">Page introuvable</h1>
      <p className="text-ink-500">La page demandée n'existe pas ou a été déplacée.</p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}

// Layout racine : fournit la frontière Suspense des écrans lazy.
function RootLayout() {
  return (
    <Suspense fallback={<LoadingScreen message="Chargement…" />}>
      <Outlet />
    </Suspense>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path="/" element={<Login />} />

      {/* Espace médecin */}
      <Route element={<ProtectedRoute roles={['medecin']} />}>
        <Route path="/dashboard-medecin" element={<DashboardMedecin />} />
      </Route>

      {/* Écrans partagés médecin + admin */}
      <Route element={<ProtectedRoute roles={['medecin', 'admin']} />}>
        <Route path="/formulaire-desirata" element={<FormulaireDesirata />} />
        <Route path="/planning-visualisation" element={<PlanningVisualisation />} />
      </Route>

      {/* Espace administrateur */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/dashboard-admin" element={<DashboardAdmin />} />
        <Route path="/desiderata-admin" element={<FormulaireDesiderataAdmin />} />
        <Route path="/gestion-utilisateurs" element={<GestionUtilisateurs />} />
        <Route path="/gestion-planning-admin" element={<GestionPlanning />} />
        <Route path="/gestion-periode-saisie" element={<GestionPeriodeSaisie />} />
        <Route path="/gestion-desiderata" element={<GestionDesiderata />} />
      </Route>

      {isDev && (
        <Route path="/__dev/planning-edit" element={<PlanningEditPreview />} />
      )}

      <Route path="*" element={<NotFound />} />
    </Route>
  )
);

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
