// GitHub API Types

export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  defaultBranch: string;
  url: string;
}

export interface TreeNode {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface RepoTree {
  sha: string;
  url: string;
  tree: TreeNode[];
  truncated: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  sha: string;
  size?: number;
  children?: FileNode[];
  extension?: string;
}

export interface CachedRepo {
  info: RepoInfo;
  tree: FileNode;
  timestamp: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// GitHub API Response Types
export interface GitHubRepoResponse {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  default_branch: string;
  html_url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: TreeNode[];
  truncated: boolean;
}
