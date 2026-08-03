import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { repository } from './repository';
import { guestRepository } from './guest-repository';
import { useAuth } from './auth';

type Repo = typeof repository;

type DataContextValue = {
  repo: Repo;
  isGuest: boolean;
  guestMode: 'sample' | 'empty' | null;
  startSampleMode: () => void;
  startEmptyMode: () => void;
  exitGuestMode: () => void;
  requireAuth: (action: () => void) => void;
  authModalOpen: boolean;
  authModalMessage: string | null;
  closeAuthModal: () => void;
  pendingAction: (() => void) | null;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [guestMode, setGuestMode] = useState<'sample' | 'empty' | null>(() => guestRepository.getMode());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isGuest = !userId;

  const repo: Repo = isGuest ? (guestRepository as unknown as Repo) : repository;

  const startSampleMode = useCallback(() => {
    guestRepository.initSampleMode();
    setGuestMode('sample');
  }, []);

  const startEmptyMode = useCallback(() => {
    guestRepository.initEmptyMode();
    setGuestMode('empty');
  }, []);

  const exitGuestMode = useCallback(() => {
    guestRepository.clear();
    setGuestMode(null);
  }, []);

  const requireAuth = useCallback((action: () => void) => {
    if (isGuest) {
      setPendingAction(() => action);
      setAuthModalMessage('Create a free account or sign in to securely save this information and access it later.');
      setAuthModalOpen(true);
    } else {
      action();
    }
  }, [isGuest]);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalMessage(null);
    setPendingAction(null);
  }, []);

  const value = useMemo<DataContextValue>(() => ({
    repo,
    isGuest,
    guestMode,
    startSampleMode,
    startEmptyMode,
    exitGuestMode,
    requireAuth,
    authModalOpen,
    authModalMessage,
    closeAuthModal,
    pendingAction,
  }), [repo, isGuest, guestMode, startSampleMode, startEmptyMode, exitGuestMode, requireAuth, authModalOpen, authModalMessage, closeAuthModal, pendingAction]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
