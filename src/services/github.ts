// GitHub API Service
// Handles all GitHub API interactions with caching and rate limit awareness

import type {
  RepoInfo,
  FileNode,
  TreeNode,
  RateLimitInfo,
  GitHubRepoResponse,
  GitHubTreeResponse,
  CachedRepo,
} from '../types';

const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY_PREFIX = 'repox_cache_';

// Rate limit tracking
let rateLimitInfo: RateLimitInfo = {
  limit: 60,
  remaining: 60,
  reset: Date.now() + 3600000,
};

/**
 * Get current rate limit info
 */
export function getRateLimitInfo(): RateLimitInfo {
  return { ...rateLimitInfo };
}

/**
 * Update rate limit from response headers
 */
function updateRateLimit(headers: Headers): void {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');

  if (limit) rateLimitInfo.limit = parseInt(limit, 10);
  if (remaining) rateLimitInfo.remaining = parseInt(remaining, 10);
  if (reset) rateLimitInfo.reset = parseInt(reset, 10) * 1000;
}

/**
 * Check if we're rate limited
 */
export function isRateLimited(): boolean {
  return rateLimitInfo.remaining <= 0 && Date.now() < rateLimitInfo.reset;
}

/**
 * Get time until rate limit resets (in seconds)
 */
export function getResetTimeSeconds(): number {
  return Math.max(0, Math.ceil((rateLimitInfo.reset - Date.now()) / 1000));
}

/**
 * Parse GitHub URL to extract owner and repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.trim().match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '').replace(/\/$/, ''),
    };
  }
  return null;
}

/**
 * Validate GitHub URL format
 */
export function isValidGitHubUrl(url: string): boolean {
  const pattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/;
  return pattern.test(url.trim());
}

/**
 * Get cached repo data
 */
function getCachedRepo(owner: string, repo: string): CachedRepo | null {
  try {
    const key = `${CACHE_KEY_PREFIX}${owner}/${repo}`;
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const data: CachedRepo = JSON.parse(cached);
    
    // Check if cache is expired
    if (Date.now() - data.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Save repo data to cache
 */
function setCachedRepo(owner: string, repo: string, info: RepoInfo, tree: FileNode): void {
  try {
    const key = `${CACHE_KEY_PREFIX}${owner}/${repo}`;
    const data: CachedRepo = {
      info,
      tree,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Make a GitHub API request
 */
async function githubFetch<T>(endpoint: string): Promise<T> {
  if (isRateLimited()) {
    throw new Error(`Rate limited. Try again in ${getResetTimeSeconds()} seconds.`);
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  updateRateLimit(response.headers);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found. Make sure it exists and is public.');
    }
    if (response.status === 403 && rateLimitInfo.remaining === 0) {
      throw new Error(`Rate limited. Try again in ${getResetTimeSeconds()} seconds.`);
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch repository metadata
 */
async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const data = await githubFetch<GitHubRepoResponse>(`/repos/${owner}/${repo}`);
  
  return {
    owner,
    repo,
    fullName: data.full_name,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language,
    defaultBranch: data.default_branch,
    url: data.html_url,
  };
}

/**
 * Fetch repository tree recursively
 */
async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<TreeNode[]> {
  const data = await githubFetch<GitHubTreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );

  if (data.truncated) {
    console.warn('Repository tree was truncated due to size limits');
  }

  return data.tree;
}

/**
 * Get file extension from path
 */
function getExtension(path: string): string | undefined {
  const parts = path.split('.');
  if (parts.length > 1) {
    return parts.pop()?.toLowerCase();
  }
  return undefined;
}

/**
 * Convert flat tree array to nested FileNode structure
 */
function buildFileTree(nodes: TreeNode[], repoName: string): FileNode {
  const root: FileNode = {
    name: repoName,
    path: '',
    type: 'folder',
    sha: '',
    children: [],
  };

  // Sort nodes: folders first, then alphabetically
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'tree' ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  for (const node of sortedNodes) {
    const parts = node.path.split('/');
    let current = root;

    // Navigate/create path to parent
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let child = current.children?.find((c) => c.name === part);
      
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          type: 'folder',
          sha: '',
          children: [],
        };
        current.children?.push(child);
      }
      current = child;
    }

    // Add the node
    const name = parts[parts.length - 1];
    const fileNode: FileNode = {
      name,
      path: node.path,
      type: node.type === 'tree' ? 'folder' : 'file',
      sha: node.sha,
      size: node.size,
      extension: node.type === 'blob' ? getExtension(node.path) : undefined,
      children: node.type === 'tree' ? [] : undefined,
    };

    current.children?.push(fileNode);
  }

  // Sort children recursively
  function sortChildren(node: FileNode): void {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  }
  sortChildren(root);

  return root;
}

/**
 * Fetch complete repository data (with caching)
 */
export async function fetchRepository(
  owner: string,
  repo: string
): Promise<{ info: RepoInfo; tree: FileNode }> {
  // Check cache first
  const cached = getCachedRepo(owner, repo);
  if (cached) {
    console.log('Using cached repository data');
    return { info: cached.info, tree: cached.tree };
  }

  // Fetch fresh data
  const info = await fetchRepoInfo(owner, repo);
  const treeNodes = await fetchRepoTree(owner, repo, info.defaultBranch);
  const tree = buildFileTree(treeNodes, repo);

  // Cache the result
  setCachedRepo(owner, repo, info, tree);

  return { info, tree };
}

/**
 * Fetch file content from GitHub
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }

  return response.text();
}

// Trending repos types
export interface TrendingRepo {
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  url: string;
}

const TRENDING_CACHE_KEY = 'repox_trending';
const TRENDING_CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour

// OSS Insight API response type
interface OSSInsightResponse {
  data: {
    rows: Array<{
      repo_name: string;
      description: string | null;
      stars: string;
      primary_language: string | null;
    }>;
  };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fetch trending repositories from OSS Insight API
 * Caches full response, returns random 3 for variety
 */
export async function fetchTrendingRepos(): Promise<TrendingRepo[]> {
  let allRepos: TrendingRepo[] = [];
  
  // Check cache first
  try {
    const cached = localStorage.getItem(TRENDING_CACHE_KEY);
    if (cached) {
      const { repos, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < TRENDING_CACHE_DURATION) {
        allRepos = repos;
      }
    }
  } catch {
    // Ignore cache errors
  }

  // If no valid cache, fetch fresh data
  if (allRepos.length === 0) {
    const response = await fetch(
      'https://api.ossinsight.io/v1/trends/repos?period=past_week'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch trending repos');
    }
    
    const data: OSSInsightResponse = await response.json();

    allRepos = data.data.rows.map(item => ({
      fullName: item.repo_name,
      description: item.description,
      stars: parseInt(item.stars) || 0,
      language: item.primary_language,
      url: `https://github.com/${item.repo_name}`,
    }));

    // Cache all repos
    try {
      localStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify({
        repos: allRepos,
        timestamp: Date.now(),
      }));
    } catch {
      // Ignore storage errors
    }
  }

  // Return random 3 from the full list
  return shuffleArray(allRepos).slice(0, 3);
}

// Saved repo history
export interface SavedRepo {
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  url: string;
  savedAt: number;
}

const HISTORY_KEY = 'repox_history';
const MAX_HISTORY = 10;

/**
 * Get saved repo history
 */
export function getRepoHistory(): SavedRepo[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Save repo to history
 */
export function saveRepoToHistory(repo: RepoInfo): void {
  try {
    const history = getRepoHistory();
    
    // Remove if already exists
    const filtered = history.filter(r => r.fullName !== repo.fullName);
    
    // Add to front
    const newEntry: SavedRepo = {
      fullName: repo.fullName,
      description: repo.description,
      stars: repo.stars,
      language: repo.language,
      url: repo.url,
      savedAt: Date.now(),
    };
    
    filtered.unshift(newEntry);
    
    // Keep only MAX_HISTORY items
    const trimmed = filtered.slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}
