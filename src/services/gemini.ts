// Gemini AI Service
// Communicates with Cloudflare Worker for AI explanations

// Default to localhost for dev, can be overridden
const API_BASE = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';
// const API_BASE = 'http://localhost:8787';

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
  const response = await fetch(`${API_BASE}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((error as { error?: string }).error || `API error: ${response.status}`);
  }

  const data = await response.json() as ExplainResponse;
  return data.explanation;
}

/**
 * Generate a learning path for a repository
 */
export async function generateLearningPath(request: LearningPathRequest): Promise<LearningPath> {
  const response = await fetch(`${API_BASE}/api/learning-path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((error as { error?: string }).error || `API error: ${response.status}`);
  }

  const data = await response.json() as { learningPath: LearningPath };
  return data.learningPath;
}

/**
 * Chat with the AI about the repository
 */
export async function chat(request: ChatRequest): Promise<string> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((error as { error?: string }).error || `API error: ${response.status}`);
  }

  const data = await response.json() as ChatResponse;
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
  const response = await fetch(`${API_BASE}/api/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((error as { error?: string }).error || `API error: ${response.status}`);
  }

  const data = await response.json() as { challenges: Challenge[] };
  return data.challenges || [];
}

