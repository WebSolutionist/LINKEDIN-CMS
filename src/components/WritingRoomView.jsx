import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { suggestPillar, revampPost } from '../utils/gemini';

const FORMATS = [
  'Story Post',
  'Educational Post',
  'Case Study',
  'Opinion Post',
  'Contrarian Post',
  'Offer Post',
];

const PILLARS = [
  'Website Reality',
  'Strategic Reframe',
  'Web Solution Thinking',
  'Personal Reflection',
  'Soft Positioning',
];

export default function WritingRoomView({ pendingRecommendation, onClearRecommendation }) {
  const [ideas, setIdeas] = useState([]);
  const [activePost, setActivePost] = useState(null);
  const [newIdeaText, setNewIdeaText] = useState('');
  
  // Editor States
  const [editorStage, setEditorStage] = useState(1); // 1: Write, 2: Ready to Publish
  const [draft, setDraft] = useState('');
  const [format, setFormat] = useState('');
  const [pillar, setPillar] = useState('');
  const [thinkingAnswers, setThinkingAnswers] = useState({});

  // AI Loaders & Suggestion Storage
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // { pillar, reason }
  const [aiRevampLoading, setAiRevampLoading] = useState(false);
  const [revampedText, setRevampedText] = useState('');
  const [showRevampModal, setShowRevampModal] = useState(false);

  // Publishing State
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [dms, setDms] = useState(0);
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchIdeas();
  }, []);

  // Apply pending recommendation if passed from Dashboard
  useEffect(() => {
    if (pendingRecommendation) {
      setFormat(pendingRecommendation.format || '');
      setPillar(pendingRecommendation.pillar || '');
      if (onClearRecommendation) onClearRecommendation();
    }
  }, [pendingRecommendation]);

  const fetchIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .in('status', ['idea', 'writing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (err) {
      console.error('Error fetching ideas:', err);
    }
  };

  const handleAddIdea = async (e) => {
    e.preventDefault();
    if (!newIdeaText.trim()) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          raw_idea: newIdeaText.trim(),
          status: 'idea',
          thinking_answers: {},
        })
        .select()
        .single();

      if (error) throw error;
      setIdeas([data, ...ideas]);
      setNewIdeaText('');
      // Auto open the newly created idea in the editor
      handleSelectPost(data);
    } catch (err) {
      console.error('Error adding idea:', err);
    }
  };

  const handleSelectPost = (post) => {
    setActivePost(post);
    setDraft(post.draft || '');
    setFormat(post.format || '');
    setPillar(post.pillar || '');
    setThinkingAnswers(post.thinking_answers || {});
    setEditorStage(1);
    setAiSuggestion(null);
    setShowPublishPanel(false);
  };

  const handleSaveDraft = async () => {
    if (!activePost) return;

    try {
      const nextStatus = draft.trim() ? 'writing' : 'idea';
      const { data, error } = await supabase
        .from('posts')
        .update({
          draft: draft,
          format: format,
          pillar: pillar,
          status: nextStatus,
          thinking_answers: thinkingAnswers,
        })
        .eq('id', activePost.id)
        .select()
        .single();

      if (error) throw error;

      // Update local lists
      setIdeas(ideas.map(i => i.id === data.id ? data : i));
      setActivePost(data);
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  };

  // Auto-save draft changes when user moves off page or saves
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activePost && (draft !== activePost.draft || format !== activePost.format || pillar !== activePost.pillar)) {
        handleSaveDraft();
      }
    }, 1500); // 1.5s debounce auto-save

    return () => clearTimeout(timer);
  }, [draft, format, pillar]);

  // AI ACTIONS
  const handleAISuggestPillar = async () => {
    if (!draft.trim()) {
      alert('Write some draft content first so the AI can evaluate the post pillar!');
      return;
    }
    setAiSuggestLoading(true);
    setAiSuggestion(null);

    try {
      const result = await suggestPillar(draft);
      setAiSuggestion(result);
    } catch (err) {
      console.error(err);
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const handleAcceptAISuggestion = () => {
    if (aiSuggestion) {
      setPillar(aiSuggestion.pillar);
      setAiSuggestion(null);
    }
  };

  const handleAIRevamp = async () => {
    if (!draft.trim()) {
      alert('Type a draft first to revamp!');
      return;
    }
    setAiRevampLoading(true);

    try {
      const revamped = await revampPost(draft);
      setRevampedText(revamped);
      setShowRevampModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setAiRevampLoading(false);
    }
  };

  const handleAcceptRevamp = () => {
    setDraft(revampedText);
    setShowRevampModal(false);
    setRevampedText('');
  };

  const handlePublish = async () => {
    if (!activePost) return;
    setIsPublishing(true);

    try {
      const currentDate = new Date();
      const oneJan = new Date(currentDate.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((currentDate - oneJan) / (24 * 60 * 60 * 1000));
      const currentWeekNumber = Math.ceil((currentDate.getDay() + 1 + numberOfDays) / 7);

      const { error } = await supabase
        .from('posts')
        .update({
          status: 'published',
          dms: parseInt(dms) || 0,
          week_number: currentWeekNumber,
          published_at: new Date(publishDate).toISOString(),
        })
        .eq('id', activePost.id);

      if (error) throw error;

      setIdeas(ideas.filter(i => i.id !== activePost.id));
      setActivePost(null);
      setDraft('');
      setFormat('');
      setPillar('');
      setShowPublishPanel(false);
    } catch (err) {
      console.error('Error publishing post:', err);
      alert('Failed to log published stats.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden animate-fadeIn">
      
      {/* LEFT PANEL — Ideas Parking Lot */}
      <div className="w-80 border-r border-[--border-color]/60 bg-[--bg-secondary]/45 shrink-0 flex flex-col h-full overflow-hidden select-none">
        
        {/* Parking Lot Title */}
        <div className="p-5 border-b border-[--border-color]/50 bg-[--bg-secondary]/80 flex flex-col gap-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Ideas Parking Lot
          </h3>
          <p className="text-[10px] text-[--text-secondary]">
            Dump seed thoughts instantly. Write later.
          </p>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddIdea} className="p-4 border-b border-[--border-color]/40 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newIdeaText}
              onChange={(e) => setNewIdeaText(e.target.value)}
              placeholder="Dump a raw post seed..."
              className="flex-1 bg-[--bg-primary] border border-[--border-color] text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[--accent-primary] transition-all placeholder:text-[--text-secondary]/50"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-[--bg-tertiary] border border-[--border-color] hover:border-[--accent-primary] text-[--accent-primary] rounded-lg transition-all hover:bg-[--accent-glow] flex items-center justify-center cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </form>

        {/* List of Ideas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
          {ideas.length > 0 ? (
            ideas.map((idea) => {
              const isSelected = activePost?.id === idea.id;
              const hasDraft = idea.draft && idea.draft.trim();
              return (
                <button
                  key={idea.id}
                  onClick={() => handleSelectPost(idea)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[--bg-tertiary] border-[--accent-primary]/80 shadow-[0_4px_15px_rgba(0,180,216,0.04)]'
                      : 'bg-[--bg-primary]/30 border-[--border-color]/60 hover:bg-[--bg-tertiary]/40 hover:border-[--accent-primary]/40'
                  }`}
                >
                  <span className="text-xs font-bold text-white leading-snug line-clamp-2">
                    {idea.raw_idea}
                  </span>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {/* Status Badge */}
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider ${
                      hasDraft 
                        ? 'bg-[--accent-primary]/10 text-[--accent-primary] border border-[--accent-primary]/25'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25'
                    }`}>
                      {hasDraft ? 'Drafting' : 'Seed'}
                    </span>
                    <span className="text-[9px] text-[--text-secondary]">
                      {new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[--border-color]/20 rounded-2xl">
              <svg className="w-8 h-8 text-[--text-secondary]/35 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[--text-secondary]">
                Parking Lot is empty
              </span>
              <p className="text-[9px] text-[--text-secondary]/60 max-w-[170px] mt-0.5">
                Dump some seed post hooks at the top to park your ideas.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT PANEL — Post Editor */}
      <div className="flex-1 bg-[--bg-primary] flex flex-col h-full overflow-hidden relative">
        {activePost ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Editor Header / Stage Tabs */}
            <div className="px-8 py-4 border-b border-[--border-color]/50 bg-[--bg-secondary]/30 flex items-center justify-between shrink-0 select-none">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[--accent-primary]">
                  Active Editor Session
                </span>
                <span className="text-xs font-bold text-white line-clamp-1 max-w-[320px]">
                  {activePost.raw_idea}
                </span>
              </div>

              {/* Stage Indicators */}
              <div className="flex gap-1.5 p-1 bg-[--bg-primary] border border-[--border-color] rounded-xl">
                <button
                  onClick={() => { setEditorStage(1); setShowPublishPanel(false); }}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    editorStage === 1
                      ? 'bg-[--bg-tertiary] text-white border border-[--border-color]/50'
                      : 'text-[--text-secondary] hover:text-white'
                  }`}
                >
                  1. Write
                </button>
                <button
                  onClick={() => { setEditorStage(2); }}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    editorStage === 2
                      ? 'bg-[--bg-tertiary] text-white border border-[--border-color]/50'
                      : 'text-[--text-secondary] hover:text-white'
                  }`}
                >
                  2. Ready
                </button>
              </div>
            </div>

            {/* Stage Body Wrapper */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
              
              {/* STAGE 1: WRITE */}
              {editorStage === 1 && (
                <div className="space-y-6 animate-slideIn">
                  
                  {/* Strategic Formatting Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Format Selector */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                        LinkedIn Content Format
                      </label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        className="w-full bg-[--bg-secondary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all cursor-pointer"
                      >
                        <option value="">Select Structure</option>
                        {FORMATS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    {/* Manual Pillar Selector */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                        Content Pillar Tag
                      </label>
                      <select
                        value={pillar}
                        onChange={(e) => setPillar(e.target.value)}
                        className="w-full bg-[--bg-secondary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all cursor-pointer"
                      >
                        <option value="">Select Pillar</option>
                        {PILLARS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* Main Writing Area */}
                  <div className="flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                        Write Post Draft
                      </label>
                      <span className="text-[10px] font-semibold text-[--text-secondary]">
                        {draft.length.toLocaleString()} characters
                      </span>
                    </div>

                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Start drafting your LinkedIn message. Focus on direct messaging, challenge conventions..."
                      rows={12}
                      className="w-full bg-[--bg-secondary]/60 text-sm text-[--text-primary] border border-[--border-color] rounded-2xl p-5 focus:outline-none focus:border-[--accent-primary] focus:ring-1 focus:ring-[--accent-primary] transition-all resize-none placeholder:text-[--text-secondary]/45 font-sans leading-relaxed"
                    />

                    {/* AI Buttons Row Overlay at the bottom */}
                    <div className="absolute right-4 bottom-4 flex gap-2">
                      {/* Suggest Pillar */}
                      <button
                        onClick={handleAISuggestPillar}
                        disabled={aiSuggestLoading || !draft.trim()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[--bg-tertiary] hover:bg-[--border-color] border border-[--border-color] hover:border-[--accent-primary]/40 text-[10px] font-bold text-white uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {aiSuggestLoading ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 text-[--accent-primary]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            AI Suggest Pillar
                          </>
                        )}
                      </button>

                      {/* AI Revamp */}
                      <button
                        onClick={handleAIRevamp}
                        disabled={aiRevampLoading || !draft.trim()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-[10px] font-bold text-white uppercase tracking-wider rounded-lg transition-all hover:opacity-95 shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      >
                        {aiRevampLoading ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Revamping...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Revamp
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Suggestion Indicator Display Box */}
                  {aiSuggestion && (
                    <div className="p-4 bg-[--bg-secondary] border border-[--accent-primary]/25 rounded-xl flex items-start gap-3.5 animate-fadeIn">
                      <div className="p-1 rounded-lg bg-[--accent-primary]/10 border border-[--accent-primary]/30 shrink-0">
                        <svg className="w-5 h-5 text-[--accent-primary]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[--accent-primary]">
                            AI Suggestion
                          </span>
                          <button
                            onClick={handleAcceptAISuggestion}
                            className="px-2.5 py-1 bg-[--accent-primary]/15 hover:bg-[--accent-primary]/30 border border-[--accent-primary]/35 text-[9px] font-bold uppercase tracking-wider text-[--accent-primary] rounded-md transition-all cursor-pointer"
                          >
                            Accept Suggestion
                          </button>
                        </div>
                        <p className="text-xs font-bold text-white">
                          Pillar: {aiSuggestion.pillar}
                        </p>
                        <p className="text-[11px] text-[--text-secondary]">
                          {aiSuggestion.reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Manual Save Indicator Button */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] text-[--text-secondary]/70 font-semibold italic">
                      Auto-saves draft changes in the background...
                    </span>
                    <button
                      onClick={() => setEditorStage(2)}
                      className="px-5 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Advance to Stage 2: Ready
                    </button>
                  </div>

                </div>
              )}

              {/* STAGE 2: READY TO PUBLISH */}
              {editorStage === 2 && (
                <div className="space-y-6 animate-slideIn">
                  
                  <div className="glass-card p-6 border border-[--border-color] space-y-5">
                    
                    <div className="flex items-center justify-between pb-3 border-b border-[--border-color]/40 select-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[--accent-primary]">
                        Final Post Preview
                      </span>
                      <div className="flex gap-2">
                        {format && (
                          <span className="text-[9px] font-bold text-[--text-secondary] bg-[--bg-tertiary] border border-[--border-color] px-2 py-0.5 rounded-full">
                            {format}
                          </span>
                        )}
                        {pillar && (
                          <span className="text-[9px] font-bold text-[--text-secondary] bg-[--bg-tertiary] border border-[--border-color] px-2 py-0.5 rounded-full">
                            {pillar}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pre-formatted Draft display */}
                    <div className="text-sm text-[--text-primary] font-sans leading-relaxed whitespace-pre-wrap p-4 bg-[--bg-primary]/50 border border-[--border-color]/40 rounded-xl max-h-[360px] overflow-y-auto scrollbar-thin select-text selection:bg-[--accent-primary]/30 selection:text-white">
                      {draft ? draft : <span className="text-[--text-secondary] italic">Empty Draft Content</span>}
                    </div>

                  </div>

                  {/* Ready to Publish actions */}
                  <div className="flex justify-between items-center select-none">
                    <button
                      onClick={() => setEditorStage(1)}
                      className="px-4 py-2.5 text-xs font-bold text-[--text-secondary] hover:text-white uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Back to Editor
                    </button>

                    <button
                      onClick={() => setShowPublishPanel(true)}
                      disabled={!draft.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[--accent-primary]/20 active:scale-95 transition-all duration-300 glow-accent cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark as Published
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        ) : (
          /* Editor Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,180,216,0.03),rgba(255,255,255,0))] select-none">
            <div className="p-4 rounded-full bg-[--bg-secondary] border border-[--border-color] mb-4">
              <svg className="w-8 h-8 text-[--accent-primary]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              No active editor session
            </h3>
            <p className="text-xs text-[--text-secondary] max-w-[280px] mt-1.5 leading-relaxed">
              Create a new draft in the Ideas Parking Lot, or select an existing parked seed card on the left to begin writing.
            </p>
          </div>
        )}
      </div>

      {/* AI REVAMP SIDE-BY-SIDE MODAL */}
      {showRevampModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-card flex flex-col w-full max-w-4xl max-h-[90vh] bg-[--bg-secondary] border border-[--border-color] rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-color] select-none">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  AI Creative Revamp Audit
                </h3>
                <p className="text-[10px] text-[--text-secondary]">
                  Compare the rewritten content in the Web Solutionist tone and voice
                </p>
              </div>
              <button
                onClick={() => setShowRevampModal(false)}
                className="p-1 rounded-lg text-[--text-secondary] hover:text-white hover:bg-[--bg-tertiary] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Split Screen Body */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[--border-color]">
              
              {/* Left Screen: Original */}
              <div className="flex flex-col h-full overflow-hidden p-6 gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary] select-none">
                  Original Writer Draft
                </span>
                <div className="flex-1 overflow-y-auto p-4 bg-[--bg-primary]/45 border border-[--border-color]/40 rounded-xl text-xs text-[--text-primary] font-sans leading-relaxed whitespace-pre-wrap select-text">
                  {draft}
                </div>
              </div>

              {/* Right Screen: AI Revamped */}
              <div className="flex flex-col h-full overflow-hidden p-6 gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[--accent-primary] select-none">
                  AI Optimized Draft (Challenging & Emotionally Textured)
                </span>
                <div className="flex-1 overflow-y-auto p-4 bg-[--bg-primary]/70 border border-[--accent-primary]/30 rounded-xl text-xs text-[--text-primary] font-sans leading-relaxed whitespace-pre-wrap selection:bg-[--accent-primary]/30 select-text">
                  {revampedText}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-[--border-color] bg-[--bg-primary]/20 select-none">
              <button
                onClick={() => setShowRevampModal(false)}
                className="px-4 py-2 text-xs font-bold text-[--text-secondary] hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Discard AI Version
              </button>

              <button
                onClick={handleAcceptRevamp}
                className="px-6 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer glow-accent"
              >
                Accept AI Revamp
              </button>
            </div>

          </div>
        </div>
      )}

      {/* READY TO PUBLISH STATISTICS SLIDEOVER PANEL / MODAL */}
      {showPublishPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card flex flex-col w-full max-w-md bg-[--bg-secondary] border border-[--border-color] rounded-2xl shadow-2xl overflow-hidden animate-scaleIn select-none">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-color]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Publish Post
                </h3>
                <p className="text-[10px] text-[--text-secondary]">
                  Log this post to your published archives
                </p>
              </div>
              <button
                onClick={() => setShowPublishPanel(false)}
                className="p-1.5 rounded-lg text-[--text-secondary] hover:text-white hover:bg-[--bg-tertiary] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Inputs Body */}
            <div className="p-6 space-y-4 border-b border-[--border-color]/35">
              
              <p className="text-[10px] text-[--text-secondary] leading-relaxed">
                This logs the post as published. You can update impressions, comments, profile views, DMs, and audience data later in the <strong className="text-[--accent-primary]">Published Tracker</strong>.
              </p>

              {/* DMs (optional at publish) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                  DMs Received So Far (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={dms}
                  onChange={(e) => setDms(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all"
                />
              </div>

              {/* Publish Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                  Publish Date
                </label>
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all [color-scheme:dark]"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-between bg-[--bg-primary]/15">
              <button
                onClick={() => setShowPublishPanel(false)}
                className="px-4 py-2 text-xs font-bold text-[--text-secondary] hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer glow-accent"
              >
                {isPublishing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Logging...
                  </>
                ) : (
                  <>Confirm Publication</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
