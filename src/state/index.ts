// Application State Management
// Simple reactive state with subscribers

import type { AppState, AppStateListener, RepoInfo, FileNode } from '../types';

// Initial state
const initialState: AppState = {
  view: 'landing',
  repoUrl: '',
  loading: false,
  error: null,
  currentRepo: null,
  fileTree: null,
  selectedFile: null,
};

// Current state
let state: AppState = { ...initialState };

// State subscribers
const listeners: Set<AppStateListener> = new Set();

/**
 * Get current state (immutable)
 */
export function getState(): AppState {
  return { ...state };
}

/**
 * Subscribe to state changes
 */
export function subscribe(listener: AppStateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Update state and notify subscribers
 */
export function setState(updates: Partial<AppState>, silent = false): void {
  state = { ...state, ...updates };
  if (!silent) {
    listeners.forEach((listener) => listener(state));
  }
}

/**
 * Reset state to initial
 */
export function resetState(): void {
  state = { ...initialState };
  listeners.forEach((listener) => listener(state));
}

// Action helpers
export function setLoading(loading: boolean): void {
  setState({ loading, error: null });
}

export function setError(error: string): void {
  setState({ loading: false, error });
}

export function setRepoUrl(repoUrl: string, silent = true): void {
  // Default silent to prevent re-render on every keystroke
  setState({ repoUrl, error: null }, silent);
}

export function setRepoData(info: RepoInfo, tree: FileNode): void {
  setState({
    currentRepo: info,
    fileTree: tree,
    loading: false,
    error: null,
    view: 'repo',
  });
}

export function selectFile(file: FileNode | null, silent = false): void {
  setState({ selectedFile: file }, silent);
}

export function goToLanding(): void {
  setState({
    view: 'landing',
    currentRepo: null,
    fileTree: null,
    selectedFile: null,
    error: null,
  });
}

// ============================================
// Gamification State (localStorage-based)
// ============================================
// Using localStorage directly to avoid SPA re-render issues

const PROGRESS_KEY = 'repox_user_progress';
const CHALLENGES_KEY = 'repox_challenges_cache';

export interface UserProgress {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  challengesCompleted: number;
  correctAnswers: number;
  totalAnswers: number;
  lastActivityDate: string;
}

const DEFAULT_PROGRESS: UserProgress = {
  totalXP: 0,
  currentStreak: 0,
  longestStreak: 0,
  challengesCompleted: 0,
  correctAnswers: 0,
  totalAnswers: 0,
  lastActivityDate: '',
};

/**
 * Get user progress from localStorage
 */
export function getUserProgress(): UserProgress {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (saved) {
      return { ...DEFAULT_PROGRESS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_PROGRESS };
}

/**
 * Save user progress to localStorage
 */
export function saveUserProgress(progress: UserProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Add XP points and update streak
 */
export function addXP(points: number, wasCorrect: boolean): UserProgress {
  const progress = getUserProgress();
  const today = new Date().toISOString().split('T')[0];
  
  progress.totalXP += points;
  progress.totalAnswers += 1;
  
  if (wasCorrect) {
    progress.correctAnswers += 1;
    progress.currentStreak += 1;
    if (progress.currentStreak > progress.longestStreak) {
      progress.longestStreak = progress.currentStreak;
    }
  } else {
    progress.currentStreak = 0;
  }
  
  progress.lastActivityDate = today;
  saveUserProgress(progress);
  
  return progress;
}

/**
 * Mark a challenge set as completed
 */
export function completeChallengeSet(): UserProgress {
  const progress = getUserProgress();
  progress.challengesCompleted += 1;
  saveUserProgress(progress);
  return progress;
}

/**
 * Get cached challenges for a module
 */
export function getCachedChallenges(repoName: string, moduleIndex: number): import('../services').Challenge[] | null {
  try {
    const key = `${CHALLENGES_KEY}_${repoName}_${moduleIndex}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const data = JSON.parse(saved);
      // Cache for 24 hours
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data.challenges;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Cache challenges for a module
 */
export function cacheChallenges(repoName: string, moduleIndex: number, challenges: import('../services').Challenge[]): void {
  const key = `${CHALLENGES_KEY}_${repoName}_${moduleIndex}`;
  localStorage.setItem(key, JSON.stringify({
    challenges,
    timestamp: Date.now(),
  }));
}

