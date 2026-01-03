// RepoX - Main Entry Point
import './style.css';
import {
  getState,
  setState,
  subscribe,
  setLoading,
  setError,
  setRepoUrl,
  setRepoData,
  goToLanding,
} from './state';
import {
  isValidGitHubUrl,
  parseGitHubUrl,
  fetchRepository,
  getRateLimitInfo,
} from './services';
import {
  renderFileTree,
  attachFileTreeListeners,
  getFileTreeStyles,
} from './components';

// ASCII Art for the landing page
const ASCII_ART = `
    ____                  _  __
   / __ \\___  ____  ____ | |/ /
  / /_/ / _ \\/ __ \\/ __ \\|   / 
 / _, _/  __/ /_/ / /_/ /   |  
/_/ |_|\\___/ .___/\\____/_/|_|  
          /_/                  
`;

/**
 * Render the header
 */
function renderHeader(): string {
  const state = getState();
  const rateLimit = getRateLimitInfo();
  
  return `
    <header class="header">
      <div class="header-content">
        <div class="logo" ${state.view === 'repo' ? 'id="back-to-home" style="cursor: pointer"' : ''}>
          <span class="logo-icon">&gt;_</span>
          <span>RepoX</span>
        </div>
        <div class="header-right">
          <span class="rate-limit ${rateLimit.remaining < 10 ? 'warning' : ''}">
            API: ${rateLimit.remaining}/${rateLimit.limit}
          </span>
          ${state.currentRepo ? `
            <a href="${state.currentRepo.url}" target="_blank" rel="noopener" class="btn btn-ghost">
              View on GitHub
            </a>
          ` : ''}
        </div>
      </div>
    </header>
  `;
}

/**
 * Render landing page
 */
function renderLanding(): string {
  const state = getState();
  
  return `
    <section class="landing">
      <pre class="ascii-decoration">${ASCII_ART}</pre>
      
      <h1 class="landing-title">
        Learn from <span class="accent">GitHub Repos</span>
      </h1>
      
      <p class="landing-subtitle">
        Transform any repository into an interactive learning experience. 
        Visualize architecture, get AI explanations, and master codebases faster.
      </p>

      <div class="repo-input-wrapper">
        <input 
          type="text" 
          class="input" 
          id="repo-url-input"
          placeholder="https://github.com/owner/repo"
          value="${state.repoUrl}"
        />
        <button class="btn btn-primary" id="explore-btn" ${state.loading ? 'disabled' : ''}>
          ${state.loading ? '<span class="spinner"></span> Loading' : 'Explore'}
        </button>
      </div>

      ${state.error ? `
        <div class="error-message">
          <span>⚠</span>
          <span>${state.error}</span>
        </div>
      ` : ''}

      <div class="features">
        <div class="feature-pill">
          <span class="icon">◈</span>
          <span>Interactive Graphs</span>
        </div>
        <div class="feature-pill">
          <span class="icon">◈</span>
          <span>AI Explanations</span>
        </div>
        <div class="feature-pill">
          <span class="icon">◈</span>
          <span>Learning Paths</span>
        </div>
        <div class="feature-pill">
          <span class="icon">◈</span>
          <span>Code Challenges</span>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render repo info bar
 */
function renderRepoInfo(): string {
  const repo = getState().currentRepo;
  if (!repo) return '';
  
  return `
    <div class="repo-info-bar">
      <div class="repo-name">
        <span class="repo-icon">📦</span>
        <span>${repo.fullName}</span>
      </div>
      <div class="repo-stats">
        ${repo.language ? `<span class="stat"><span class="stat-icon">●</span> ${repo.language}</span>` : ''}
        <span class="stat">⭐ ${formatNumber(repo.stars)}</span>
        <span class="stat">🔱 ${formatNumber(repo.forks)}</span>
      </div>
    </div>
    ${repo.description ? `<p class="repo-description">${repo.description}</p>` : ''}
  `;
}

/**
 * Format large numbers
 */
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Render repo view
 */
function renderRepoView(): string {
  const state = getState();
  if (!state.fileTree) return '';
  
  return `
    <div class="repo-view">
      <aside class="sidebar">
        <div class="sidebar-header">
          ${renderRepoInfo()}
        </div>
        <div class="sidebar-content">
          ${renderFileTree(state.fileTree)}
        </div>
      </aside>
      <main class="content-area">
        ${state.selectedFile ? renderFilePanel() : renderWelcomePanel()}
      </main>
    </div>
  `;
}

/**
 * Render welcome panel when no file is selected
 */
function renderWelcomePanel(): string {
  const fileCount = countFiles(getState().fileTree);
  
  return `
    <div class="welcome-panel">
      <div class="welcome-icon">📂</div>
      <h2>Select a file to explore</h2>
      <p class="text-muted">
        This repository contains ${fileCount} files. 
        Click on any file in the sidebar to view details and get AI explanations.
      </p>
      <div class="welcome-actions">
        <button class="btn btn-primary" id="generate-path-btn" disabled>
          Generate Learning Path (Coming in Step 5)
        </button>
      </div>
    </div>
  `;
}

/**
 * Render file panel
 */
function renderFilePanel(): string {
  const file = getState().selectedFile;
  if (!file) return '';
  
  return `
    <div class="file-panel">
      <div class="file-panel-header">
        <h3 class="file-panel-title">
          <span class="file-icon">📄</span>
          ${file.name}
        </h3>
        <span class="file-path text-muted">${file.path}</span>
      </div>
      <div class="file-panel-content">
        <div class="file-actions">
          <button class="btn btn-primary" id="explain-btn" disabled>
            Explain This File (Coming in Step 4)
          </button>
          <button class="btn btn-ghost" id="view-raw-btn">
            View Raw
          </button>
        </div>
        <div class="file-preview" id="file-preview">
          <p class="text-muted">Click "View Raw" to see file contents, or wait for Step 4 for AI explanations.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Count files in tree
 */
function countFiles(node: import('./types').FileNode | null): number {
  if (!node) return 0;
  if (node.type === 'file') return 1;
  return node.children?.reduce((sum, child) => sum + countFiles(child), 0) || 0;
}

/**
 * Main render function
 */
function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  
  const state = getState();

  // Inject dynamic styles
  const styleId = 'repox-dynamic-styles';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = getFileTreeStyles() + getRepoViewStyles();

  app.innerHTML = `
    ${renderHeader()}
    <main class="main">
      ${state.view === 'landing' ? renderLanding() : renderRepoView()}
    </main>
    <footer class="footer">
      <p>Built for Hacks for Hackers 2026 | Powered by Gemini, MongoDB, Cloudflare</p>
    </footer>
  `;

  attachEventListeners();
}

/**
 * Get repo view styles
 */
function getRepoViewStyles(): string {
  return `
    .header-right {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    
    .rate-limit {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      padding: var(--space-1) var(--space-2);
      background: var(--color-surface);
      border-radius: var(--radius-sm);
    }
    
    .rate-limit.warning {
      color: var(--color-warning);
      border: 1px solid var(--color-warning);
    }
    
    .repo-view {
      display: grid;
      grid-template-columns: var(--sidebar-width) 1fr;
      height: calc(100vh - var(--header-height) - 60px);
      overflow: hidden;
    }
    
    .sidebar {
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .sidebar-header {
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    
    .sidebar-content {
      flex: 1;
      overflow-y: auto;
    }
    
    .repo-info-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    
    .repo-name {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-family: var(--font-mono);
      font-weight: 600;
      font-size: var(--text-sm);
    }
    
    .repo-stats {
      display: flex;
      gap: var(--space-3);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    
    .stat {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }
    
    .repo-description {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      line-height: 1.4;
    }
    
    .content-area {
      background: var(--color-bg);
      overflow-y: auto;
      padding: var(--space-6);
    }
    
    .welcome-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: var(--space-8);
    }
    
    .welcome-icon {
      font-size: 4rem;
      margin-bottom: var(--space-4);
    }
    
    .welcome-panel h2 {
      margin-bottom: var(--space-2);
    }
    
    .welcome-panel p {
      max-width: 400px;
      margin-bottom: var(--space-6);
    }
    
    .file-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .file-panel-header {
      margin-bottom: var(--space-4);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    
    .file-panel-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-1);
    }
    
    .file-path {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
    }
    
    .file-actions {
      display: flex;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    
    .file-preview {
      flex: 1;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      overflow: auto;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      white-space: pre-wrap;
    }
    
    @media (max-width: 768px) {
      .repo-view {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }
      
      .sidebar {
        max-height: 40vh;
      }
    }
  `;
}

/**
 * Attach event listeners
 */
function attachEventListeners(): void {
  const state = getState();
  
  if (state.view === 'landing') {
    const input = document.querySelector<HTMLInputElement>('#repo-url-input');
    const button = document.querySelector<HTMLButtonElement>('#explore-btn');

    if (input) {
      input.addEventListener('input', (e) => {
        setRepoUrl((e.target as HTMLInputElement).value);
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleExplore();
        }
      });
      
      // Focus the input
      input.focus();
    }

    if (button) {
      button.addEventListener('click', handleExplore);
    }
  } else {
    // Repo view listeners
    attachFileTreeListeners();
    
    const backBtn = document.getElementById('back-to-home');
    if (backBtn) {
      backBtn.addEventListener('click', goToLanding);
    }
    
    const viewRawBtn = document.getElementById('view-raw-btn');
    if (viewRawBtn) {
      viewRawBtn.addEventListener('click', handleViewRaw);
    }
  }
}

/**
 * Handle explore button click
 */
async function handleExplore(): Promise<void> {
  const url = getState().repoUrl.trim();

  if (!url) {
    setError('Please enter a GitHub repository URL');
    return;
  }

  if (!isValidGitHubUrl(url)) {
    setError('Invalid GitHub URL. Format: https://github.com/owner/repo');
    return;
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    setError('Could not parse repository URL');
    return;
  }

  setLoading(true);

  try {
    const { info, tree } = await fetchRepository(parsed.owner, parsed.repo);
    setRepoData(info, tree);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch repository');
  }
}

/**
 * Handle view raw button
 */
async function handleViewRaw(): Promise<void> {
  const state = getState();
  const file = state.selectedFile;
  const repo = state.currentRepo;
  
  if (!file || !repo) return;
  
  const preview = document.getElementById('file-preview');
  if (!preview) return;
  
  preview.innerHTML = '<span class="text-muted">Loading...</span>';
  
  try {
    const { fetchFileContent } = await import('./services');
    const content = await fetchFileContent(repo.owner, repo.repo, file.path);
    preview.textContent = content;
  } catch (err) {
    preview.innerHTML = `<span class="error-message">Failed to load file: ${err instanceof Error ? err.message : 'Unknown error'}</span>`;
  }
}

// Subscribe to state changes
subscribe(() => render());

// Listen for custom re-render events (from file tree)
window.addEventListener('repox:rerender', () => render());

// Initialize
render();
