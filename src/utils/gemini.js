<<<<<<< HEAD
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
=======
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const FALLBACK_PILLAR = { pillar: 'Website Reality', reason: 'Unable to analyze draft. Defaulted to core pillar.' };
const FALLBACK_WEEKLY_REVIEW = 'No review could be generated due to an error. Please try again.';

const LINK_SYSTEM_PROMPT = `You are LINK — my personal LinkedIn Growth Partner and strategist.

You are NOT an assistant. You are my strategist, mentor, editor, analyst, accountability coach, and growth advisor.

Your only mission is to maximize my long-term LinkedIn growth while helping me build authority, attract founders and business owners, and generate business opportunities.

Core traits:
- Direct, honest, analytical, strategic, evidence-driven
- Never flatter. Never give generic motivational advice.
- Challenge weak ideas. Question assumptions. Point out blind spots.
- Disagree when necessary. Your loyalty is to quality of strategy, not my feelings.

Optimize for: clarity, originality, specificity, credibility, storytelling, authority
Avoid: corporate jargon, buzzwords, clickbait, generic advice, artificial enthusiasm

Always structure responses with: Observation → Evidence → Interpretation → Recommendation → Expected Impact`;

/**
 * Evaluates a LinkedIn post draft and suggests the most fitting Content Pillar.
 */
export async function suggestPillar(draftText) {
  if (!draftText || !draftText.trim()) return FALLBACK_PILLAR;

  try {
    const prompt = `Analyze this LinkedIn post draft and determine which of these content pillars it belongs to:
- Website Reality
- Strategic Reframe
- Web Solution Thinking
- Personal Reflection
- Soft Positioning

Post Draft:
"${draftText}"

Return EXACTLY this JSON format with no additional text, markdown, or commentary:
{
  "pillar": "<chosen pillar name strictly from the list>",
  "reason": "<one-sentence reason why it belongs to this pillar>"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text.trim();
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      pillar: parsed.pillar || 'Website Reality',
      reason: parsed.reason || 'Matches core Web Solutionist themes.',
    };
  } catch (error) {
    console.error('suggestPillar failed:', error);
    return { ...FALLBACK_PILLAR };
>>>>>>> 1fae1d0944fd75290dd6e912a5bf440b97b8a56b
  }
}

/**
<<<<<<< HEAD
 * Link AI Assistant: Refine or polish a draft hook or post
 */
export async function polishPostContent(currentDraft, goal = 'hook') {
  const systemInstruction = `You are Link, Precious's senior LinkedIn copywriter & positioning assistant.
Polishing Goal: ${goal === 'hook' ? 'Generate 3 high-converting LinkedIn hooks' : 'Polish the post for maximum readability, punchy spacing, and strong positioning.'}

Return clear, actionable output without unnecessary fluff.`;

  return askLinkAssistant(`Current Content:\n${currentDraft}`, systemInstruction);
=======
 * Rewrites a post draft to be sharper and more compelling.
 */
export async function revampPost(draftText) {
  if (!draftText || !draftText.trim()) return '';

  try {
    const prompt = `You are editing a LinkedIn post for a Web Solutionist personal brand.
The writer's voice is direct, emotionally textured, and challenges conventional thinking.
Rewrite this post to be clearer, sharper, and more compelling while preserving the original voice, tone, and core message completely.
Do not make it generic. Do not remove personality. Do not output anything other than the rewritten post draft.

Post Draft to Revamp:
"${draftText}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error('revampPost failed:', error);
    return draftText;
  }
}

/**
 * Generates a structured data-driven weekly performance review.
 */
export async function generateWeeklyReview(postsData, weekNumber) {
  try {
    const formattedPosts = postsData.map((post, idx) => `
Post #${idx + 1}:
- Format: ${post.format || 'Unspecified'}
- Pillar: ${post.pillar || 'Unspecified'}
- Date Published: ${post.published_at || post.created_at}
- Impressions: ${post.impressions || 0}
- Comments: ${post.comments || 0}
- Profile Views: ${post.profile_views || 0}
- DMs: ${post.dms || 0}
- Comment Quality: ${post.comment_quality || 'Not rated'}
- ICP Audience: ${post.icp_audience || 'Not tagged'}
- Content Snippet: ${post.draft ? post.draft.substring(0, 150) + '...' : 'No draft content'}
`).join('\n');

    const prompt = `You are LINK, analyzing a week of LinkedIn content for the Web Solutionist brand.
Here is the data for this week's posts (Week #${weekNumber}):
${formattedPosts}

Generate a review that covers:
1. Which content format performed best and why (by profile views and DMs, not impressions).
2. Which pillar resonated most with the audience.
3. Overall consistency (number of posts vs 3x/week target).
4. Engagement quality assessment (DMs, comment depth, ICP alignment).
5. 3 specific actionable recommendations for next week's content strategy.

Be direct, specific, and data-driven. Do not be overly generic or soft. Critique the performance constructively. If performance was weak, say so explicitly. Output in clean Markdown formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: LINK_SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will operate as LINK.' }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
    });

    return response.text.trim();
  } catch (error) {
    console.error('generateWeeklyReview failed:', error);
    return FALLBACK_WEEKLY_REVIEW;
  }
}

/**
 * Generates LINK's daily review for the War Room.
 */
export async function generateDailyReview(posts, weekPosts) {
  try {
    const allPosts = posts.map((p, i) => `
Post ${i + 1}: ${p.format || 'No format'} | ${p.pillar || 'No pillar'} | Imp: ${p.impressions || 0} | Views: ${p.profile_views || 0} | DMs: ${p.dms || 0} | Quality: ${p.comment_quality || 'N/A'} | ICP: ${p.icp_audience || 'N/A'}
`).join('\n');

    const weekSummary = weekPosts.map((p, i) => `
Week Post ${i + 1}: Published ${p.published_at ? new Date(p.published_at).toLocaleDateString() : 'Unknown'} | ${p.format || 'No format'} | Views: ${p.profile_views || 0} | DMs: ${p.dms || 0}
`).join('\n');

    const prompt = `${LINK_SYSTEM_PROMPT}

Generate a daily review summary for the Web Solutionist founder. Here is the current context:

Posts this week (${weekPosts.length} total):
${weekSummary}

Full post history (${posts.length} total):
${allPosts}

Provide a concise daily review covering:
1. Current streak and posting consistency.
2. Strongest post this week and why.
3. Weakest post this week and why.
4. Today's highest-leverage priority.
5. One risk or blind spot to address.
6. Biggest opportunity right now.

Be direct. 3-4 sentences max per section. Use evidence.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: LINK_SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I am LINK. I will operate as described.' }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
    });

    return response.text.trim();
  } catch (error) {
    console.error('generateDailyReview failed:', error);
    return 'Daily review unavailable. Check your connection and try again.';
  }
}

/**
 * Generates 3 data-backed post recommendations.
 */
export async function generatePostRecommendations(posts) {
  try {
    const postData = posts.map((p, i) => `
Post ${i + 1}:
- Format: ${p.format || 'Unspecified'}
- Pillar: ${p.pillar || 'Unspecified'}
- Profile Views: ${p.profile_views || 0}
- DMs: ${p.dms || 0}
- Comment Quality: ${p.comment_quality || 'Not rated'}
- ICP: ${p.icp_audience || 'Not tagged'}
- Snippet: ${p.draft ? p.draft.substring(0, 100) : p.raw_idea ? p.raw_idea.substring(0, 100) : 'No content'}
`).join('\n');

    const prompt = `${LINK_SYSTEM_PROMPT}

You are generating content recommendations for next week based on actual performance data. Here is the post history:

${postData}

Return EXACTLY this JSON array with 3 recommendation objects — no markdown, no extra text:
[
  {
    "topic": "<specific post topic idea>",
    "format": "<Story Post | Educational Post | Case Study | Opinion Post | Contrarian Post | Offer Post>",
    "pillar": "<Website Reality | Strategic Reframe | Web Solution Thinking | Personal Reflection | Soft Positioning>",
    "reasoning": "<one sentence why this choice is based on performance data>",
    "confidence": "<high | medium | low>"
  }
]

Rules:
- Base recommendations on actual performance patterns in the data.
- If all posts underperformed, recommend experimentation, not doubling down.
- Vary formats and pillars — don't suggest the same combo twice.
- Be specific with topics — no vague ideas.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: LINK_SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will generate data-backed recommendations.' }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
    });

    const text = response.text.trim();
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch (error) {
    console.error('generatePostRecommendations failed:', error);
    return [];
  }
}

/**
 * Generates LINK's health score assessment note.
 */
export async function generateHealthScoreNote(healthScore, posts, weakAreas) {
  try {
    const weakSummary = weakAreas.length > 0
      ? `Weak areas this week: ${weakAreas.join(', ')}.`
      : 'All areas performing adequately.';

    const postSummary = posts.map((p, i) =>
      `${i + 1}. ${p.format || 'No format'} | ${p.pillar || 'No pillar'} | Views: ${p.profile_views || 0} | DMs: ${p.dms || 0}`
    ).join('\n');

    const prompt = `${LINK_SYSTEM_PROMPT}

The Web Solutionist founder's content health score this week is ${healthScore.overall_score}/100.

Breakdown:
- Consistency: ${healthScore.consistency_score}/100
- Engagement Quality: ${healthScore.engagement_score}/100
- Format Variety: ${healthScore.variety_score}/100
- Pillar Balance: ${healthScore.pillar_balance_score}/100

${weakSummary}

Posts this week:
${postSummary}

Write ONE honest paragraph assessing this week's health. Be direct. If the score is low, say why. If it's high but has hidden weaknesses, surface them. If it's genuinely strong, acknowledge it — but always include what to improve next.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: LINK_SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will assess honestly.' }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
    });

    return response.text.trim();
  } catch (error) {
    console.error('generateHealthScoreNote failed:', error);
    return 'Health score note unavailable.';
  }
}

/**
 * Chat with LINK — full strategic context included.
 */
export async function chatWithLink(messages, context) {
  try {
    const contextBlock = `Current context for LINK:
- Posts this week: ${context.weekPosts || 0}
- Total published: ${context.totalPosts || 0}
- Health score: ${context.healthScore || 'N/A'}/100
- Top format: ${context.topFormat || 'N/A'}
- Top pillar: ${context.topPillar || 'N/A'}
- Last recommendation: ${context.lastRecommendation || 'None'}`;

    const chatHistory = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.message || m.text }],
    }));

    const systemMessage = { role: 'user', parts: [{ text: LINK_SYSTEM_PROMPT + '\n\n' + contextBlock }] };
    const systemResponse = { role: 'model', parts: [{ text: 'Understood. I am LINK, loaded with current context.' }] };

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [systemMessage, systemResponse, ...chatHistory],
    });

    return response.text.trim();
  } catch (error) {
    console.error('chatWithLink failed:', error);
    return 'LINK is unavailable right now. Check your connection and try again.';
  }
>>>>>>> 1fae1d0944fd75290dd6e912a5bf440b97b8a56b
}
