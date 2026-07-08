import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { generateDailyReview, chatWithLink } from '../utils/gemini';

export default function WarRoomView() {
  const [posts, setPosts] = useState([]);
  const [weekPosts, setWeekPosts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [dailyReview, setDailyReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentWeekNumber, setCurrentWeekNumber] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadWarRoom();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const getWeekInfo = () => {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    return weekNumber;
  };

  const loadWarRoom = async () => {
    try {
      const weekNumber = getWeekInfo();
      setCurrentWeekNumber(weekNumber);

      // Fetch all published posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      const allPosts = postsData || [];
      setPosts(allPosts);

      // Get this week's posts
      const weekStart = new Date();
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const thisWeek = allPosts.filter(p => {
        const d = new Date(p.published_at || p.created_at);
        return d >= weekStart && d <= weekEnd;
      });
      setWeekPosts(thisWeek);

      // Load chat history for this week
      const { data: chatData } = await supabase
        .from('link_chat')
        .select('*')
        .eq('week_number', weekNumber)
        .order('created_at', { ascending: true });

      if (chatData) {
        setChatMessages(chatData.map(c => ({ role: c.role, message: c.message })));
      }

      // Load active sessions
      const { data: sessionsData } = await supabase
        .from('link_sessions')
        .select('*')
        .eq('week_number', weekNumber)
        .order('created_at', { ascending: false });

      if (sessionsData) {
        setActiveSessions(sessionsData.filter(s => s.session_type !== 'chat'));
      }

      // Check for existing daily review
      const { data: existingReview } = await supabase
        .from('link_sessions')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('session_type', 'daily_review')
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingReview && existingReview.length > 0) {
        setDailyReview(existingReview[0].link_notes?.review || null);
        setReviewLoading(false);
      } else if (allPosts.length > 0) {
        // Generate daily review
        generateAndSaveDailyReview(allPosts, thisWeek, weekNumber);
      } else {
        setReviewLoading(false);
      }
    } catch (err) {
      console.error('Error loading war room:', err);
      setReviewLoading(false);
    }
  };

  const generateAndSaveDailyReview = async (allPosts, thisWeek, weekNumber) => {
    setReviewLoading(true);
    try {
      const review = await generateDailyReview(allPosts, thisWeek);
      setDailyReview(review);

      await supabase.from('link_sessions').insert({
        session_type: 'daily_review',
        link_notes: { review, generated_at: new Date().toISOString() },
        week_number: weekNumber,
        user_commitments: [],
      });
    } catch (err) {
      console.error('Error generating daily review:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const userMessage = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistically add user message
    const newMessages = [...chatMessages, { role: 'user', message: userMessage }];
    setChatMessages(newMessages);

    try {
      // Save user message to DB
      await supabase.from('link_chat').insert({
        role: 'user',
        message: userMessage,
        week_number: currentWeekNumber,
      });

      // Build context
      const topFormat = posts.length > 0 ? getTopFormat() : 'N/A';
      const topPillar = posts.length > 0 ? getTopPillar() : 'N/A';

      const context = {
        weekPosts: weekPosts.length,
        totalPosts: posts.length,
        healthScore: 'N/A',
        topFormat,
        topPillar,
        lastRecommendation: 'None',
      };

      // Get LINK response
      const linkResponse = await chatWithLink(newMessages, context);

      // Save LINK response to DB
      await supabase.from('link_chat').insert({
        role: 'link',
        message: linkResponse,
        week_number: currentWeekNumber,
      });

      setChatMessages([...newMessages, { role: 'link', message: linkResponse }]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages([...newMessages, { role: 'link', message: 'LINK encountered an error. Please try again.' }]);
    } finally {
      setSending(false);
    }
  };

  const getTopFormat = () => {
    const map = {};
    posts.forEach(p => {
      if (p.format) {
        if (!map[p.format]) map[p.format] = { views: 0, count: 0 };
        map[p.format].views += p.profile_views || 0;
        map[p.format].count += 1;
      }
    });
    let best = 'N/A';
    let bestAvg = -1;
    Object.keys(map).forEach(k => {
      const avg = map[k].views / map[k].count;
      if (avg > bestAvg) { bestAvg = avg; best = k; }
    });
    return best;
  };

  const getTopPillar = () => {
    const map = {};
    posts.forEach(p => {
      if (p.pillar) {
        if (!map[p.pillar]) map[p.pillar] = { views: 0, count: 0 };
        map[p.pillar].views += p.profile_views || 0;
        map[p.pillar].count += 1;
      }
    });
    let best = 'N/A';
    let bestAvg = -1;
    Object.keys(map).forEach(k => {
      const avg = map[k].views / map[k].count;
      if (avg > bestAvg) { bestAvg = avg; best = k; }
    });
    return best;
  };

  return (
    <div className="flex-1 flex overflow-hidden animate-fadeIn">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-8 py-4 border-b border-[--border-color]/50 bg-[--bg-secondary]/30 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[--accent-primary] animate-pulse shadow-[0_0_8px_var(--accent-primary)]" />
            <h2 className="text-lg font-black tracking-wide text-white uppercase">
              War Room
            </h2>
          </div>
          <p className="text-[10px] text-[--text-secondary] mt-0.5">
            Your LinkedIn Growth Partner — LINK is online
          </p>
        </div>

        {/* Daily Review Banner */}
        {reviewLoading ? (
          <div className="px-8 py-4 bg-[--bg-tertiary]/30 border-b border-[--border-color]/30 flex items-center gap-3">
            <svg className="animate-spin h-4 w-4 text-[--accent-primary]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-[--text-secondary] font-semibold">LINK is analyzing your week...</span>
          </div>
        ) : dailyReview ? (
          <div className="px-8 py-4 bg-gradient-to-r from-[--bg-tertiary]/50 to-transparent border-b border-[--border-color]/30">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[--accent-primary] to-[--accent-secondary] flex items-center justify-center font-bold text-xs text-white shadow-lg shrink-0 mt-0.5">
                L
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[--accent-primary]">
                  Daily Review
                </span>
                <div className="text-xs text-[--text-primary] leading-relaxed mt-1 whitespace-pre-line">
                  {dailyReview}
                </div>
              </div>
              <button
                onClick={() => generateAndSaveDailyReview(posts, weekPosts, currentWeekNumber)}
                className="shrink-0 p-2 bg-[--bg-primary] hover:bg-[--accent-glow] border border-[--border-color] hover:border-[--accent-primary]/60 text-[--text-secondary] hover:text-[--accent-primary] rounded-lg transition-all cursor-pointer"
                title="Refresh Daily Review"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 scrollbar-thin">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center select-none">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[--accent-primary] to-[--accent-secondary] flex items-center justify-center font-black text-2xl text-white shadow-lg mb-4">
                L
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                LINK is Ready
              </h3>
              <p className="text-xs text-[--text-secondary] max-w-[340px] mt-2 leading-relaxed">
                Ask me anything about your content strategy, performance, or what to post next. I'll give you the honest answer based on your data.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6 max-w-[400px]">
                {[
                  "What's my best performing format?",
                  "Why did my last post underperform?",
                  "What should I write about today?",
                  "How's my consistency this week?",
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInputText(q); }}
                    className="text-left p-3 bg-[--bg-secondary] border border-[--border-color] hover:border-[--accent-primary]/40 rounded-xl text-[10px] text-[--text-secondary] hover:text-white transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-lg shrink-0 ${
                  msg.role === 'link'
                    ? 'bg-gradient-to-br from-[--accent-primary] to-[--accent-secondary]'
                    : 'bg-[--bg-tertiary] border border-[--border-color]'
                }`}>
                  {msg.role === 'link' ? 'L' : 'P'}
                </div>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'link'
                    ? 'bg-[--bg-secondary] border border-[--border-color] text-[--text-primary]'
                    : 'bg-gradient-to-r from-[--accent-primary]/20 to-[--accent-secondary]/20 border border-[--accent-primary]/20 text-white'
                }`}>
                  <div className="whitespace-pre-line">{msg.message}</div>
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[--accent-primary] to-[--accent-secondary] flex items-center justify-center font-bold text-xs text-white shadow-lg shrink-0">
                L
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[--bg-secondary] border border-[--border-color]">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[--accent-primary] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[--accent-primary] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[--accent-primary] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="shrink-0 px-8 py-4 border-t border-[--border-color]/50 bg-[--bg-secondary]/30">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask LINK anything..."
              disabled={sending}
              className="flex-1 bg-[--bg-primary] border border-[--border-color] text-xs text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[--accent-primary] transition-all placeholder:text-[--text-secondary]/50 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="px-5 py-3 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all hover:opacity-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer glow-accent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar — Active Challenges & Sessions */}
      <div className="w-72 border-l border-[--border-color]/60 bg-[--bg-secondary]/45 shrink-0 flex flex-col h-full overflow-hidden hidden lg:flex">
        <div className="p-5 border-b border-[--border-color]/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            LINK's Observations
          </h3>
          <p className="text-[9px] text-[--text-secondary] mt-0.5">
            Weekly insights and challenges
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {activeSessions.length > 0 ? (
            activeSessions.slice(0, 5).map(session => (
              <div key={session.id} className="p-3 rounded-xl bg-[--bg-primary]/40 border border-[--border-color]/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    session.session_type === 'challenge' ? 'bg-red-500/10 text-red-400 border border-red-500/25' :
                    'bg-[--accent-primary]/10 text-[--accent-primary] border border-[--accent-primary]/25'
                  }`}>
                    {session.session_type === 'challenge' ? 'Challenge' : 'Insight'}
                  </span>
                  <span className="text-[8px] text-[--text-secondary]">
                    {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-[10px] text-[--text-secondary] leading-relaxed">
                  {session.link_notes?.summary || session.link_notes?.review?.substring(0, 120) || 'No details'}
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4 h-40 border border-dashed border-[--border-color]/30 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                No observations yet
              </span>
              <p className="text-[9px] text-[--text-secondary]/60 mt-1 max-w-[180px]">
                LINK will log observations as you interact and publish more content.
              </p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-4 p-4 rounded-xl bg-[--bg-primary]/40 border border-[--border-color]/60 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
              Week {currentWeekNumber} Snapshot
            </span>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[--text-secondary]">Posts this week</span>
                <span className="font-bold text-white">{weekPosts.length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[--text-secondary]">Total published</span>
                <span className="font-bold text-white">{posts.length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[--text-secondary]">Top format</span>
                <span className="font-bold text-[--accent-primary]">{getTopFormat()}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[--text-secondary]">Top pillar</span>
                <span className="font-bold text-violet-400">{getTopPillar()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
