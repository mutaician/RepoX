// RepoX - Main Entry Point
import './style.css';
import './app.css';
import {
  getState,
  subscribe,
  setLoading,
  setError,
  setRepoUrl,
  setRepoData,
  goToLanding,
  selectFile,
  getUserProgress,
  addXP,
  completeChallengeSet,
  getCachedChallenges,
  cacheChallenges,
} from './state';
import {
  isValidGitHubUrl,
  parseGitHubUrl,
  fetchRepository,
  getRateLimitInfo,
  getRepoHistory,
  fetchTrendingRepos,
  saveRepoToHistory,
  generateChallenges,
  chat,
  type TrendingRepo,
  type Challenge,
  type ChatMessage,
} from './services';
import {
  renderFileTree,
  attachFileTreeListeners,
  getFileTreeStyles,
  initializeGraph,
  getGraphStyles,
  cleanupGraph,
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
  const progress = getUserProgress();
  const hasLearningPath = state.currentRepo ? getSavedLearningPath(state.currentRepo.fullName) !== null : false;
  
  return `
    <header class="header">
      <div class="header-content">
        <div class="logo" ${state.view === 'repo' ? 'id="back-to-home" style="cursor: pointer"' : ''}>
          <span class="logo-icon">&gt;_</span>
          <span>RepoX</span>
        </div>
        <div class="header-right">
          ${progress.totalXP > 0 ? `
            <div class="xp-display" title="Total XP earned">
              <span class="xp-icon">⚡</span>
              <span class="xp-value">${formatNumber(progress.totalXP)} XP</span>
            </div>
            ${progress.currentStreak > 0 ? `
              <div class="streak-display" title="Current streak: ${progress.currentStreak} correct in a row">
                <span class="streak-icon">🔥</span>
                <span class="streak-value">${progress.currentStreak}</span>
              </div>
            ` : ''}
          ` : ''}
          <span class="rate-limit ${rateLimit.remaining < 10 ? 'warning' : ''}">
            API: ${rateLimit.remaining}/${rateLimit.limit}
          </span>
          ${state.currentRepo && hasLearningPath ? `
            <button id="show-learning-path-btn" class="btn btn-ghost">
              Learning Path
            </button>
          ` : ''}
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
  const history = getRepoHistory();
  
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
          <span>!</span>
          <span>${state.error}</span>
        </div>
      ` : ''}

      <div class="features">
        <div class="feature-pill">
          <span class="icon">+</span>
          <span>Interactive Graphs</span>
        </div>
        <div class="feature-pill">
          <span class="icon">+</span>
          <span>AI Explanations</span>
        </div>
        <div class="feature-pill">
          <span class="icon">+</span>
          <span>Learning Paths</span>
        </div>
        <div class="feature-pill">
          <span class="icon">+</span>
          <span>Code Challenges</span>
        </div>
      </div>
      
      ${history.length > 0 ? `
        <div class="repo-section">
          <h3 class="section-title">Recent</h3>
          <div class="repo-cards" id="history-cards">
            ${history.slice(0, 3).map(repo => `
              <button class="repo-card" data-url="${repo.url}">
                <div class="repo-card-header">
                  <span class="repo-card-name">${repo.fullName}</span>
                  <span class="repo-card-stars">${formatStars(repo.stars)}</span>
                </div>
                <p class="repo-card-desc">${repo.description || 'No description'}</p>
                ${repo.language ? `<span class="repo-card-lang">${repo.language}</span>` : ''}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="repo-section">
        <h3 class="section-title">Trending This Week</h3>
        <div class="repo-cards" id="trending-cards">
          <div class="loading-placeholder">Loading trending repos...</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Format star count for display
 */
function formatStars(stars: number): string {
  if (stars >= 1000) {
    return (stars / 1000).toFixed(1) + 'k';
  }
  return stars.toString();
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
  
  // Get current tab from localStorage or default to 'tree'
  const currentTab = localStorage.getItem('repox_view_tab') || 'tree';
  
  return `
    <div class="repo-view ${currentTab === 'graph' ? 'graph-mode' : ''}">
      <aside class="sidebar">
        <div class="sidebar-header">
          ${renderRepoInfo()}
        </div>
        <div class="sidebar-tabs">
          <button class="tab-btn ${currentTab === 'tree' ? 'active' : ''}" data-tab="tree">
            📁 Tree
          </button>
          <button class="tab-btn ${currentTab === 'graph' ? 'active' : ''}" data-tab="graph">
            🔗 Graph
          </button>
        </div>
        <div class="sidebar-content">
          ${renderFileTree(state.fileTree)}
        </div>
      </aside>
      <main class="content-area">
        ${currentTab === 'graph' 
          ? renderGraphPanel() 
          : (state.selectedFile ? renderFilePanel() : renderWelcomePanel())
        }
      </main>
    </div>
  `;
}

/**
 * Render full-size graph panel
 */
function renderGraphPanel(): string {
  return `
    <div class="graph-panel">
      <div class="graph-panel-header">
        <h3>Repository Architecture</h3>
        <div class="graph-controls-inline">
          <button class="btn btn-ghost btn-sm" id="zoom-in-btn">+</button>
          <button class="btn btn-ghost btn-sm" id="zoom-out-btn">−</button>
          <button class="btn btn-ghost btn-sm" id="zoom-reset-btn">Reset</button>
        </div>
      </div>
      <div class="graph-full-container" id="graph-container"></div>
      <div class="graph-legend-inline">
        <span class="legend-item"><span class="legend-dot" style="background: #00d4aa"></span> Folder</span>
        <span class="legend-item"><span class="legend-dot" style="background: #3178c6"></span> TypeScript</span>
        <span class="legend-item"><span class="legend-dot" style="background: #f7df1e"></span> JavaScript</span>
        <span class="legend-item"><span class="legend-dot" style="background: #e34c26"></span> HTML</span>
        <span class="legend-item"><span class="legend-dot" style="background: #1572b6"></span> CSS</span>
        <span class="legend-item"><span class="legend-dot" style="background: #cbcb41"></span> JSON</span>
      </div>
    </div>
  `;
}

/**
 * Render welcome panel when no file is selected
 */
function renderWelcomePanel(): string {
  const state = getState();
  const fileCount = countFiles(state.fileTree);
  const repo = state.currentRepo;
  
  return `
    <div class="welcome-panel">
      <div class="welcome-icon">📂</div>
      <h2>Ready to Learn ${repo?.repo || 'This Repo'}</h2>
      <p class="text-muted">
        This repository contains ${fileCount} files. 
        Generate a personalized learning path or select a file to explore.
      </p>
      <div class="welcome-actions">
        <button class="btn btn-primary" id="generate-path-btn">
          Generate Learning Path
        </button>
      </div>
      <div id="learning-path-container"></div>
    </div>
  `;
}

/**
 * Render file panel
 */
function renderFilePanel(): string {
  const file = getState().selectedFile;
  if (!file) return '';
  
  const eli5Enabled = localStorage.getItem('repox_eli5') === 'true';
  
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
          <button class="btn btn-primary" id="explain-btn">
            Explain with AI
          </button>
          <button class="btn btn-ghost" id="view-raw-btn">
            View Raw
          </button>
          <label class="eli5-toggle">
            <input type="checkbox" id="eli5-checkbox" ${eli5Enabled ? 'checked' : ''}>
            <span>ELI5 Mode</span>
          </label>
        </div>
        <div class="file-preview" id="file-preview">
          <p class="text-muted">Click "Explain with AI" for an AI-powered explanation, or "View Raw" to see file contents.</p>
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
  styleEl.textContent = getFileTreeStyles() + getGraphStyles();

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
  initializeChatButton();
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
    
    // Repo card click handlers
    document.querySelectorAll('.repo-card').forEach((card) => {
      card.addEventListener('click', () => {
        const url = (card as HTMLElement).dataset.url;
        if (url) {
          setRepoUrl(url);
          handleExplore();
        }
      });
    });
    
    // Load trending repos
    loadTrendingRepos();
  } else {
    // Repo view listeners
    const currentTab = localStorage.getItem('repox_view_tab') || 'tree';
    
    // Always attach file tree listeners (sidebar is always visible)
    attachFileTreeListeners();
    
    if (currentTab === 'graph') {
      // Initialize graph in main content area
      const graphContainer = document.getElementById('graph-container');
      const fileTree = getState().fileTree;
      if (graphContainer && fileTree) {
        initializeGraph(fileTree, graphContainer);
      }
    }
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).dataset.tab;
        if (tab) {
          cleanupGraph();
          localStorage.setItem('repox_view_tab', tab);
          render();
        }
      });
    });
    
    const backBtn = document.getElementById('back-to-home');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        cleanupGraph();
        clearChatHistory();
        goToLanding();
      });
    }
    
    const viewRawBtn = document.getElementById('view-raw-btn');
    if (viewRawBtn) {
      viewRawBtn.addEventListener('click', handleViewRaw);
    }
    
    const explainBtn = document.getElementById('explain-btn');
    if (explainBtn) {
      explainBtn.addEventListener('click', handleExplain);
    }
    
    const eli5Checkbox = document.getElementById('eli5-checkbox') as HTMLInputElement;
    if (eli5Checkbox) {
      eli5Checkbox.addEventListener('change', () => {
        localStorage.setItem('repox_eli5', eli5Checkbox.checked.toString());
      });
    }
    
    const generatePathBtn = document.getElementById('generate-path-btn');
    if (generatePathBtn) {
      generatePathBtn.addEventListener('click', handleGenerateLearningPath);
    }
    
    // Learning Path button in header
    const showPathBtn = document.getElementById('show-learning-path-btn');
    if (showPathBtn) {
      showPathBtn.addEventListener('click', () => {
        // Deselect current file to show welcome panel with learning path
        selectFile(null, true);
        render();
        // After render, trigger the learning path display
        setTimeout(() => {
          handleGenerateLearningPath();
        }, 50);
      });
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
    saveRepoToHistory(info);
    setRepoData(info, tree);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch repository');
  }
}

/**
 * Load trending repos asynchronously
 */
async function loadTrendingRepos(): Promise<void> {
  const container = document.getElementById('trending-cards');
  if (!container) return;
  
  try {
    const repos = await fetchTrendingRepos();
    container.innerHTML = repos.map((repo: TrendingRepo) => `
      <button class="repo-card" data-url="${repo.url}">
        <div class="repo-card-header">
          <span class="repo-card-name">${repo.fullName}</span>
          <span class="repo-card-stars">${formatStars(repo.stars)}</span>
        </div>
        <p class="repo-card-desc">${repo.description || 'No description'}</p>
        ${repo.language ? `<span class="repo-card-lang">${repo.language}</span>` : ''}
      </button>
    `).join('');
    
    // Attach click handlers to new cards
    container.querySelectorAll('.repo-card').forEach((card) => {
      card.addEventListener('click', () => {
        const url = (card as HTMLElement).dataset.url;
        if (url) {
          setRepoUrl(url);
          handleExplore();
        }
      });
    });
  } catch (err) {
    container.innerHTML = '<p class="text-muted">Could not load trending repos</p>';
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

/**
 * Handle explain button - calls Gemini AI
 */
async function handleExplain(): Promise<void> {
  const state = getState();
  const file = state.selectedFile;
  const repo = state.currentRepo;
  
  if (!file || !repo) return;
  
  const preview = document.getElementById('file-preview');
  const explainBtn = document.getElementById('explain-btn') as HTMLButtonElement;
  if (!preview) return;
  
  // Show loading state
  preview.innerHTML = `
    <div class="ai-loading">
      <div class="spinner"></div>
      <p>Analyzing file with AI...</p>
      <p class="text-muted">This may take a few seconds</p>
    </div>
  `;
  if (explainBtn) explainBtn.disabled = true;
  
  try {
    // First fetch the file content
    const { fetchFileContent, explainFile } = await import('./services');
    const content = await fetchFileContent(repo.owner, repo.repo, file.path);
    
    // Check ELI5 mode
    const eli5Enabled = localStorage.getItem('repox_eli5') === 'true';
    
    // Then call Gemini API
    const explanation = await explainFile({
      fileName: file.name,
      filePath: file.path,
      fileContent: content,
      repoContext: `Repository: ${repo.fullName}${repo.description ? ` - ${repo.description}` : ''}`,
      eli5: eli5Enabled,
    });
    
    // Render markdown (simple conversion)
    preview.innerHTML = `
      <div class="ai-explanation">
        ${renderMarkdown(explanation)}
      </div>
    `;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    preview.innerHTML = `
      <div class="ai-error">
        <p><strong>Failed to get AI explanation</strong></p>
        <p class="text-muted">${errorMessage}</p>
        <p class="text-muted">Make sure the Cloudflare Worker is running: <code>cd worker && bun run dev</code></p>
      </div>
    `;
  } finally {
    if (explainBtn) explainBtn.disabled = false;
  }
}

/**
 * Simple markdown to HTML converter
 */
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return match;
    });
}

/**
 * Build file structure string from tree for learning path API
 */
function buildFileStructure(node: import('./types').FileNode, prefix = ''): string {
  let result = prefix + node.name + (node.type === 'folder' ? '/' : '') + '\n';
  if (node.children) {
    for (const child of node.children.slice(0, 100)) { // Limit to 100 items
      result += buildFileStructure(child, prefix + '  ');
    }
  }
  return result;
}

/**
 * Handle Generate Learning Path button
 */
async function handleGenerateLearningPath(): Promise<void> {
  const state = getState();
  const repo = state.currentRepo;
  const fileTree = state.fileTree;
  
  if (!repo || !fileTree) return;
  
  const container = document.getElementById('learning-path-container');
  const btn = document.getElementById('generate-path-btn') as HTMLButtonElement;
  if (!container) return;
  
  // Check for saved learning path first
  const savedPath = getSavedLearningPath(repo.fullName);
  if (savedPath && !container.querySelector('.learning-path')) {
    container.innerHTML = renderLearningPathUI(savedPath, repo.fullName);
    attachLearningPathListeners(repo.fullName);
    return;
  }
  
  // Show loading
  container.innerHTML = `
    <div class="learning-path-loading">
      <div class="spinner"></div>
      <p>Generating personalized learning path...</p>
      <p class="text-muted">This may take 10-20 seconds</p>
    </div>
  `;
  if (btn) btn.disabled = true;
  
  try {
    const { generateLearningPath } = await import('./services');
    
    const fileStructure = buildFileStructure(fileTree);
    
    const learningPath = await generateLearningPath({
      repoName: repo.fullName,
      repoDescription: repo.description || undefined,
      fileStructure,
      languages: repo.language ? [repo.language] : undefined,
    });
    
    // Save to localStorage
    saveLearningPath(repo.fullName, learningPath);
    
    container.innerHTML = renderLearningPathUI(learningPath, repo.fullName);
    attachLearningPathListeners(repo.fullName);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    container.innerHTML = `
      <div class="ai-error">
        <p><strong>Failed to generate learning path</strong></p>
        <p class="text-muted">${errorMessage}</p>
      </div>
    `;
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Save learning path to localStorage
 */
function saveLearningPath(repoName: string, path: import('./services').LearningPath): void {
  const key = `repox_learning_path_${repoName}`;
  localStorage.setItem(key, JSON.stringify(path));
}

/**
 * Get saved learning path from localStorage
 */
function getSavedLearningPath(repoName: string): import('./services').LearningPath | null {
  const key = `repox_learning_path_${repoName}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Get module completion state from localStorage
 */
function getModuleCompletion(repoName: string): Record<number, boolean> {
  const key = `repox_module_completion_${repoName}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Save module completion state to localStorage
 */
function saveModuleCompletion(repoName: string, moduleIndex: number, completed: boolean): void {
  const completion = getModuleCompletion(repoName);
  completion[moduleIndex] = completed;
  const key = `repox_module_completion_${repoName}`;
  localStorage.setItem(key, JSON.stringify(completion));
}

/**
 * Attach event listeners for learning path checkboxes
 */
function attachLearningPathListeners(repoName: string): void {
  const checkboxes = document.querySelectorAll('.module-checkbox');
  const savedPath = getSavedLearningPath(repoName);
  
  checkboxes.forEach((checkbox, i) => {
    checkbox.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      saveModuleCompletion(repoName, i, target.checked);
      
      // Update module appearance
      const module = target.closest('.learning-module');
      if (module) {
        module.classList.toggle('completed', target.checked);
      }
      
      // If marking as complete, trigger challenge
      if (target.checked && savedPath?.modules?.[i]) {
        const moduleData = savedPath.modules[i];
        await showChallengeModal(repoName, i, moduleData);
      }
    });
  });
}

/**
 * Render learning path UI
 */
function renderLearningPathUI(path: import('./services').LearningPath, repoName: string): string {
  // Handle case where path is a string (raw response)
  if (typeof path === 'string') {
    return `<div class="ai-explanation">${renderMarkdown(path)}</div>`;
  }
  
  const completion = getModuleCompletion(repoName);
  
  const modulesHtml = path.modules?.map((module, i) => {
    const isCompleted = completion[i] || false;
    return `
    <div class="learning-module${isCompleted ? ' completed' : ''}">
      <div class="module-header">
        <input type="checkbox" class="module-checkbox" ${isCompleted ? 'checked' : ''} data-index="${i}" />
        <span class="module-number">${i + 1}</span>
        <div class="module-info">
          <h4>${module.title}</h4>
          <span class="module-time">${module.estimatedMinutes} min</span>
        </div>
      </div>
      <p class="module-description">${module.description}</p>
      <div class="module-files">
        <strong>Files to study:</strong>
        <ul>
          ${module.files?.map(f => `<li data-file="${f}"><code>${f}</code></li>`).join('') || '<li>No specific files</li>'}
        </ul>
      </div>
      <div class="module-objectives">
        <strong>Objectives:</strong>
        <ul>
          ${module.objectives?.map(o => `<li>${o}</li>`).join('') || '<li>Complete module</li>'}
        </ul>
      </div>
    </div>
  `;
  }).join('') || '';
  
  const projectsHtml = path.projects?.map(project => `
    <div class="project-card">
      <span class="project-difficulty ${project.difficulty}">${project.difficulty}</span>
      <h4>${project.title}</h4>
      <p>${project.description}</p>
    </div>
  `).join('') || '';
  
  return `
    <div class="learning-path">
      <div class="learning-path-header">
        <h3>Your Learning Path</h3>
      </div>
      
      <div class="learning-path-overview">
        <p>${path.overview || 'A structured path to learn this repository.'}</p>
      </div>
      
      ${path.prerequisites?.length ? `
        <div class="learning-path-prereqs">
          <h4>Prerequisites</h4>
          <ul>
            ${path.prerequisites.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="learning-path-modules">
        <h4>Learning Modules</h4>
        ${modulesHtml || '<p class="text-muted">No modules generated</p>'}
      </div>
      
      ${path.projects?.length ? `
        <div class="learning-path-projects">
          <h4>Practice Projects</h4>
          <div class="projects-grid">
            ${projectsHtml}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================
// Challenge Modal System
// ============================================
// Using direct DOM manipulation to avoid SPA re-render issues

interface ChallengeModalState {
  challenges: Challenge[];
  currentIndex: number;
  results: { correct: boolean; points: number }[];
  repoName: string;
  moduleIndex: number;
}

let challengeModalState: ChallengeModalState | null = null;

/**
 * Show challenge modal for a completed module
 */
async function showChallengeModal(
  repoName: string, 
  moduleIndex: number, 
  moduleData: { title: string; description: string; objectives: string[]; files: string[] }
): Promise<void> {
  // Check for cached challenges first
  let challenges = getCachedChallenges(repoName, moduleIndex);
  
  // If no cache, generate new challenges
  if (!challenges || challenges.length === 0) {
    // Show loading modal
    showChallengeLoadingModal();
    
    try {
      const repo = getState().currentRepo;
      challenges = await generateChallenges({
        moduleTitle: moduleData.title,
        moduleDescription: moduleData.description,
        objectives: moduleData.objectives || [],
        files: moduleData.files || [],
        repoName: repo?.fullName || repoName,
      });
      
      if (challenges.length > 0) {
        cacheChallenges(repoName, moduleIndex, challenges);
      }
    } catch (error) {
      console.error('Failed to generate challenges:', error);
      hideChallengeModal();
      return;
    }
  }
  
  if (!challenges || challenges.length === 0) {
    hideChallengeModal();
    return;
  }
  
  // Initialize modal state
  challengeModalState = {
    challenges,
    currentIndex: 0,
    results: [],
    repoName,
    moduleIndex,
  };
  
  renderChallengeQuestion();
}

/**
 * Show loading state in modal
 */
function showChallengeLoadingModal(): void {
  let modal = document.getElementById('challenge-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'challenge-modal';
    modal.className = 'challenge-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="challenge-modal-content">
      <div class="challenge-loading">
        <div class="spinner"></div>
        <h3>Generating Quiz...</h3>
        <p class="text-muted">Creating questions based on this module</p>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

/**
 * Render current challenge question
 */
function renderChallengeQuestion(): void {
  if (!challengeModalState) return;
  
  const { challenges, currentIndex } = challengeModalState;
  const challenge = challenges[currentIndex];
  
  let modal = document.getElementById('challenge-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'challenge-modal';
    modal.className = 'challenge-modal';
    document.body.appendChild(modal);
  }
  
  const progressPercent = ((currentIndex) / challenges.length) * 100;
  
  modal.innerHTML = `
    <div class="challenge-modal-content">
      <div class="challenge-header">
        <div class="challenge-progress">
          <div class="challenge-progress-bar" style="width: ${progressPercent}%"></div>
        </div>
        <span class="challenge-counter">${currentIndex + 1} / ${challenges.length}</span>
        <span class="challenge-points">+${challenge.points} XP</span>
      </div>
      
      <div class="challenge-question">
        <span class="challenge-type">${formatChallengeType(challenge.type)}</span>
        <h3>${escapeHtml(challenge.question)}</h3>
      </div>
      
      <div class="challenge-options">
        ${challenge.options.map((option, i) => `
          <button class="challenge-option" data-index="${i}" data-answer="${escapeHtml(option)}">
            ${escapeHtml(option)}
          </button>
        `).join('')}
      </div>
      
      <button class="btn btn-ghost challenge-skip" id="skip-challenge-btn">
        Skip This Question
      </button>
    </div>
  `;
  
  modal.style.display = 'flex';
  
  // Attach option click handlers
  modal.querySelectorAll('.challenge-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const answer = (btn as HTMLElement).dataset.answer || '';
      handleChallengeAnswer(answer);
    });
  });
  
  // Skip button
  document.getElementById('skip-challenge-btn')?.addEventListener('click', () => {
    handleChallengeAnswer('__SKIP__');
  });
}

/**
 * Handle answer selection
 */
function handleChallengeAnswer(selectedAnswer: string): void {
  if (!challengeModalState) return;
  
  const { challenges, currentIndex } = challengeModalState;
  const challenge = challenges[currentIndex];
  const isSkip = selectedAnswer === '__SKIP__';
  const isCorrect = !isSkip && selectedAnswer === challenge.correctAnswer;
  const earnedPoints = isCorrect ? challenge.points : 0;
  
  // Update progress
  if (!isSkip) {
    addXP(earnedPoints, isCorrect);
  }
  
  challengeModalState.results.push({ correct: isCorrect, points: earnedPoints });
  
  // Show feedback
  showAnswerFeedback(isCorrect, isSkip, challenge, selectedAnswer);
}

/**
 * Show answer feedback
 */
function showAnswerFeedback(isCorrect: boolean, isSkip: boolean, challenge: Challenge, _selectedAnswer: string): void {
  const modal = document.getElementById('challenge-modal');
  if (!modal || !challengeModalState) return;
  
  const { challenges, currentIndex } = challengeModalState;
  const isLast = currentIndex >= challenges.length - 1;
  
  // Show floating XP if correct
  if (isCorrect) {
    showFloatingXP(challenge.points);
  }
  
  const feedbackHtml = `
    <div class="challenge-modal-content">
      <div class="challenge-feedback ${isSkip ? 'skipped' : isCorrect ? 'correct' : 'incorrect'}">
        <div class="feedback-icon">${isSkip ? '⏭️' : isCorrect ? '✅' : '❌'}</div>
        <h3>${isSkip ? 'Skipped' : isCorrect ? 'Correct!' : 'Not Quite'}</h3>
        ${!isSkip && !isCorrect ? `
          <p class="correct-answer">Correct answer: <strong>${escapeHtml(challenge.correctAnswer)}</strong></p>
        ` : ''}
        <div class="feedback-explanation">
          <p>${escapeHtml(challenge.explanation)}</p>
        </div>
        ${isCorrect ? `<p class="xp-earned">+${challenge.points} XP</p>` : ''}
      </div>
      
      <button class="btn btn-primary" id="next-challenge-btn">
        ${isLast ? 'See Results' : 'Next Question'}
      </button>
    </div>
  `;
  
  modal.innerHTML = feedbackHtml;
  
  document.getElementById('next-challenge-btn')?.addEventListener('click', () => {
    if (isLast) {
      showChallengeResults();
    } else {
      challengeModalState!.currentIndex++;
      renderChallengeQuestion();
    }
  });
}

/**
 * Show final results
 */
function showChallengeResults(): void {
  const modal = document.getElementById('challenge-modal');
  if (!modal || !challengeModalState) return;
  
  const { results } = challengeModalState;
  const totalCorrect = results.filter(r => r.correct).length;
  const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
  const accuracy = Math.round((totalCorrect / results.length) * 100);
  
  // Mark challenge set as completed
  completeChallengeSet();
  
  const progress = getUserProgress();
  
  modal.innerHTML = `
    <div class="challenge-modal-content">
      <div class="challenge-results">
        <div class="results-icon">${accuracy >= 75 ? '🏆' : accuracy >= 50 ? '👍' : '📚'}</div>
        <h2>Module Complete!</h2>
        
        <div class="results-stats">
          <div class="result-stat">
            <span class="stat-value">${totalCorrect}/${results.length}</span>
            <span class="stat-label">Correct</span>
          </div>
          <div class="result-stat">
            <span class="stat-value">${accuracy}%</span>
            <span class="stat-label">Accuracy</span>
          </div>
          <div class="result-stat highlight">
            <span class="stat-value">+${totalPoints}</span>
            <span class="stat-label">XP Earned</span>
          </div>
        </div>
        
        <div class="results-progress">
          <p class="text-muted">Total XP: ${formatNumber(progress.totalXP)}</p>
          ${progress.currentStreak > 1 ? `<p class="streak-bonus">🔥 ${progress.currentStreak} answer streak!</p>` : ''}
        </div>
      </div>
      
      <button class="btn btn-primary" id="close-challenge-btn">
        Continue Learning
      </button>
    </div>
  `;
  
  document.getElementById('close-challenge-btn')?.addEventListener('click', () => {
    hideChallengeModal();
    // Re-render header to update XP display
    const header = document.querySelector('.header');
    if (header) {
      header.outerHTML = renderHeader();
      attachHeaderListeners();
    }
  });
}

/**
 * Attach header-specific listeners after updating header
 */
function attachHeaderListeners(): void {
  const state = getState();
  
  const backBtn = document.getElementById('back-to-home');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      cleanupGraph();
      goToLanding();
    });
  }
  
  const showPathBtn = document.getElementById('show-learning-path-btn');
  if (showPathBtn && state.currentRepo) {
    showPathBtn.addEventListener('click', () => {
      selectFile(null, true);
      render();
      setTimeout(() => {
        handleGenerateLearningPath();
      }, 50);
    });
  }
}

/**
 * Show floating +XP animation
 */
function showFloatingXP(points: number): void {
  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.textContent = `+${points} XP`;
  document.body.appendChild(popup);
  
  // Trigger animation
  requestAnimationFrame(() => {
    popup.classList.add('animate');
  });
  
  // Remove after animation
  setTimeout(() => {
    popup.remove();
  }, 1500);
}

/**
 * Hide challenge modal
 */
function hideChallengeModal(): void {
  const modal = document.getElementById('challenge-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  challengeModalState = null;
}

/**
 * Format challenge type for display
 */
function formatChallengeType(type: string): string {
  switch (type) {
    case 'multiple_choice': return 'Multiple Choice';
    case 'true_false': return 'True or False';
    case 'code_output': return 'Code Output';
    default: return 'Question';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Chat Sidebar System
// ============================================

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
}

const chatState: ChatState = {
  isOpen: false,
  messages: [],
  isLoading: false,
};

/**
 * Initialize chat button (called after render)
 */
function initializeChatButton(): void {
  const state = getState();
  if (state.view !== 'repo') return;
  
  // Remove existing button if any
  const existing = document.getElementById('chat-fab');
  if (existing) existing.remove();
  
  // Create floating action button
  const fab = document.createElement('button');
  fab.id = 'chat-fab';
  fab.className = 'chat-fab';
  fab.innerHTML = `<span class="chat-fab-icon">?</span>`;
  fab.title = 'Ask AI about this repository';
  fab.addEventListener('click', toggleChatSidebar);
  document.body.appendChild(fab);
}

/**
 * Toggle chat sidebar open/closed
 */
function toggleChatSidebar(): void {
  chatState.isOpen = !chatState.isOpen;
  
  if (chatState.isOpen) {
    renderChatSidebar();
  } else {
    hideChatSidebar();
  }
}

/**
 * Render the chat sidebar
 */
function renderChatSidebar(): void {
  let sidebar = document.getElementById('chat-sidebar');
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'chat-sidebar';
    sidebar.className = 'chat-sidebar';
    document.body.appendChild(sidebar);
  }
  
  const repo = getState().currentRepo;
  
  sidebar.innerHTML = `
    <div class="chat-header">
      <h3>Ask about ${repo?.repo || 'this repo'}</h3>
      <button class="chat-close-btn" id="close-chat-btn">&times;</button>
    </div>
    
    <div class="chat-messages" id="chat-messages">
      ${chatState.messages.length === 0 ? `
        <div class="chat-welcome">
          <p>Ask questions about the repository structure, code patterns, or how things work.</p>
          <div class="chat-suggestions">
            <button class="chat-suggestion" data-msg="What is the main purpose of this repository?">
              What is this repo about?
            </button>
            <button class="chat-suggestion" data-msg="Explain the folder structure and architecture">
              Explain the architecture
            </button>
            <button class="chat-suggestion" data-msg="What are the main entry points?">
              Main entry points?
            </button>
          </div>
        </div>
      ` : chatState.messages.map(msg => `
        <div class="chat-message ${msg.role}">
          <div class="chat-message-content">
            ${msg.role === 'assistant' ? renderMarkdown(msg.content) : escapeHtml(msg.content)}
          </div>
        </div>
      `).join('')}
      ${chatState.isLoading ? `
        <div class="chat-message assistant loading">
          <div class="chat-typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      ` : ''}
    </div>
    
    <div class="chat-input-area">
      <input 
        type="text" 
        class="chat-input" 
        id="chat-input" 
        placeholder="Ask a question..."
        ${chatState.isLoading ? 'disabled' : ''}
      />
      <button class="chat-send-btn" id="chat-send-btn" ${chatState.isLoading ? 'disabled' : ''}>
        Send
      </button>
    </div>
  `;
  
  sidebar.classList.add('open');
  
  // Attach event listeners
  document.getElementById('close-chat-btn')?.addEventListener('click', toggleChatSidebar);
  
  const input = document.getElementById('chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('chat-send-btn');
  
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !chatState.isLoading) {
      handleChatSend();
    }
  });
  
  sendBtn?.addEventListener('click', handleChatSend);
  
  // Suggestion buttons
  document.querySelectorAll('.chat-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = (btn as HTMLElement).dataset.msg;
      if (msg && input) {
        input.value = msg;
        handleChatSend();
      }
    });
  });
  
  // Scroll to bottom
  const messagesEl = document.getElementById('chat-messages');
  if (messagesEl) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  // Focus input
  input?.focus();
}

/**
 * Handle sending a chat message
 */
async function handleChatSend(): Promise<void> {
  const input = document.getElementById('chat-input') as HTMLInputElement;
  const message = input?.value.trim();
  
  if (!message || chatState.isLoading) return;
  
  // Add user message
  chatState.messages.push({ role: 'user', content: message });
  chatState.isLoading = true;
  input.value = '';
  
  renderChatSidebar();
  
  try {
    const state = getState();
    const repo = state.currentRepo;
    
    // Build context from current state
    let context = `Repository: ${repo?.fullName || 'Unknown'}`;
    if (repo?.description) {
      context += `\nDescription: ${repo.description}`;
    }
    if (state.selectedFile) {
      context += `\nCurrently viewing file: ${state.selectedFile.path}`;
    }
    if (state.fileTree) {
      context += `\nRepository has ${countFiles(state.fileTree)} files`;
    }
    
    const response = await chat({
      message,
      context,
      history: chatState.messages.slice(-10), // Last 10 messages for context
    });
    
    chatState.messages.push({ role: 'assistant', content: response });
  } catch (error) {
    chatState.messages.push({ 
      role: 'assistant', 
      content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the worker is running.`
    });
  } finally {
    chatState.isLoading = false;
    renderChatSidebar();
  }
}

/**
 * Hide the chat sidebar
 */
function hideChatSidebar(): void {
  const sidebar = document.getElementById('chat-sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }
}

/**
 * Clear chat history (if needed)
 */
function clearChatHistory(): void {
  chatState.messages = [];
  if (chatState.isOpen) {
    renderChatSidebar();
  }
}

// Subscribe to state changes
subscribe(() => render());

// Listen for custom re-render events (from file tree)
window.addEventListener('repox:rerender', () => render());

// Listen for file selection from graph (update info without full re-render)
window.addEventListener('repox:fileselected', ((e: CustomEvent) => {
  const file = e.detail.file;
  if (!file) return;
  
  // Create or update a floating file info bar
  let infoBar = document.getElementById('graph-file-info');
  if (!infoBar) {
    infoBar = document.createElement('div');
    infoBar.id = 'graph-file-info';
    infoBar.className = 'graph-file-info';
    document.querySelector('.graph-panel')?.appendChild(infoBar);
  }
  
  infoBar.innerHTML = `
    <span class="file-info-icon">📄</span>
    <span class="file-info-name">${file.name}</span>
    <span class="file-info-path">${file.path}</span>
    ${file.size ? `<span class="file-info-size">${formatFileSize(file.size)}</span>` : ''}
  `;
  infoBar.style.display = 'flex';
}) as EventListener);

// Helper for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Initialize
render();
