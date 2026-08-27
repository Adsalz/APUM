// src/components/Login.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import {
  loginUser,
  loginMedecin,
  logoutUser,
  fixerCodeMedecin,
  annulerReclamation,
} from '../services/authService';
import { getUser } from '../services/userService';
import { getAnnuaire } from '../services/annuaireService';
import { getPeriodeSaisie } from '../services/planningService';
import { getInscriptionOuverte } from '../services/inscriptionService';
import {
  CODE_MEDECIN_LONGUEUR,
  CODE_MEDECIN_REGEX,
  marquerReclamationEnCours,
  effacerReclamationEnCours,
  reclamationEnCours,
} from '../constants/claim';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Card, CodePad, FormField, Modal, Select } from './ui';
import logger from '../utils/logger';

// Message générique volontairement identique pour code erroné / compte
// inexistant / compte désactivé : ne pas permettre de savoir si un compte
// existe (anti-énumération). Les cas « trop de tentatives » et « réseau » sont
// distingués car informatifs sans révéler l'existence d'un compte.
const mapAuthError = (err) => {
  switch (err && err.code) {
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/network-request-failed':
      return 'Connexion impossible. Vérifiez votre connexion internet.';
    default:
      return 'Identifiants incorrects ou erreur de connexion.';
  }
};

function Login() {
  const { firebaseUser, role, loading: authLoading, profileIndisponible } = useAuth();
  const navigate = useNavigate();

  // 'medecin' = liste déroulante + code à 6 chiffres (parcours des médecins)
  // 'email'   = email + mot de passe, RÉSERVÉ AUX ADMINISTRATEURS : un médecin
  //             qui s'y authentifierait (son code EST son mot de passe) est
  //             déconnecté et renvoyé vers la liste. Un médecin qui a oublié son
  //             code passe par « Code oublié ? », pas par ici.
  const [mode, setMode] = useState('medecin');

  // Annuaire public (liste déroulante)
  const [annuaire, setAnnuaire] = useState([]);
  const [annuaireLoading, setAnnuaireLoading] = useState(true);
  const [annuaireError, setAnnuaireError] = useState(false);

  // Période de saisie (lecture publique du doc planning/periode_saisie)
  const [periode, setPeriode] = useState(null);

  // Fenêtre d'inscription (null = inconnue/chargement, true/false ensuite)
  const [inscriptionOuverte, setInscriptionOuverte] = useState(null);

  // Champs médecin
  const [selectedUid, setSelectedUid] = useState('');
  const [code, setCode] = useState('');

  // Champs email (admin / repli)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Double saisie à la première connexion : quand le compte n'a pas encore de
  // code, on demande une confirmation AVANT de le fixer — sans quoi une faute
  // de frappe deviendrait le code du médecin, sans erreur affichée.
  const [confirmation, setConfirmation] = useState(false);
  const [codeConfirme, setCodeConfirme] = useState('');

  // Réclamation interrompue : l'onglet a été rechargé pendant la seconde saisie
  // (marqueur sessionStorage). La session Firebase est encore ouverte avec le
  // code partagé — on la referme dès qu'elle est restaurée, et on explique.
  const [reclamationInterrompue, setReclamationInterrompue] = useState(() => reclamationEnCours());

  // Modale « code oublié » (parcours médecin) : envoi d'un lien de
  // réinitialisation à l'adresse que l'annuaire associe au nom choisi — le
  // médecin n'a donc pas à connaître ni saisir son email.
  const [showCodeOublie, setShowCodeOublie] = useState(false);
  const [oubliError, setOubliError] = useState('');
  const [oubliSuccess, setOubliSuccess] = useState('');
  const [oubliLoading, setOubliLoading] = useState(false);

  // Modale de réinitialisation par email (parcours admin uniquement)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [modalResetError, setModalResetError] = useState('');
  const [modalResetSuccess, setModalResetSuccess] = useState('');
  const [modalResetLoading, setModalResetLoading] = useState(false);

  const selectRef = useRef(null);
  const emailRef = useRef(null);

  const selectedEntry = annuaire.find((a) => a.id === selectedUid) || null;
  const selectedEmail = selectedEntry ? selectedEntry.email : '';

  // Bandeau de période. [start, end] est la PÉRIODE À PLANIFIER (le trimestre
  // sur lequel les médecins expriment leurs desiderata), et NON la fenêtre de
  // saisie : on n'affiche le rappel que tant que la période n'a pas commencé.
  const periodeInfo = useMemo(() => {
    if (!periode || !periode.startDate || !periode.endDate) return null;
    const start = new Date(periode.startDate);
    const end = new Date(periode.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const now = new Date();
    if (now >= start) return null;
    const fmt = (d) =>
      d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return {
      kind: 'info',
      text: `Desiderata pour la période du ${fmt(start)} au ${fmt(end)}.`,
    };
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

  // Période de saisie + état des inscriptions (best-effort : en cas d'échec,
  // pas de bandeau / inscriptions considérées fermées — jamais bloquant).
  useEffect(() => {
    getPeriodeSaisie()
      .then((p) => setPeriode(p))
      .catch(() => setPeriode(null));
    getInscriptionOuverte()
      .then((open) => setInscriptionOuverte(open))
      .catch(() => setInscriptionOuverte(false));
  }, []);

  useEffect(() => {
    if (!reclamationInterrompue || authLoading) { return; }
    effacerReclamationEnCours();
    annulerReclamation().finally(() => {
      setReclamationInterrompue(false);
      setError(
        'La définition de votre code a été interrompue. Recommencez : choisissez votre nom, '
        + 'puis saisissez le code souhaité.'
      );
    });
  }, [reclamationInterrompue, authLoading]);

  // Session ouverte sans profil exploitable (compte supprimé, profil illisible) :
  // rien ne peut s'afficher dans l'application, on referme la session et on
  // explique — plutôt que de laisser l'utilisateur connecté sur une page vide.
  useEffect(() => {
    if (authLoading || !firebaseUser || !profileIndisponible || isLoading || confirmation) { return; }
    logoutUser().catch((err) => logger.error('Déconnexion (profil indisponible):', err));
    setError(
      'Votre profil est introuvable : votre compte n\'est peut-être plus actif. '
      + 'Contactez votre administrateur.'
    );
  }, [authLoading, firebaseUser, profileIndisponible, isLoading, confirmation]);

  // Focus du champ email quand on bascule en mode email.
  useEffect(() => {
    if (mode === 'email') {
      emailRef.current?.focus();
    }
  }, [mode]);

  // Focus du <select> médecin une fois l'annuaire chargé ET le contrôle activé.
  useEffect(() => {
    if (mode === 'medecin' && !annuaireLoading && !annuaireError && annuaire.length > 0) {
      selectRef.current?.focus();
    }
  }, [mode, annuaireLoading, annuaireError, annuaire.length]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setIsLoading(false);
  };

  // Redirige vers le point d'entrée du rôle après une connexion réussie. Le
  // médecin passe par /accueil, qui le pose aussitôt sur l'écran d'actualité.
  const finishLogin = async (uid) => {
    const user = await getUser(uid);
    if (!user) {
      throw new Error('Utilisateur non trouvé dans Firestore');
    }
    if (user.role === 'medecin') {
      navigate('/accueil', { replace: true });
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
    if (!CODE_MEDECIN_REGEX.test(code)) {
      setError(`Le code doit comporter ${CODE_MEDECIN_LONGUEUR} chiffres.`);
      return;
    }

    setIsLoading(true);
    try {
      const { statut, credential } = await loginMedecin(
        selectedEmail,
        code,
        inscriptionOuverte === true
      );
      if (!credential || !credential.user) {
        throw new Error('Échec de l\'authentification');
      }
      // Compte sans code : on demande la seconde saisie avant de le fixer. La
      // session est déjà ouverte (code partagé) — d'où le garde `confirmation`
      // sur la redirection plus bas.
      if (statut === 'a_confirmer') {
        marquerReclamationEnCours();
        setCodeConfirme('');
        setConfirmation(true);
        setIsLoading(false);
        return;
      }
      await finishLogin(credential.user.uid);
    } catch (err) {
      logger.error('Erreur de connexion (médecin):', err);
      setError(mapAuthError(err));
      setIsLoading(false);
    }
  };

  // Seconde saisie : les deux codes doivent concorder pour être adoptés.
  const handleConfirmationSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (codeConfirme !== code) {
      setCodeConfirme('');
      setError('Les deux saisies ne correspondent pas. Ressaisissez votre code.');
      return;
    }

    setIsLoading(true);
    try {
      await fixerCodeMedecin(code);
      effacerReclamationEnCours();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Session perdue pendant la confirmation');
      }
      setConfirmation(false);
      await finishLogin(user.uid);
    } catch (err) {
      // fixerCodeMedecin déconnecte en cas d'échec : on repart de zéro.
      logger.error('Erreur lors de la définition du code:', err);
      effacerReclamationEnCours();
      setConfirmation(false);
      setCode('');
      setCodeConfirme('');
      setError('Le code n\'a pas pu être enregistré. Reprenez la connexion.');
      setIsLoading(false);
    }
  };

  // Abandon : referme la session ouverte avec le code partagé. Le compte reste
  // sans code, le médecin pourra recommencer.
  const annulerConfirmation = async () => {
    effacerReclamationEnCours();
    setConfirmation(false);
    setCode('');
    setCodeConfirme('');
    setError('');
    await annulerReclamation();
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
      // Verrou de rôle : l'authentification a réussi, mais ce parcours n'est pas
      // le sien. On le déconnecte immédiatement plutôt que de le laisser dans
      // une session ouverte par une porte qui ne lui est pas destinée.
      if (userCredential.role !== 'admin') {
        await logoutUser();
        setError(
          'Cet accès est réservé aux administrateurs. Revenez à la connexion médecin : '
          + 'choisissez votre nom dans la liste, puis saisissez votre code.'
        );
        setIsLoading(false);
        return;
      }
      await finishLogin(userCredential.user.uid);
    } catch (err) {
      logger.error('Erreur de connexion (email):', err);
      setError(mapAuthError(err));
      setIsLoading(false);
    }
  };

  const openCodeOublie = () => {
    setOubliError('');
    setOubliSuccess('');
    setShowCodeOublie(true);
  };

  // Envoie le lien de réinitialisation Firebase Auth. Ces emails partent de
  // Firebase directement (pas de l'extension Trigger Email), donc sans
  // dépendance à la configuration SMTP du projet.
  const handleCodeOublie = async () => {
    setOubliError('');
    setOubliSuccess('');
    if (!selectedEmail) {
      setOubliError('Sélectionnez d\'abord votre nom dans la liste.');
      return;
    }
    setOubliLoading(true);
    try {
      await sendPasswordResetEmail(auth, selectedEmail, {
        url: `${window.location.origin}/`,
        handleCodeInApp: false,
      });
      setOubliSuccess(
        `Un email vient d'être envoyé à ${selectedEmail}. Ouvrez le lien qu'il contient, ` +
        'puis saisissez 6 chiffres : ce sera votre nouveau code.'
      );
    } catch (err) {
      logger.error('Erreur lors de l\'envoi du lien de réinitialisation (médecin):', err);
      setOubliError(
        'Envoi impossible pour le moment. Réessayez dans quelques minutes, ' +
        'ou contactez votre administrateur.'
      );
    } finally {
      setOubliLoading(false);
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

  // Utilisateur déjà connecté : renvoi direct vers son point d'entrée.
  // On EXCLUT le cas d'une soumission en cours (isLoading) : sur le parcours de
  // réclamation, la connexion au code de réclamation déclenche onAuthStateChanged
  // AVANT que updatePassword ne soit résolu ; sans ce garde, on redirigerait avec
  // une session encore au code de réclamation. La navigation est alors pilotée
  // uniquement par finishLogin, après réclamation réussie.
  if (!authLoading && firebaseUser && role && !isLoading && !confirmation && !reclamationInterrompue) {
    return (
      <Navigate to={role === 'admin' ? '/dashboard-admin' : '/accueil'} replace />
    );
  }

  const medecinSubmitDisabled =
    isLoading ||
    annuaireLoading ||
    inscriptionOuverte === null ||
    !selectedUid ||
    !CODE_MEDECIN_REGEX.test(code);

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
            {mode !== 'medecin'
              ? 'Espace administrateur'
              : confirmation
              ? 'Confirmez le code que vous avez choisi'
              : 'Choisissez votre nom pour vous connecter'}
          </p>
        </div>

        {/* Bandeau période de saisie (lecture publique) */}
        {periodeInfo && (
          <div className="px-6 pt-5">
            <Alert kind={periodeInfo.kind}>{periodeInfo.text}</Alert>
          </div>
        )}

        {/* ---------- Première connexion : seconde saisie du code ---------- */}
        {mode === 'medecin' && confirmation ? (
          <form onSubmit={handleConfirmationSubmit} className="p-6">
            {/* Le nom est rappelé en évidence : avec des libellés proches dans
                la liste, c'est le dernier moment pour s'apercevoir qu'on est en
                train de fixer le code d'un confrère. */}
            <Alert kind="info" className="mb-4">
              Vous définissez le code de{' '}
              <strong className="text-ink-900">
                {selectedEntry ? selectedEntry.label : 'ce compte'}
              </strong>
              . Ce compte n'a pas encore de code&nbsp;: ressaisissez celui que vous venez de
              choisir pour le confirmer, il sera le vôtre pour tout le trimestre.
            </Alert>
            <p className="mb-4 text-center text-xs text-ink-500">
              Ce n'est pas vous&nbsp;? Cliquez sur «&nbsp;Annuler et recommencer&nbsp;» ci-dessous.
            </p>

            <div className="mb-2">
              <span className="mb-3 block text-center text-sm font-semibold text-ink-700">
                Ressaisissez votre code
              </span>
              <CodePad
                value={codeConfirme}
                onChange={setCodeConfirme}
                length={CODE_MEDECIN_LONGUEUR}
                ariaLabel="Confirmation du code à 6 chiffres"
              />
            </div>

            {error && (
              <Alert kind="error" className="mb-4 mt-4">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading || !CODE_MEDECIN_REGEX.test(codeConfirme)}
              className="mt-4 w-full"
            >
              {isLoading ? 'Enregistrement…' : 'Valider mon code'}
            </Button>

            <button
              type="button"
              onClick={annulerConfirmation}
              className="mt-5 block w-full text-center text-xs text-ink-500 hover:text-ink-700 hover:underline"
            >
              Annuler et recommencer
            </button>
          </form>
        ) : /* ---------- Parcours médecin (liste déroulante + code à 6 chiffres) ---------- */
        mode === 'medecin' ? (
          <form onSubmit={handleMedecinSubmit} className="p-6">
            {annuaireError ? (
              <Alert kind="error" className="mb-4">
                Impossible de charger la liste des médecins.
                <div className="mt-2">
                  <Button type="button" size="sm" variant="secondary" onClick={loadAnnuaire}>
                    Réessayer
                  </Button>
                </div>
              </Alert>
            ) : (
              !annuaireLoading && annuaire.length === 0 && (
                <Alert kind="info" className="mb-4">
                  Aucun médecin disponible pour le moment. Contactez votre administrateur.
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

            {/* Pavé numérique cliquable (souris/doigt) + saisie clavier,
                affichage masqué. Fonctionne sur ordinateur comme sur mobile. */}
            <div className="mb-2">
              <span className="mb-3 block text-center text-sm font-semibold text-ink-700">
                Code à 6 chiffres
              </span>
              <CodePad
                value={code}
                onChange={setCode}
                length={CODE_MEDECIN_LONGUEUR}
                ariaLabel="Saisie du code à 6 chiffres"
                describedById={inscriptionOuverte === null ? undefined : 'code-hint'}
              />
            </div>

            {/* Deux états, deux messages : ouverte, le code saisi est adopté ;
                fermée, un médecin dont le code a été remis à zéro se verrait
                sinon refuser sans comprendre pourquoi. L'état des inscriptions
                est public (config/inscription), l'afficher ne révèle rien. */}
            {inscriptionOuverte !== null && (
              <p id="code-hint" className="mb-4 mt-3 text-center text-xs text-ink-500">
                {inscriptionOuverte
                  ? 'Le code que vous saisissez deviendra le vôtre pour tout le trimestre : vous le confirmerez à l\'écran suivant.'
                  : 'Définition des codes fermée : saisissez le code que vous avez choisi. Code oublié, ou jamais défini ? Contactez votre administrateur.'}
              </p>
            )}

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
              onClick={openCodeOublie}
              className="mt-4 block w-full text-center text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
            >
              Code oublié&nbsp;?
            </button>

            <button
              type="button"
              onClick={() => switchMode('email')}
              className="mt-5 block w-full text-center text-xs text-ink-500 hover:text-ink-700 hover:underline"
            >
              Vous êtes administrateur&nbsp;? Connexion par email →
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

      {/* Modale « code oublié » (parcours médecin) */}
      <Modal
        open={showCodeOublie}
        onClose={() => setShowCodeOublie(false)}
        title="Code oublié"
        size="sm"
      >
        {selectedEntry ? (
          <>
            <p className="mb-4 text-sm text-ink-600">
              Un lien de réinitialisation sera envoyé à l'adresse enregistrée pour{' '}
              <strong className="text-ink-900">{selectedEntry.label}</strong> :
              <br />
              <span className="font-semibold text-ink-900">{selectedEmail}</span>
            </p>
            <p className="mb-4 text-xs text-ink-500">
              Le lien vous demandera un nouveau code&nbsp;: saisissez{' '}
              <strong>{CODE_MEDECIN_LONGUEUR} chiffres</strong>, rien d'autre. Pensez à
              regarder dans les courriers indésirables.
            </p>
          </>
        ) : (
          <Alert kind="info" className="mb-4">
            Sélectionnez d'abord votre nom dans la liste, puis rouvrez cette fenêtre&nbsp;:
            le lien part vers l'adresse qui vous est associée.
          </Alert>
        )}

        {oubliError && (
          <Alert kind="error" className="mb-4">
            {oubliError}
          </Alert>
        )}
        {oubliSuccess && (
          <Alert kind="success" className="mb-4">
            {oubliSuccess}
          </Alert>
        )}

        <Button
          onClick={handleCodeOublie}
          loading={oubliLoading}
          disabled={!selectedEmail || Boolean(oubliSuccess)}
          className="w-full"
        >
          {oubliLoading ? 'Envoi…' : 'Envoyer le lien'}
        </Button>
      </Modal>

      {/* Modale de réinitialisation par email (parcours administrateur) */}
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
