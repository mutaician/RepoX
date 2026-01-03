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
  const hasLearningPath = state.currentRepo ? getSavedLearningPath(state.currentRepo.fullName) !== null : false;
  
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
  checkboxes.forEach((checkbox, i) => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      saveModuleCompletion(repoName, i, target.checked);
      
      // Update module appearance
      const module = target.closest('.learning-module');
      if (module) {
        module.classList.toggle('completed', target.checked);
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
