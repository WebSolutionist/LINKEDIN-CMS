import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const FALLBACK_PILLAR = { pillar: 'Website Reality', reason: 'Unable to analyze draft. Defaulted to core pillar.' };
const FALLBACK_WEEKLY_REVIEW = 'No review could be generated due to an error. Please try again.';

export const LINK_SYSTEM_PROMPT = `You are LINK — my personal LinkedIn Growth Partner and strategist.

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
  }
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

  try {
    const prompt = `Raw Idea: "${rawIdea}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }
      ]
    });
    const resultText = response.text.trim();
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
  try {
    const prompt = `${LINK_SYSTEM_PROMPT}\n\nPolishing Goal: ${goal === 'hook' ? 'Generate 3 high-converting LinkedIn hooks' : 'Polish the post for maximum readability, punchy spacing, and strong positioning.'}\n\nCurrent Content:\n${currentDraft}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (err) {
    console.error('polishPostContent failed:', err);
    return currentDraft;
  }
}

/**
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

Be direct, concise, and structured.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error('generateDailyReview failed:', error);
    return 'Daily review failed to generate.';
  }
}
