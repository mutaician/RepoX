// App-wide types

export interface AppState {
  view: 'landing' | 'repo';
  repoUrl: string;
  loading: boolean;
  error: string | null;
  currentRepo: import('./github').RepoInfo | null;
  fileTree: import('./github').FileNode | null;
  selectedFile: import('./github').FileNode | null;
}

export type AppStateListener = (state: AppState) => void;
