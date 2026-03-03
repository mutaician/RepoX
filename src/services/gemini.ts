// Gemini AI Service
// Communicates with Cloudflare Worker for AI explanations

// Default to localhost for dev, can be overridden
const API_BASE = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';
// const API_BASE = 'http://localhost:8787';
const REQUEST_TIMEOUT_MS = 120000;

export interface ExplainRequest {
  fileName: string;
  filePath: string;
  fileContent: string;
  repoContext?: string;
  eli5?: boolean;
}

export interface ExplainResponse {
  explanation: string;
}

export interface LearningPathRequest {
  repoName: string;
  repoDescription?: string;
  fileStructure: string;
  languages?: string[];
}

export interface LearningModule {
  title: string;
  description: string;
  files: string[];
  objectives: string[];
  estimatedMinutes: number;
}

export interface LearningProject {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface LearningPath {
  overview: string;
  prerequisites: string[];
  modules: LearningModule[];
  projects: LearningProject[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  context?: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
}

/**
 * Explain a file using Gemini AI
 */
export async function explainFile(request: ExplainRequest): Promise<string> {
  const data = await postJson<ExplainResponse>('/api/explain', request);
  return data.explanation;
}

/**
 * Generate a learning path for a repository
 */
export async function generateLearningPath(request: LearningPathRequest): Promise<LearningPath> {
  const data = await postJson<{ learningPath: LearningPath }>('/api/learning-path', request);
  return data.learningPath;
}

/**
 * Chat with the AI about the repository
 */
export async function chat(request: ChatRequest): Promise<string> {
  const data = await postJson<ChatResponse>('/api/chat', request);
  return data.response;
}

/**
 * Check if the AI service is available
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping' }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the configured API base URL
 */
export function getApiBase(): string {
  return API_BASE;
}

// Challenge generation

export interface ChallengeRequest {
  moduleTitle: string;
  moduleDescription: string;
  objectives: string[];
  files: string[];
  repoName: string;
}

export interface Challenge {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'code_output';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

/**
 * Generate challenges for a learning module
 */
export async function generateChallenges(request: ChallengeRequest): Promise<Challenge[]> {
  const data = await postJson<{ challenges: Challenge[] }>('/api/challenge', request);
  return data.challenges || [];
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Please retry.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    const message = (errorBody as { error?: string }).error || `API error: ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

