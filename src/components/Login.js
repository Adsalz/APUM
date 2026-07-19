// src/components/Login.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { loginUser } from '../services/authService';
import { getUser } from '../services/userService';
import { getAnnuaire } from '../services/annuaireService';
import { getPeriodeSaisie } from '../services/planningService';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Card, FormField, Modal, Select } from './ui';
import logger from '../utils/logger';

// Message générique volontairement identique pour mot de passe erroné / compte
// inexistant / compte désactivé : ne pas permettre de savoir si un compte
// existe (anti-énumération). Les cas « trop de tentatives » et « réseau » sont
// distingués car informatifs sans révéler l'existence d'un compte.
const mapAuthError = (err) => {
  switch (err && err.code) {
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes ou réinitialisez votre code.';
    case 'auth/network-request-failed':
      return 'Connexion impossible. Vérifiez votre connexion internet.';
    default:
      return 'Identifiants incorrects ou erreur de connexion.';
  }
};

function Login() {
  const { firebaseUser, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // 'medecin' = liste déroulante (parcours par défaut, sans email)
  // 'email'   = email + mot de passe (administrateurs ET repli médecin si
  //             l'annuaire est indisponible)
  const [mode, setMode] = useState('medecin');

  // Annuaire public (liste déroulante)
  const [annuaire, setAnnuaire] = useState([]);
  const [annuaireLoading, setAnnuaireLoading] = useState(true);
  const [annuaireError, setAnnuaireError] = useState(false);

  // Période de saisie en cours (lecture publique du doc planning/periode_saisie)
  const [periode, setPeriode] = useState(null);

  // Champs médecin
  const [selectedUid, setSelectedUid] = useState('');
  const [code, setCode] = useState('');

  // Champs email (admin / repli)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Réinitialisation inline (parcours médecin)
  const [resetInfo, setResetInfo] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Modale de réinitialisation (parcours email)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [modalResetError, setModalResetError] = useState('');
  const [modalResetSuccess, setModalResetSuccess] = useState('');
  const [modalResetLoading, setModalResetLoading] = useState(false);

  const selectRef = useRef(null);
  const emailRef = useRef(null);

  const selectedEntry = annuaire.find((a) => a.id === selectedUid) || null;
  const selectedEmail = selectedEntry ? selectedEntry.email : '';

  // Bandeau de période de saisie. On affiche la fenêtre configurée sans prétendre
  // bloquer la saisie (l'app ne verrouille pas par date) : « ouverte jusqu'au… »
  // pendant la fenêtre, « à venir » avant, et rien une fois la fenêtre passée.
  const periodeInfo = useMemo(() => {
    if (!periode || !periode.startDate || !periode.endDate) return null;
    const start = new Date(periode.startDate);
    const end = new Date(periode.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    end.setHours(23, 59, 59, 999); // fin de journée incluse
    const now = new Date();
    if (now > end) return null;
    const fmt = (d) =>
      d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    if (now < start) {
      return { kind: 'info', text: `Prochaine saisie des desiderata : du ${fmt(start)} au ${fmt(end)}.` };
    }
    return { kind: 'success', text: `Saisie des desiderata ouverte jusqu'au ${fmt(end)}.` };
  }, [periode]);

  const loadAnnuaire = useCallback(async () => {
    setAnnuaireLoading(true);
    setAnnuaireError(false);
    try {
      const list = await getAnnuaire();
      setAnnuaire(list);
    } catch (err) {
      logger.error('Erreur lors du chargement de l\'annuaire:', err);
      setAnnuaireError(true);
    } finally {
      setAnnuaireLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnuaire();
  }, [loadAnnuaire]);

  // Charge la période de saisie pour l'afficher (best-effort : en cas d'échec,
  // simplement pas de bandeau — jamais bloquant pour la connexion).
  useEffect(() => {
    getPeriodeSaisie()
      .then((p) => setPeriode(p))
      .catch(() => setPeriode(null));
  }, []);

  // Focus du champ email quand on bascule en mode email (le champ n'est jamais
  // désactivé, focalisable immédiatement).
  useEffect(() => {
    if (mode === 'email') {
      emailRef.current?.focus();
    }
  }, [mode]);

  // Focus du <select> médecin seulement une fois l'annuaire chargé ET le
  // contrôle activé : au montage il est `disabled` pendant le chargement, et
  // focus() sur un élément désactivé est ignoré. On dépend donc aussi de l'état
  // de chargement pour focaliser dès que le select devient utilisable.
  useEffect(() => {
    if (mode === 'medecin' && !annuaireLoading && !annuaireError && annuaire.length > 0) {
      selectRef.current?.focus();
    }
  }, [mode, annuaireLoading, annuaireError, annuaire.length]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setIsLoading(false);
    setResetInfo('');
    setResetErr('');
  };

  // Redirige vers le bon tableau de bord après une connexion réussie.
  const finishLogin = async (uid) => {
    const user = await getUser(uid);
    if (!user) {
      throw new Error('Utilisateur non trouvé dans Firestore');
    }
    if (user.role === 'medecin') {
      navigate('/dashboard-medecin');
    } else if (user.role === 'admin') {
      navigate('/dashboard-admin');
    } else {
      setError('Rôle utilisateur non reconnu');
      setIsLoading(false);
    }
  };

  const handleMedecinSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedEntry) {
      setError('Sélectionnez votre nom dans la liste.');
      return;
    }
    if (!selectedEmail) {
      // Doc annuaire incohérent (email manquant) : ne pas lancer une
      // authentification vouée à échouer avec un message trompeur.
      setError('Ce profil est incomplet, contactez votre administrateur.');
      logger.error('Entrée annuaire sans email', { uid: selectedUid });
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await loginUser(selectedEmail, code);
      if (!userCredential || !userCredential.user) {
        throw new Error('Échec de l\'authentification');
      }
      await finishLogin(userCredential.user.uid);
    } catch (err) {
      logger.error('Erreur de connexion (médecin):', err);
      setError(mapAuthError(err));
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const userCredential = await loginUser(email, password);
      if (!userCredential || !userCredential.user) {
        throw new Error('Échec de l\'authentification');
      }
      await finishLogin(userCredential.user.uid);
    } catch (err) {
      logger.error('Erreur de connexion (email):', err);
      setError(mapAuthError(err));
      setIsLoading(false);
    }
  };

  // Réinitialisation médecin : envoie le lien à l'email du médecin sélectionné.
  // Message de succès générique et constant (ne révèle pas l'état du compte).
  const handleMedecinReset = async () => {
    setResetInfo('');
    setResetErr('');
    if (!selectedEntry || !selectedEmail) {
      setResetErr('Sélectionnez d\'abord votre nom.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, selectedEmail);
      setResetInfo(
        'Si un compte existe pour ce médecin, un email pour définir votre code vient d\'être envoyé.'
      );
    } catch (err) {
      logger.error('Erreur lors de l\'envoi du lien de définition du code:', err);
      setResetErr('Erreur lors de l\'envoi de l\'email. Réessayez plus tard.');
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetEmail('');
    setModalResetError('');
    setModalResetSuccess('');
  };

  const handleModalReset = async (e) => {
    e.preventDefault();
    setModalResetError('');
    setModalResetSuccess('');
    setModalResetLoading(true);
    try {
      // Réponse identique quel que soit le cas (anti-énumération).
      await sendPasswordResetEmail(auth, resetEmail);
      setModalResetSuccess(
        'Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.'
      );
    } catch (err) {
      logger.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', err);
      setModalResetError('Erreur lors de l\'envoi de l\'email de réinitialisation.');
    } finally {
      setModalResetLoading(false);
    }
  };

  // Utilisateur déjà connecté : renvoi direct vers son tableau de bord
  if (!authLoading && firebaseUser && role) {
    return (
      <Navigate to={role === 'admin' ? '/dashboard-admin' : '/dashboard-medecin'} replace />
    );
  }

  const medecinSubmitDisabled = isLoading || annuaireLoading || !selectedUid || !code;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-100 p-6">
      {/* Halo d'ambiance en arrière-plan */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary-200/40 blur-3xl" />

      <Card className="relative w-full max-w-sm overflow-hidden p-0 shadow-elevated animate-fade-up">
        {/* En-tête */}
        <div className="border-b border-ink-100 bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25">
            <Calendar className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Planning APUM</h1>
          <p className="mt-1 text-sm text-primary-100">
            {mode === 'medecin'
              ? 'Choisissez votre nom pour vous connecter'
              : 'Connexion par email'}
          </p>
        </div>

        {/* Bandeau période de saisie en cours (lecture publique) */}
        {periodeInfo && (
          <div className="px-6 pt-5">
            <Alert kind={periodeInfo.kind}>{periodeInfo.text}</Alert>
          </div>
        )}

        {/* ---------- Parcours médecin (liste déroulante) ---------- */}
        {mode === 'medecin' ? (
          <form onSubmit={handleMedecinSubmit} className="p-6">
            {annuaireError ? (
              <Alert kind="error" className="mb-4">
                Impossible de charger la liste des médecins.
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={loadAnnuaire}>
                    Réessayer
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => switchMode('email')}>
                    Se connecter avec mon email
                  </Button>
                </div>
              </Alert>
            ) : (
              !annuaireLoading && annuaire.length === 0 && (
                <Alert kind="info" className="mb-4">
                  Aucun médecin disponible pour le moment. Contactez votre administrateur,
                  ou connectez-vous par email.
                </Alert>
              )
            )}

            <div className="mb-4">
              <label
                htmlFor="medecin-select"
                className="mb-1.5 block text-sm font-semibold text-ink-700"
              >
                Votre nom
              </label>
              <Select
                id="medecin-select"
                ref={selectRef}
                value={selectedUid}
                onChange={(e) => {
                  setSelectedUid(e.target.value);
                  setError('');
                  setResetInfo('');
                  setResetErr('');
                }}
                disabled={annuaireLoading || annuaireError || annuaire.length === 0}
                required
              >
                <option value="" disabled>
                  {annuaireLoading ? 'Chargement des médecins…' : 'Sélectionnez votre nom'}
                </option>
                {annuaire.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Ancre pour les gestionnaires de mots de passe : un <select> n'est
                pas un champ credential reconnu, cet input caché associe le code
                enregistré à l'email du médecin sélectionné. */}
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={selectedEmail}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />

            <FormField
              label="Code"
              type="password"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="current-password"
              className="mb-2"
            />

            <p className="mb-3 text-xs text-ink-500">
              Première connexion ou code oublié&nbsp;? Sélectionnez votre nom puis
              «&nbsp;Définir / réinitialiser mon code&nbsp;».
            </p>

            {resetErr && (
              <Alert kind="error" className="mb-3">
                {resetErr}
              </Alert>
            )}
            {resetInfo && (
              <Alert kind="success" className="mb-3">
                {resetInfo}
              </Alert>
            )}

            <button
              type="button"
              onClick={handleMedecinReset}
              disabled={!selectedUid || resetLoading}
              className="mb-4 w-full text-center text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline"
            >
              {resetLoading ? 'Envoi…' : 'Définir / réinitialiser mon code'}
            </button>

            {error && (
              <Alert kind="error" className="mb-4">
                {error}
              </Alert>
            )}

            <Button type="submit" loading={isLoading} disabled={medecinSubmitDisabled} className="w-full">
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </Button>

            <button
              type="button"
              onClick={() => switchMode('email')}
              className="mt-5 block w-full text-center text-xs text-ink-500 hover:text-ink-700 hover:underline"
            >
              Administrateur ou dépannage&nbsp;? Connexion par email →
            </button>
          </form>
        ) : (
          /* ---------- Parcours email (admin / repli) ---------- */
          <form onSubmit={handleEmailSubmit} className="p-6">
            <FormField
              label="Email"
              type="email"
              required
              ref={emailRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <FormField
              label="Mot de passe"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="mb-4 w-full text-center text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
            >
              Mot de passe oublié ?
            </button>

            {error && (
              <Alert kind="error" className="mb-4">
                {error}
              </Alert>
            )}

            <Button type="submit" loading={isLoading} className="w-full">
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </Button>

            <button
              type="button"
              onClick={() => switchMode('medecin')}
              className="mt-5 flex w-full items-center justify-center gap-1 text-xs text-ink-500 hover:text-ink-700 hover:underline"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Retour à la connexion médecin
            </button>
          </form>
        )}
      </Card>

      {/* Modale de réinitialisation (parcours email) */}
      <Modal
        open={showResetModal}
        onClose={closeResetModal}
        title="Réinitialisation du mot de passe"
        size="sm"
      >
        <form onSubmit={handleModalReset}>
          <FormField
            label="Email"
            type="email"
            required
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Entrez votre adresse email"
            autoComplete="email"
          />

          {modalResetError && (
            <Alert kind="error" className="mb-4">
              {modalResetError}
            </Alert>
          )}
          {modalResetSuccess && (
            <Alert kind="success" className="mb-4">
              {modalResetSuccess}
            </Alert>
          )}

          <Button type="submit" loading={modalResetLoading} className="w-full">
            {modalResetLoading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default Login;
