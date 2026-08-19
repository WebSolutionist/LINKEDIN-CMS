import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { generateDailyReview, chatWithLink } from '../utils/gemini';
import { spring, micro, staggerContainer, cardItem } from '../utils/animations';

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

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      const allPosts = postsData || [];
      setPosts(allPosts);

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

      const { data: chatData } = await supabase
        .from('link_chat')
        .select('*')
        .eq('week_number', weekNumber)
        .order('created_at', { ascending: true });

      if (chatData) {
        setChatMessages(chatData.map(c => ({ role: c.role, message: c.message })));
      }

      const { data: sessionsData } = await supabase
        .from('link_sessions')
        .select('*')
        .eq('week_number', weekNumber)
        .order('created_at', { ascending: false });

      if (sessionsData) {
        setActiveSessions(sessionsData.filter(s => s.session_type !== 'chat'));
      }

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

    const newMessages = [...chatMessages, { role: 'user', message: userMessage }];
    setChatMessages(newMessages);

    try {
      await supabase.from('link_chat').insert({
        role: 'user',
        message: userMessage,
        week_number: currentWeekNumber,
      });

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

      const linkResponse = await chatWithLink(newMessages, context);

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
    <div className="flex-1 flex overflow-hidden bg-bg-primary">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Sleek Header */}
        <div className="px-6 py-4 border-b border-border-brand/50 bg-bg-secondary/60 backdrop-blur-xl flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent flex items-center justify-center font-black text-white text-sm shadow-lg glow-purple">
                L
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-bg-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">LINK Strategy Hub</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                  Strategist & Copilot
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Direct strategic feedback & performance debriefs for Wallah Precious
              </p>
            </div>
          </div>
        </div>

        {/* Daily Review Card */}
        {reviewLoading ? (
          <div className="mx-6 mt-4 p-4 rounded-2xl glass-card border border-border-brand flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-xs text-text-secondary font-semibold">LINK is analyzing your strategic metrics...</span>
          </div>
        ) : dailyReview ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mt-4 p-5 rounded-2xl glass-card border border-accent/30 bg-gradient-to-r from-accent-purple/10 via-bg-secondary to-bg-tertiary relative overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent flex items-center justify-center font-bold text-xs text-white shadow-lg shrink-0 mt-0.5">
                L
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Strategic Daily Debrief
                  </span>
                  <button
                    onClick={() => generateAndSaveDailyReview(posts, weekPosts, currentWeekNumber)}
                    className="text-xs font-semibold text-text-secondary hover:text-accent flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
                <div className="text-xs text-text-primary leading-relaxed mt-2 whitespace-pre-line font-normal">
                  {dailyReview}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center select-none py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-accent flex items-center justify-center font-black text-2xl text-white shadow-xl glow-purple mb-4">
                L
              </div>
              <h3 className="text-base font-bold text-text-primary">
                LINK Strategy Room Active
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mt-1.5 leading-relaxed">
                Direct strategic advice based on your profile visits, DMs, format rotation, and 3 core content pillars.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6 max-w-lg w-full">
                {[
                  "What's my highest converting post format for DMs?",
                  "Analyze my format rotation for this week.",
                  "Give me 3 data-backed post concepts for tomorrow.",
                  "How is my profile visits signal performing?",
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInputText(q); }}
                    className="text-left p-3.5 glass-card border border-border-brand hover:border-accent/50 rounded-xl text-xs text-text-secondary hover:text-text-primary transition-all cursor-pointer group"
                  >
                    <span className="group-hover:text-accent transition-colors font-medium">"{q}"</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0 ${
                  msg.role === 'link'
                    ? 'bg-gradient-to-br from-accent-purple to-accent glow-purple'
                    : 'bg-bg-tertiary border border-border-brand text-text-primary'
                }`}>
                  {msg.role === 'link' ? 'L' : 'P'}
                </div>
                <div className={`max-w-[78%] p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'link'
                    ? 'glass-card border border-border-brand text-text-primary'
                    : 'bg-gradient-to-r from-accent-purple/20 to-accent/20 border border-accent/30 text-white font-medium shadow-md'
                }`}>
                  <div className="whitespace-pre-line">{msg.message}</div>
                </div>
              </motion.div>
            ))
          )}

          {sending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-purple to-accent flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0">
                L
              </div>
              <div className="p-4 rounded-2xl glass-card border border-border-brand">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="shrink-0 p-4 border-t border-border-brand/50 bg-bg-secondary/60 backdrop-blur-xl">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask LINK for strategic direction..."
              disabled={sending}
              className="flex-1 bg-bg-primary border border-border-brand text-xs text-text-primary rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all placeholder:text-text-secondary/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="px-5 py-3 bg-gradient-to-r from-accent-purple to-accent text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar — Observations & Performance Snapshot */}
      <div className="w-80 border-l border-border-brand/50 bg-bg-secondary/40 shrink-0 flex flex-col h-full overflow-hidden hidden xl:flex">
        <div className="p-5 border-b border-border-brand/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            LINK Observations
          </h3>
          <p className="text-[10px] text-text-secondary mt-0.5">
            Real-time strategic feedback & challenges
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {activeSessions.length > 0 ? (
            activeSessions.slice(0, 5).map(session => (
              <div key={session.id} className="p-3.5 rounded-xl glass-card border border-border-brand space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    session.session_type === 'challenge'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-accent/15 text-accent border border-accent/30'
                  }`}>
                    {session.session_type === 'challenge' ? 'Challenge' : 'Insight'}
                  </span>
                  <span className="text-[10px] text-text-secondary">
                    {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {session.link_notes?.summary || session.link_notes?.review?.substring(0, 120) || 'No details'}
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-border-brand/40 rounded-2xl">
              <span className="text-xs font-bold text-text-secondary">
                No active challenges
              </span>
              <p className="text-[10px] text-text-secondary/60 mt-1 max-w-[200px]">
                LINK logs observations dynamically as you write and post.
              </p>
            </div>
          )}

          {/* Week Snapshot */}
          <div className="p-4 rounded-2xl glass-card border border-border-brand space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary block">
              Week {currentWeekNumber} Snapshot
            </span>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Posts this week</span>
                <span className="font-bold text-text-primary">{weekPosts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Total published</span>
                <span className="font-bold text-text-primary">{posts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Top format</span>
                <span className="font-bold text-accent">{getTopFormat()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Top pillar</span>
                <span className="font-bold text-amber-400">{getTopPillar()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
