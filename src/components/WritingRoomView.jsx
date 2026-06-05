import { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../utils/supabase';
import PillarBadge from './PillarBadge';
import Button from './ui/Button';
import PropertyPill from './ui/PropertyPill';

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
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-3 text-left transition-ui ${
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
    </button>
  );
}

function SeedCard({ post, onDraft, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `post:${post.id}`,
    data: { post },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`group rounded-xl border border-border-brand/50 bg-bg-secondary/80 p-4 shadow-sm transition-ui ${
        isDragging ? 'opacity-40 shadow-lg shadow-accent/10' : 'hover:-translate-y-0.5 hover:border-accent/35 hover:bg-bg-tertiary/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded-lg border border-border-brand/50 bg-bg-primary/60 p-1.5 text-text-secondary transition-ui cursor-grab active:cursor-grabbing hover:border-accent/40 hover:text-accent"
          title="Drag seed"
          {...attributes}
          {...listeners}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-3 text-sm font-semibold leading-relaxed text-text-primary">{post.raw_idea || 'Untitled seed'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PropertyPill label="Seed" dot />
            <span className="text-xs text-text-muted">
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
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
    </div>
  );
}

function DraftListCard({ post, onSelect, onDelete }) {
  return (
    <div
      className="group rounded-xl border border-border-brand/45 bg-bg-secondary/70 p-4 transition-ui hover:border-accent/35 hover:bg-bg-tertiary/70"
    >
      <button type="button" onClick={() => onSelect(post)} className="block w-full text-left">
        <div className="flex items-center gap-2">
          <PropertyPill label={statusLabel(post.status)} dot />
          {post.pillar && <PillarBadge pillar={post.pillar} size="sm" />}
        </div>
        <p className="mt-3 line-clamp-2 text-sm font-semibold text-text-primary">
          {post.hook_idea || post.raw_idea || post.draft || 'Untitled draft'}
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
    </div>
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
  const [activeBoardTab, setActiveBoardTab] = useState('idea');
  const [searchQuery, setSearchQuery] = useState('');
  const [planningOpen, setPlanningOpen] = useState(false);
  const [draggedPost, setDraggedPost] = useState(null);
  const autoSaveTimer = useRef(null);
  const initDone = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const groupedPosts = {
    seeds: posts.filter(p => p.status === 'idea').sort(sortPosts),
    drafting: posts.filter(p => p.status === 'drafting').sort(sortPosts),
    scheduled: posts.filter(p => p.status === 'scheduled').sort(sortPosts),
  };

  const visibleBoardPosts = posts
    .filter(p => p.status === activeBoardTab)
    .filter(p => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return [p.raw_idea, p.hook_idea, p.draft, p.angle, p.cta, p.pillar, p.format].some(value =>
        (value || '').toLowerCase().includes(q)
      );
    })
    .sort(sortPosts);

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
  };

  const syncPost = (updatedPost) => {
    setPosts(prev => prev.map(p => (p.id === updatedPost.id ? updatedPost : p)));
    setActivePost(prev => (prev?.id === updatedPost.id ? updatedPost : prev));
  };

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .in('status', ['idea', 'scheduled', 'drafting'])
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (!error) setPosts(data || []);
    };
    load();
  }, []);

  useEffect(() => {
    if (initDone.current) return;
    if (initialPost) {
      const p = initialPost;
      Promise.resolve().then(() => {
        setActivePost(p);
        setDraft(p.draft || '');
        setHookIdea(p.hook_idea || '');
        setFormat(p.format || '');
        setPillar(p.pillar || '');
        setAngle(p.angle || '');
        setCta(p.cta || '');
        setPlanningOpen(Boolean(p.hook_idea || p.format || p.pillar || p.angle || p.cta));
      });
    }
    initDone.current = true;
  }, [initialPost]);

  const handleCreateSeed = async () => {
    const idea = quickIdeaText.trim();
    if (!idea) return;
    setError('');
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({ raw_idea: idea, status: 'idea', calendar_date: null })
        .select()
        .single();
      if (error) throw error;
      setPosts(prev => [data, ...prev]);
      setQuickIdeaText('');
      setActiveBoardTab('idea');
    } catch (err) {
      console.error('Error adding seed:', err);
      setError(err.message || 'Failed to add seed.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleQuickCaptureSubmit = async (e) => {
    e.preventDefault();
    await handleCreateSeed();
  };

  const handleMovePost = async (postId, nextStatus, options = {}) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return null;
    const patch = { status: nextStatus };
    if (nextStatus === 'idea') patch.calendar_date = null;
    if (nextStatus === 'drafting' && post.status === 'idea') patch.calendar_date = null;
    if (options.select) patch.display_order = post.display_order ?? Date.now();

    const optimistic = { ...post, ...patch };
    setPosts(prev => prev.map(p => (p.id === postId ? optimistic : p)));
    if (activePost?.id === postId) setActivePost(optimistic);

    try {
      const { data, error } = await supabase
        .from('posts')
        .update(patch)
        .eq('id', postId)
        .select()
        .single();
      if (error) throw error;
      syncPost(data);
      if (options.select) handleSelectPost(data);
      return data;
    } catch (err) {
      console.error('Error moving post:', err);
      await fetchPosts();
      setError(err.message || 'Failed to move post.');
      setTimeout(() => setError(''), 5000);
      return null;
    }
  };

  const handleDraftSeed = async (post) => {
    const moved = await handleMovePost(post.id, 'drafting', { select: true });
    if (moved) {
      setActiveBoardTab('drafting');
      setToast({ message: 'Seed moved to Drafting', type: 'success' });
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleSaveDraft = async () => {
    if (!activePost) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ draft, hook_idea: hookIdea, format, pillar, angle, cta })
        .eq('id', activePost.id)
        .select()
        .single();
      if (error) throw error;
      syncPost(data);
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  };

  const handlePublish = async () => {
    if (!activePost) return;
    const postBody = draft.trim() || hookIdea.trim() || activePost.raw_idea?.trim();
    if (!postBody) return;
    try {
      const { error } = await supabase
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
          calendar_date: activePost.calendar_date || todayDateStr,
        })
        .eq('id', activePost.id);
      if (error) throw error;

      setPosts(prev => prev.filter(i => i.id !== activePost.id));
      resetEditor();
      setToast({ message: `Published to ${activePost.calendar_date || todayDateStr}`, type: 'success' });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        ) : activeBoardTab === 'idea' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleBoardPosts.map(post => (
              <SeedCard key={post.id} post={post} onDraft={handleDraftSeed} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleBoardPosts.map(post => (
              <DraftListCard key={post.id} post={post} onSelect={handleSelectPost} onDelete={handleDelete} />
            ))}
          </div>
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

          <div className="mt-auto rounded-xl border border-border-brand/35 bg-bg-primary/55 p-3">
            <p className="text-[10px] leading-relaxed text-text-secondary">Drag seeds into Drafting, or open the board to work through them calmly.</p>
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
                <Button onClick={handlePublish} disabled={!(draft.trim() || hookIdea.trim() || activePost.raw_idea?.trim())} size="sm">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Publish
                </Button>
              </footer>
            </>
          ) : renderIdeaDump()}
        </main>

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slideIn">
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-bg-secondary px-4 py-2.5 shadow-lg">
              <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-semibold text-text-primary">{toast.message}</span>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {draggedPost ? (
          <div className="w-64 rounded-xl border border-accent/40 bg-bg-tertiary p-4 shadow-2xl shadow-accent/15">
            <p className="line-clamp-2 text-sm font-semibold text-text-primary">{draggedPost.raw_idea || draggedPost.hook_idea || 'Untitled'}</p>
            <p className="mt-2 text-xs text-accent">Move to stage</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
