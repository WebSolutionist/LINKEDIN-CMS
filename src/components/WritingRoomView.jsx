import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../utils/supabase';
import PillarBadge from './PillarBadge';
import Button from './ui/Button';
import PropertyPill from './ui/PropertyPill';
import { spring, micro, stagger, staggerContainer, cardItem, toastItem } from '../utils/animations';
import { getPostTitle } from '../utils/posts';
import { generateThinkingQuestions, polishPostContent } from '../utils/gemini';

const FORMATS = ['Story Post', 'Educational Post', 'Case Study', 'Opinion Post', 'Contrarian Post', 'Offer Post'];
const PILLARS = ['Website Reality', 'Strategic Reframe', 'Web Solution Thinking', 'Personal Reflection', 'Soft Positioning'];

const SECTION_CONFIG = [
  { key: 'seeds', label: 'Seeds', status: 'idea', color: 'text-warning', dot: 'bg-warning' },
  { key: 'drafting', label: 'Drafting', status: 'drafting', color: 'text-accent', dot: 'bg-accent' },
  { key: 'scheduled', label: 'Scheduled', status: 'scheduled', color: 'text-accent-purple', dot: 'bg-accent-purple' },
];

const statusLabel = (status) => {
  if (status === 'idea') return 'Seed';
  if (status === 'drafting') return 'Drafting';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'published') return 'Published';
  return status;
};

const selectPillClass =
  'appearance-none bg-bg-tertiary text-text-primary text-xs font-medium border border-border-brand/50 rounded-full pl-3 pr-8 py-1.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-ui cursor-pointer';

const selectChevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
};

const sortPosts = (a, b) => {
  const aOrder = a.display_order ?? 999999;
  const bOrder = b.display_order ?? 999999;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return new Date(b.created_at) - new Date(a.created_at);
};

function PipelineDropZone({ config, count, active, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${config.status}` });

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`w-full rounded-xl border px-3 py-3 text-left ${
        isOver
          ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10'
          : active
            ? 'border-accent/50 bg-bg-tertiary'
            : 'border-border-brand/45 bg-bg-primary/45 hover:border-accent/30 hover:bg-bg-tertiary/70'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
        <span className={`text-[10px] font-bold uppercase ${config.color}`}>{config.label}</span>
        <span className="ml-auto rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-bold text-text-secondary">
          {count}
        </span>
      </div>
    </motion.button>
  );
}

function SeedCard({ post, onDraft, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `post:${post.id}`,
    data: { post },
  });

  return (
    <motion.div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      whileHover={{ ...micro.hoverLift }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`group relative rounded-xl border border-border-brand/45 bg-bg-secondary/70 p-4 hover:border-accent/35 hover:bg-bg-tertiary/70 ${
        isDragging ? 'opacity-40 shadow-xl' : ''
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <div className="flex items-center justify-between gap-2">
          <PropertyPill label={statusLabel(post.status)} dot />
          <span className="text-[10px] font-medium text-text-secondary">
            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <p className="mt-3 line-clamp-3 text-sm font-semibold text-text-primary">
          {getPostTitle(post)}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button size="sm" variant="secondary" onClick={() => onDraft(post)}>
          Draft
        </Button>
        <button
          type="button"
          onClick={() => onDelete(post.id)}
          className="rounded-lg p-1.5 text-text-muted opacity-0 transition-ui hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
          title="Delete seed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

function DraftListCard({ post, onSelect, onDelete }) {
  return (
    <motion.div
      whileHover={{ ...micro.hoverLift }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="group rounded-xl border border-border-brand/45 bg-bg-secondary/70 p-4 hover:border-accent/35 hover:bg-bg-tertiary/70"
    >
      <button type="button" onClick={() => onSelect(post)} className="block w-full text-left">
        <div className="flex items-center gap-2">
          <PropertyPill label={statusLabel(post.status)} dot />
          {post.pillar && <PillarBadge pillar={post.pillar} size="sm" />}
        </div>
        <p className="mt-3 line-clamp-2 text-sm font-semibold text-text-primary">
          {getPostTitle(post)}
        </p>
        {post.draft && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-secondary">{post.draft}</p>}
      </button>
      <div className="mt-4 flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => onSelect(post)}>
          Open
        </Button>
        <button
          type="button"
          onClick={() => onDelete(post.id)}
          className="rounded-lg p-1.5 text-text-muted opacity-0 transition-ui hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
          title="Delete post"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

export default function WritingRoomView({ initialPost, onNavigateToCalendar }) {
  const [posts, setPosts] = useState([]);
  const [activePost, setActivePost] = useState(null);
  const [quickIdeaText, setQuickIdeaText] = useState('');
  const [draft, setDraft] = useState('');
  const [hookIdea, setHookIdea] = useState('');
  const [format, setFormat] = useState('');
  const [pillar, setPillar] = useState('');
  const [angle, setAngle] = useState('');
  const [cta, setCta] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [draggedPost, setDraggedPost] = useState(null);

  const [activeBoardTab, setActiveBoardTab] = useState('drafting');
  const [planningOpen, setPlanningOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Link AI Assistant State
  const [linkThinking, setLinkThinking] = useState(false);
  const [linkAiResult, setLinkAiResult] = useState(null);
  const [showLinkPanel, setShowLinkPanel] = useState(false);

  const autoSaveTimer = useRef(null);
  const initDone = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .in('status', ['idea', 'scheduled', 'drafting'])
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  const handleSelectPost = (post) => {
    setActivePost(post);
    setDraft(post.draft || '');
    setHookIdea(post.hook_idea || '');
    setFormat(post.format || '');
    setPillar(post.pillar || '');
    setAngle(post.angle || '');
    setCta(post.cta || '');
    setPlanningOpen(Boolean(post.hook_idea || post.format || post.pillar || post.angle || post.cta));
    setLinkAiResult(null);
  };

  const resetEditor = () => {
    setActivePost(null);
    setDraft('');
    setHookIdea('');
    setFormat('');
    setPillar('');
    setAngle('');
    setCta('');
    setPlanningOpen(false);
    setLinkAiResult(null);
  };

  const syncPost = (updatedPost) => {
    setPosts(prev => prev.map(p => (p.id === updatedPost.id ? updatedPost : p)));
    setActivePost(prev => (prev?.id === updatedPost.id ? updatedPost : prev));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (initDone.current) return;
    if (initialPost) {
      handleSelectPost(initialPost);
      if (initialPost.status === 'idea') setActiveBoardTab('idea');
      else setActiveBoardTab('drafting');
    }
    initDone.current = true;
  }, [initialPost]);

  const groupedPosts = {
    seeds: posts.filter(p => p.status === 'idea').sort(sortPosts),
    drafting: posts.filter(p => p.status === 'drafting').sort(sortPosts),
    scheduled: posts.filter(p => p.status === 'scheduled').sort(sortPosts),
  };

  const visibleBoardPosts = (
    activeBoardTab === 'idea'
      ? groupedPosts.seeds
      : activeBoardTab === 'scheduled'
        ? groupedPosts.scheduled
        : groupedPosts.drafting
  ).filter(post => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = getPostTitle(post).toLowerCase();
    const raw = (post.raw_idea || '').toLowerCase();
    return title.includes(q) || raw.includes(q);
  });

  const handleCreateSeed = async () => {
    const text = quickIdeaText.trim();
    if (!text) return;
    setQuickIdeaText('');

    const newSeed = {
      raw_idea: text,
      status: 'idea',
      display_order: groupedPosts.seeds.length,
    };

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert(newSeed)
        .select()
        .single();
      if (error) throw error;
      setPosts(prev => [data, ...prev]);
    } catch (err) {
      console.error('Error creating seed:', err);
      setError(err.message || 'Failed to save seed.');
      setQuickIdeaText(text);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleQuickCaptureSubmit = (e) => {
    e.preventDefault();
    handleCreateSeed();
  };

  const handleDraftSeed = async (post) => {
    await handleMovePost(post.id, 'drafting', { select: true });
    setActiveBoardTab('drafting');
  };

  const handleMovePost = async (postId, nextStatus, { select = false } = {}) => {
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    const previousPosts = posts;
    const updatedPost = { ...targetPost, status: nextStatus };
    setPosts(prev => prev.map(p => (p.id === postId ? updatedPost : p)));

    if (select || activePost?.id === postId) {
      handleSelectPost(updatedPost);
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ status: nextStatus })
        .eq('id', postId)
        .select()
        .single();
      if (error) throw error;
      syncPost(data);
    } catch (err) {
      console.error('Error moving post:', err);
      setPosts(previousPosts);
      setError(err.message || 'Failed to update post status.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleSaveDraft = async () => {
    if (!activePost) return;

    const payload = {
      draft,
      hook_idea: hookIdea,
      format,
      pillar,
      angle,
      cta,
    };

    try {
      const { data, error } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', activePost.id)
        .select()
        .single();
      if (error) throw error;
      syncPost(data);
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  };

  // Trigger Link AI Assistant Thinking
  const handleConsultLinkAssistant = async () => {
    if (!activePost && !quickIdeaText.trim()) return;
    const textToAnalyze = activePost?.raw_idea || activePost?.draft || quickIdeaText;
    if (!textToAnalyze) return;

    setLinkThinking(true);
    setShowLinkPanel(true);
    setLinkAiResult(null);

    const result = await generateThinkingQuestions(textToAnalyze);
    setLinkThinking(false);

    if (result) {
      setLinkAiResult(result);
      if (result.recommendedFormat && !format) setFormat(result.recommendedFormat);
      if (result.targetAudience && !icp) setIcp(result.targetAudience);
    } else {
      setLinkAiResult({ error: 'Link Assistant could not generate a response. Ensure your Gemini API Key is set in .env' });
    }
  };

  const handlePublish = async () => {
    if (!activePost) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({
          draft,
          hook_idea: hookIdea,
          format,
          pillar,
          angle,
          cta,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', activePost.id)
        .select()
        .single();
      if (error) throw error;

      setPosts(prev => prev.filter(p => p.id !== activePost.id));
      resetEditor();
      setToast({ message: 'Post published successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error('Error publishing:', err);
      setError(err.message || 'Failed to publish.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    const previousPosts = posts;
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (activePost?.id === postId) resetEditor();
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting post:', err);
      setPosts(previousPosts);
      setError(err.message || 'Failed to delete post.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDragStart = (event) => {
    setDraggedPost(event.active.data.current?.post || null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setDraggedPost(null);
    if (!over) return;
    const postId = String(active.id).replace('post:', '');
    const targetStatus = String(over.id).replace('stage:', '');
    if (!['idea', 'drafting', 'scheduled'].includes(targetStatus)) return;
    await handleMovePost(postId, targetStatus, { select: targetStatus === 'drafting' });
    if (targetStatus === 'drafting') setActiveBoardTab('drafting');
    if (targetStatus === 'idea') setActiveBoardTab('idea');
  };

  useEffect(() => {
    if (activePost) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(handleSaveDraft, 900);
    }
    return () => clearTimeout(autoSaveTimer.current);
  }, [draft, hookIdea, format, pillar, angle, cta]);

  const renderIdeaDump = () => (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-border-brand/50 bg-bg-secondary/70 p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Idea Dump</h2>
              <p className="text-sm text-text-secondary">Capture raw thoughts here. They stay out of the calendar until you move them forward.</p>
            </div>
            <PropertyPill label={`${groupedPosts.seeds.length} seeds`} />
          </div>

          <form onSubmit={handleQuickCaptureSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={quickIdeaText}
              onChange={e => setQuickIdeaText(e.target.value)}
              onBlur={handleCreateSeed}
              placeholder="Drop a plain idea and press Enter..."
              className="min-w-0 flex-1 rounded-xl border border-border-brand/50 bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition-ui placeholder:text-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent/20"
            />
            <Button type="submit" className="shrink-0">Save Seed</Button>
          </form>
          {error && <p className="mt-3 text-xs font-medium text-danger">{error}</p>}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {SECTION_CONFIG.map(config => (
              <button
                key={config.status}
                type="button"
                onClick={() => setActiveBoardTab(config.status)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-ui ${
                  activeBoardTab === config.status
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-brand/45 bg-bg-secondary/70 text-text-secondary hover:border-accent/30 hover:text-text-primary'
                }`}
              >
                {config.label} {groupedPosts[config.key].length}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ideas..."
              className="w-full rounded-xl border border-border-brand/45 bg-bg-secondary/75 py-2 pl-9 pr-3 text-sm text-text-primary outline-none transition-ui placeholder:text-text-muted focus:border-accent"
            />
          </div>
        </div>

        {visibleBoardPosts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border-brand/45 bg-bg-secondary/35 text-center">
            <p className="text-sm font-semibold text-text-primary">No {statusLabel(activeBoardTab).toLowerCase()} posts here yet</p>
            <p className="mt-1 max-w-sm text-xs text-text-secondary">Capture a seed above, or move posts between stages from the pipeline.</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer(stagger.medium.staggerChildren, 0.35)}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {visibleBoardPosts.map(post => (
              <motion.div key={post.id} variants={cardItem}>
                {activeBoardTab === 'idea' ? (
                  <SeedCard post={post} onDraft={handleDraftSeed} onDelete={handleDelete} />
                ) : (
                  <DraftListCard post={post} onSelect={handleSelectPost} onDelete={handleDelete} />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative flex h-full flex-1 overflow-hidden bg-bg-primary">
        <aside className="hidden w-[184px] shrink-0 flex-col gap-3 border-r border-border-brand/50 bg-bg-secondary/85 p-3 md:flex">
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-purple to-accent">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase text-text-primary">Pipeline</p>
              <p className="text-[10px] text-text-secondary">{posts.length} active</p>
            </div>
          </div>

          <div className="space-y-2">
            {SECTION_CONFIG.map(config => (
              <PipelineDropZone
                key={config.status}
                config={config}
                count={groupedPosts[config.key].length}
                active={activeBoardTab === config.status && !activePost}
                onClick={() => {
                  resetEditor();
                  setActiveBoardTab(config.status);
                }}
              />
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-border-brand/40 bg-bg-secondary/30 px-4 py-2">
            <button
              type="button"
              onClick={resetEditor}
              className="flex items-center gap-1.5 rounded-lg border border-border-brand/50 bg-bg-tertiary/50 px-2.5 py-1.5 text-[10px] font-bold uppercase text-text-primary transition-ui hover:border-accent/40 hover:bg-bg-tertiary"
            >
              <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Idea Dump
            </button>

            {activePost && (
              <div className="flex min-w-0 items-center gap-2">
                <PropertyPill label={statusLabel(activePost.status)} dot />
                {pillar && <PillarBadge pillar={pillar} size="sm" />}
              </div>
            )}

            {/* Link AI Assistant Action Trigger */}
            <button
              type="button"
              onClick={handleConsultLinkAssistant}
              className="ml-2 inline-flex items-center gap-1.5 rounded-xl border border-accent-purple/40 bg-accent-purple/15 px-3 py-1.5 text-xs font-bold text-accent-purple transition-ui hover:bg-accent-purple/25 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-accent-purple animate-ping" />
              Link AI Copilot
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              {onNavigateToCalendar && (
                <Button variant="ghost" size="sm" onClick={onNavigateToCalendar}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendar
                </Button>
              )}
              {activePost && (
                <Button variant="danger" size="sm" onClick={() => handleDelete(activePost.id)}>
                  Delete
                </Button>
              )}
            </div>
          </div>

          {activePost ? (
            <>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="mx-auto max-w-3xl px-6 py-8 md:px-10">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={activePost.raw_idea || 'Just write. No distractions...'}
                    className="min-h-[46vh] w-full resize-none border-0 bg-transparent font-sans text-base leading-relaxed text-text-primary outline-none placeholder:text-text-secondary/40 focus:ring-0"
                  />

                  {/* Link AI Panel Result Display */}
                  {showLinkPanel && (
                    <div className="mb-6 rounded-2xl border border-accent-purple/40 bg-accent-purple/10 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-accent-purple">⚡ Link AI Copilot</span>
                          {linkThinking && <span className="text-xs text-text-secondary animate-pulse">Thinking through post...</span>}
                        </div>
                        <button type="button" onClick={() => setShowLinkPanel(false)} className="text-text-secondary hover:text-text-primary text-xs">Close</button>
                      </div>

                      {linkAiResult && !linkAiResult.error && (
                        <div className="space-y-2 text-xs text-text-primary">
                          <div><span className="font-bold text-accent">Target Audience (ICP):</span> {linkAiResult.targetAudience}</div>
                          <div><span className="font-bold text-accent">Emotional Goal:</span> {linkAiResult.emotionalImpact}</div>
                          <div><span className="font-bold text-accent">Core Takeaway:</span> {linkAiResult.coreTakeaway}</div>
                          {linkAiResult.recommendedFormat && (
                            <div className="mt-2 pt-2 border-t border-accent-purple/20">
                              <span className="font-bold text-accent-purple">Recommended Format:</span> {linkAiResult.recommendedFormat}
                            </div>
                          )}
                        </div>
                      )}

                      {linkAiResult?.error && (
                        <p className="text-xs text-rose-400">{linkAiResult.error}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-6 rounded-2xl border border-border-brand/35 bg-bg-secondary/45">
                    <button
                      type="button"
                      onClick={() => setPlanningOpen(open => !open)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-ui hover:bg-bg-tertiary/35"
                    >
                      <div>
                        <p className="text-sm font-bold text-text-primary">Planning fields</p>
                        <p className="text-xs text-text-secondary">Optional hook, format, pillar, angle, and CTA.</p>
                      </div>
                      <svg className={`h-4 w-4 text-text-secondary transition-transform ${planningOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {planningOpen && (
                      <div className="space-y-4 border-t border-border-brand/35 px-4 py-4">
                        <input
                          value={hookIdea}
                          onChange={e => setHookIdea(e.target.value)}
                          placeholder="Hook or topic"
                          className="w-full rounded-xl border border-border-brand/35 bg-bg-primary/70 px-3 py-2.5 text-sm text-text-primary outline-none transition-ui placeholder:text-text-secondary/45 focus:border-accent focus:ring-1 focus:ring-accent/20"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <select value={format} onChange={e => setFormat(e.target.value)} className={selectPillClass} style={selectChevronStyle}>
                            <option value="">Format</option>
                            {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <select value={pillar} onChange={e => setPillar(e.target.value)} className={selectPillClass} style={selectChevronStyle}>
                            <option value="">Pillar</option>
                            {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          {pillar && <PillarBadge pillar={pillar} />}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input
                            value={angle}
                            onChange={e => setAngle(e.target.value)}
                            placeholder="Angle"
                            className="w-full rounded-xl border border-border-brand/35 bg-bg-primary/70 px-3 py-2 text-sm text-text-primary outline-none transition-ui placeholder:text-text-secondary/45 focus:border-accent focus:ring-1 focus:ring-accent/20"
                          />
                          <input
                            value={cta}
                            onChange={e => setCta(e.target.value)}
                            placeholder="CTA"
                            className="w-full rounded-xl border border-border-brand/35 bg-bg-primary/70 px-3 py-2 text-sm text-text-primary outline-none transition-ui placeholder:text-text-secondary/45 focus:border-accent focus:ring-1 focus:ring-accent/20"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border-brand/40 bg-bg-secondary/40 px-6 py-3 md:px-10">
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className={draft.length > 0 ? 'font-medium text-accent' : ''}>{draft.length.toLocaleString()} characters</span>
                  <span className="hidden text-text-secondary/50 sm:inline">Auto-saves after you pause typing</span>
                </div>
                {activePost.status === 'published' ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 px-3 py-1.5 rounded-xl">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Published
                  </span>
                ) : (
                  <Button onClick={handlePublish} disabled={!(draft.trim() || hookIdea.trim() || activePost.raw_idea?.trim())} size="sm">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Publish
                  </Button>
                )}
              </footer>
            </>
          ) : renderIdeaDump()}
        </main>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={toastItem.initial}
              animate={toastItem.animate}
              exit={toastItem.exit}
              transition={toastItem.transition}
              className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
            >
              <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-bg-secondary px-4 py-2.5 shadow-lg">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-semibold text-text-primary">{toast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DragOverlay>
        {draggedPost ? (
          <motion.div
            initial={{ scale: 0.9, rotate: -2, opacity: 0 }}
            animate={{ scale: 1, rotate: -2, opacity: 1 }}
            exit={{ scale: 0.9, rotate: -2, opacity: 0 }}
            transition={{ ...spring.snappy }}
            className="w-64 rounded-xl border border-accent/40 bg-bg-tertiary p-4 shadow-2xl shadow-accent/20"
          >
            <p className="line-clamp-2 text-sm font-semibold text-text-primary">{getPostTitle(draggedPost)}</p>
            <p className="mt-2 text-xs text-accent">Move to stage</p>
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
