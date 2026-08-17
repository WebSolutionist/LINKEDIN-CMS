// Gemini 2.0 Flash Integration for Link AI Assistant

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export async function askLinkAssistant(prompt, systemInstruction = '') {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is missing in your .env file.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: systemInstruction ? `${systemInstruction}\n\nUser Request: ${prompt}` : prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 1000,
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API call failed with status ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

/**
 * Link AI Assistant: Generate 3 thinking questions based on a raw idea
 */
export async function generateThinkingQuestions(rawIdea) {
  const systemInstruction = `You are Link, Precious's personal AI Content Thinking Assistant for LinkedIn. 
Precious is a Web Solutionist who helps founders and teams transform their web strategy.
Given a raw, messy post idea, generate clear concise answers to these 3 thinking questions:
1. Who is this really for? (Target Audience/ICP)
2. What should they feel after reading? (Emotional impact)
3. What's the one thing they should walk away knowing? (Core takeaway)

Return your response strictly as valid JSON with keys:
"targetAudience", "emotionalImpact", "coreTakeaway", "recommendedFormat", "formatReason"

Format options MUST be one of:
- "Storytelling"
- "Thought Leadership"
- "Strategic Reframe"
- "Listicle"
`;

  const prompt = `Raw Idea: "${rawIdea}"`;

  try {
    const resultText = await askLinkAssistant(prompt, systemInstruction);
    // Clean code fences if present
    const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Error in Link AI thinking:', err);
    return null;
  }
}

/**
 * Link AI Assistant: Refine or polish a draft hook or post
 */
export async function polishPostContent(currentDraft, goal = 'hook') {
  const systemInstruction = `You are Link, Precious's senior LinkedIn copywriter & positioning assistant.
Polishing Goal: ${goal === 'hook' ? 'Generate 3 high-converting LinkedIn hooks' : 'Polish the post for maximum readability, punchy spacing, and strong positioning.'}

Return clear, actionable output without unnecessary fluff.`;

  return askLinkAssistant(`Current Content:\n${currentDraft}`, systemInstruction);
}
