import './style.css';

// App State
interface AppState {
  repoUrl: string;
  loading: boolean;
  error: string | null;
}

const state: AppState = {
  repoUrl: '',
  loading: false,
  error: null,
};

// ASCII Art for the landing page
const ASCII_ART = `
    ____                  _  __
   / __ \\___  ____  ____ | |/ /
  / /_/ / _ \\/ __ \\/ __ \\|   / 
 / _, _/  __/ /_/ / /_/ /   |  
/_/ |_|\\___/ .___/\\____/_/|_|  
          /_/                  
`;

// Render the application
function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-icon">&gt;_</span>
          <span>RepoX</span>
        </div>
        <nav>
          <a href="https://github.com" target="_blank" rel="noopener" class="btn btn-ghost">
            GitHub
          </a>
        </nav>
      </div>
    </header>

    <main class="main">
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
    </main>

    <footer class="footer">
      <p>Built for Hacks for Hackers 2026 | Powered by Gemini, MongoDB, Cloudflare</p>
    </footer>
  `;

  // Attach event listeners
  attachEventListeners();
}

// Attach event listeners after render
function attachEventListeners(): void {
  const input = document.querySelector<HTMLInputElement>('#repo-url-input');
  const button = document.querySelector<HTMLButtonElement>('#explore-btn');

  if (input) {
    input.addEventListener('input', (e) => {
      state.repoUrl = (e.target as HTMLInputElement).value;
      state.error = null;
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleExplore();
      }
    });
  }

  if (button) {
    button.addEventListener('click', handleExplore);
  }
}

// Validate GitHub URL
function isValidGitHubUrl(url: string): boolean {
  const pattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/;
  return pattern.test(url.trim());
}

// Parse GitHub URL to get owner and repo
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.trim().match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }
  return null;
}

// Handle explore button click
async function handleExplore(): Promise<void> {
  const url = state.repoUrl.trim();

  if (!url) {
    state.error = 'Please enter a GitHub repository URL';
    render();
    return;
  }

  if (!isValidGitHubUrl(url)) {
    state.error = 'Invalid GitHub URL. Format: https://github.com/owner/repo';
    render();
    return;
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    state.error = 'Could not parse repository URL';
    render();
    return;
  }

  state.loading = true;
  state.error = null;
  render();

  // TODO: Step 2 will implement actual GitHub API fetching
  // For now, simulate a delay and show success
  console.log('Exploring repo:', parsed);
  
  setTimeout(() => {
    state.loading = false;
    // Will navigate to repo view in Step 2
    alert(`Ready to explore: ${parsed.owner}/${parsed.repo}\n\nStep 2 will implement the actual repo fetching!`);
    render();
  }, 1000);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  render();
});

// Also render immediately in case DOM is already loaded
if (document.readyState !== 'loading') {
  render();
}
