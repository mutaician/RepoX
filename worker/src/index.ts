// RepoX Gemini API Proxy Worker
// Cloudflare Worker that securely proxies requests to Gemini API

export interface Env {
  GEMINI_API_KEY: string;
}

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Gemini API endpoint
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // Parse request path
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route to appropriate handler
      if (path === '/api/explain') {
        return await handleExplain(request, env);
      } else if (path === '/api/learning-path') {
        return await handleLearningPath(request, env);
      } else if (path === '/api/chat') {
        return await handleChat(request, env);
      } else {
        return jsonResponse({ error: 'Not found' }, 404);
      }
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Internal error' },
        500
      );
    }
  },
};

/**
 * Handle file explanation requests
 */
async function handleExplain(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    fileName: string;
    filePath: string;
    fileContent: string;
    repoContext?: string;
    eli5?: boolean;
  };

  if (!body.fileName || !body.fileContent) {
    return jsonResponse({ error: 'fileName and fileContent required' }, 400);
  }

  const eli5Instructions = body.eli5 
    ? `Explain Like I'm 5 (ELI5): Use simple analogies, avoid jargon, and explain concepts as if teaching a complete beginner. Use fun comparisons to everyday things.`
    : `Keep explanations beginner-friendly but technically accurate.`;

  const prompt = `You are an expert code educator. Explain this file from a GitHub repository in a clear, educational way.

**File:** ${body.fileName}
**Path:** ${body.filePath}
${body.repoContext ? `**Repository Context:** ${body.repoContext}` : ''}

**Code:**
\`\`\`
${body.fileContent.slice(0, 15000)}
\`\`\`

Provide:
1. **Purpose**: What this file does in 1-2 sentences
2. **Key Concepts**: Important patterns, techniques, or concepts used
3. **How It Works**: Step-by-step explanation of the main logic
4. **Dependencies**: What other files/modules it relies on
5. **Learning Points**: What a developer can learn from this code

${eli5Instructions} Use markdown formatting.`;

  const response = await callGemini(env.GEMINI_API_KEY, prompt);
  return jsonResponse({ explanation: response });
}

/**
 * Handle learning path generation requests
 */
async function handleLearningPath(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    repoName: string;
    repoDescription?: string;
    fileStructure: string;
    languages?: string[];
  };

  if (!body.repoName || !body.fileStructure) {
    return jsonResponse({ error: 'repoName and fileStructure required' }, 400);
  }

  const prompt = `You are an expert programming mentor. Create a learning path for someone wanting to understand this GitHub repository.

**Repository:** ${body.repoName}
${body.repoDescription ? `**Description:** ${body.repoDescription}` : ''}
${body.languages?.length ? `**Languages:** ${body.languages.join(', ')}` : ''}

**File Structure:**
\`\`\`
${body.fileStructure.slice(0, 10000)}
\`\`\`

Create a structured learning path with:
1. **Overview**: What this repo is about and who it's for
2. **Prerequisites**: What knowledge is needed before starting
3. **Learning Modules**: 4-6 modules, each with:
   - Title
   - Description
   - Key files to study (specific paths)
   - Learning objectives
   - Estimated time
4. **Project Ideas**: 2-3 mini-projects to practice what you learned

Format as JSON with this structure:
{
  "overview": "string",
  "prerequisites": ["string"],
  "modules": [
    {
      "title": "string",
      "description": "string",
      "files": ["path/to/file"],
      "objectives": ["string"],
      "estimatedMinutes": number
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "difficulty": "beginner" | "intermediate" | "advanced"
    }
  ]
}`;

  const response = await callGemini(env.GEMINI_API_KEY, prompt);
  
  // Try to parse as JSON
  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                      response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const learningPath = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return jsonResponse({ learningPath });
    }
  } catch {
    // Return raw if JSON parsing fails
  }
  
  return jsonResponse({ learningPath: response });
}

/**
 * Handle chat/follow-up questions
 */
async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    message: string;
    context?: string;
    history?: Array<{ role: string; content: string }>;
  };

  if (!body.message) {
    return jsonResponse({ error: 'message required' }, 400);
  }

  // Build conversation context
  let fullPrompt = `You are RepoX, an AI assistant specialized in helping developers understand GitHub repositories. You're friendly, educational, and provide clear explanations.

${body.context ? `**Current Context:**\n${body.context}\n\n` : ''}`;

  // Add history if provided
  if (body.history?.length) {
    fullPrompt += '**Conversation History:**\n';
    for (const msg of body.history.slice(-10)) {
      fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }
    fullPrompt += '\n';
  }

  fullPrompt += `**User Message:** ${body.message}

Respond helpfully. Use markdown for code and formatting.`;

  const response = await callGemini(env.GEMINI_API_KEY, fullPrompt);
  return jsonResponse({ response });
}

/**
 * Call Gemini API using REST endpoint
 */
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-3-flash-preview:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  return text;
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
