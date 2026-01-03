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
export function setState(updates: Partial<AppState>): void {
  state = { ...state, ...updates };
  listeners.forEach((listener) => listener(state));
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

export function setRepoUrl(repoUrl: string): void {
  setState({ repoUrl, error: null });
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

export function selectFile(file: FileNode | null): void {
  setState({ selectedFile: file });
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
