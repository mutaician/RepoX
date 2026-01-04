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
      } else if (path === '/api/challenge') {
        return await handleChallenge(request, env);
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
 * Handle challenge generation for a learning module
 * Uses structured output for reliable JSON parsing
 */
async function handleChallenge(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    moduleTitle: string;
    moduleDescription: string;
    objectives: string[];
    files: string[];
    repoName: string;
  };

  if (!body.moduleTitle) {
    return jsonResponse({ error: 'moduleTitle required' }, 400);
  }

  const prompt = `Generate 4 quiz questions to test understanding of a learning module.

Module: ${body.moduleTitle}
Description: ${body.moduleDescription || 'No description'}
Repository: ${body.repoName || 'Unknown'}

Learning Objectives:
${body.objectives?.map(o => `- ${o}`).join('\n') || '- Understand the module content'}

Files Covered:
${body.files?.map(f => `- ${f}`).join('\n') || '- Various files'}

Create 4 questions:
- 2 multiple choice questions (4 options each, format: "A) answer", "B) answer", etc.)
- 1 true/false question
- 1 conceptual question about what a code pattern does

Important: Do NOT include actual code blocks in questions. Describe code patterns in plain text.
Make questions educational and focused on understanding concepts.`;

  // JSON Schema for structured output
  const challengeSchema = {
    type: "object",
    properties: {
      challenges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique identifier like q1, q2, etc." },
            type: { 
              type: "string", 
              enum: ["multiple_choice", "true_false", "code_output"],
              description: "Type of question"
            },
            question: { type: "string", description: "The question text" },
            options: { 
              type: "array", 
              items: { type: "string" },
              description: "Answer options"
            },
            correctAnswer: { type: "string", description: "The correct answer, must match one option exactly" },
            explanation: { type: "string", description: "Brief explanation of why this is correct" },
            points: { type: "integer", description: "Points for correct answer (20-30)" }
          },
          required: ["id", "type", "question", "options", "correctAnswer", "explanation", "points"]
        }
      }
    },
    required: ["challenges"]
  };

  try {
    const result = await callGeminiStructured(env.GEMINI_API_KEY, prompt, challengeSchema);
    return jsonResponse({ challenges: result.challenges || [] });
  } catch (error) {
    console.error('Challenge generation error:', error);
    return jsonResponse({ 
      challenges: [],
      error: error instanceof Error ? error.message : 'Failed to generate challenges' 
    }, 500);
  }
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
 * Call Gemini API with structured output (JSON schema)
 * This ensures clean JSON responses without markdown formatting
 */
async function callGeminiStructured(
  apiKey: string, 
  prompt: string, 
  schema: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.0-flash:generateContent`,
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
          responseMimeType: 'application/json',
          responseSchema: schema,
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

  // Parse the JSON response
  return JSON.parse(text);
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
