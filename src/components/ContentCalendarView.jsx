import { Fragment, useState, useEffect, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../utils/supabase';
import PageHeader from './ui/PageHeader';
import ViewToggle from './ui/ViewToggle';
import Button from './ui/Button';
import PropertyPill from './ui/PropertyPill';
import PillarBadge from './PillarBadge';
import { getPillarDotColor } from '../utils/pillar';
import CalendarEditModal from './CalendarEditModal';
import PostDetailModal from './PostDetailModal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STAGGER_DELAYS = ['', 'animate-delay-100', 'animate-delay-200', 'animate-delay-300', 'animate-delay-400', 'animate-delay-500'];

const VIEW_OPTIONS = [
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'table',
    label: 'Table',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
      </svg>
    ),
  },
  {
    id: 'card',
    label: 'Cards',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
];

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

const formatDateStr = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const normalizeCSVHeader = (header) => header.trim().toLowerCase().replace(/[\s-]+/g, '_');

const postTitle = (post) => post.hook_idea || post.raw_idea || post.draft || 'Untitled';

const isPublished = (post) => post.status === 'published' || Boolean(post.published_at);

const sortByCalendarDate = (a, b) => {
  const aDate = a.calendar_date || '9999-12-31';
  const bDate = b.calendar_date || '9999-12-31';
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  return new Date(a.created_at) - new Date(b.created_at);
};

function DateDropZone({ date, children, className = '', onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: `date:${date}` });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`${className} ${isOver ? 'ring-2 ring-accent ring-inset bg-accent/10' : ''}`}
    >
      {children}
    </div>
  );
}

function DraggableCalendarPost({ post, children, className = '', onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `post:${post.id}`,
    data: { post },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      onClick={onClick}
      className={`${className} ${isDragging ? 'opacity-40' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function TableDateDropRow({ date, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `date:${date}` });

  return (
    <tr ref={setNodeRef} className={`transition-ui ${isOver ? 'bg-accent/10' : 'bg-bg-primary/50'}`}>
      {children}
    </tr>
  );
}

export default function ContentCalendarView({ onNavigateToPost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [editModal, setEditModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const [activeDragPost, setActiveDragPost] = useState(null);
  const [notification, setNotification] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const getPostsForDate = (day) => {
    const dateStr = formatDateStr(currentYear, currentMonth, day);
    return posts.filter(p => p.calendar_date === dateStr).sort(sortByCalendarDate);
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('calendar_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCalendarEntry = async (entry) => {
    try {
      if (entry.id) {
        const { error } = await supabase.from('posts').update(entry).eq('id', entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('posts').insert(entry);
        if (error) throw error;
      }
      fetchPosts();
    } catch (err) {
      console.error('Error saving calendar entry:', err);
      setNotification({ message: err.message || 'Could not save calendar entry', count: 0, type: 'error' });
    }
  };

  const handleDropOnDate = async (date, postId) => {
    const previousPosts = posts;
    const movingPost = posts.find(p => p.id === postId);
    if (!movingPost) return;
    const optimisticPost = { ...movingPost, calendar_date: date, status: movingPost.status === 'published' ? movingPost.status : 'scheduled' };
    setPosts(prev => prev.map(p => (p.id === postId ? optimisticPost : p)).sort(sortByCalendarDate));
    setDetailModal(prev => (prev?.id === postId ? optimisticPost : prev));
    try {
      const { error } = await supabase
        .from('posts')
        .update({ calendar_date: date, status: optimisticPost.status })
        .eq('id', postId);
      if (error) throw error;
      fetchPosts();
    } catch (err) {
      console.error('Error moving post:', err);
      setPosts(previousPosts);
      setNotification({ message: err.message || 'Could not move post', count: 0, type: 'error' });
    }
      setActiveDragPost(null);
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    const previousPosts = posts;
    setPosts(prev => prev.filter(p => p.id !== postId));
    setDetailModal(null);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      fetchPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
      setPosts(previousPosts);
      setNotification({ message: err.message || 'Could not delete post', count: 0, type: 'error' });
    }
  };

  const handleDeleteAll = async () => {
    const totalPosts = posts.length;
    if (totalPosts === 0) return;
    if (!confirm(`Delete ALL ${totalPosts} posts? This cannot be undone.`)) return;
    if (!confirm('Are you absolutely sure? All content will be permanently removed.')) return;
    const previousPosts = posts;
    setPosts([]);
    setDetailModal(null);
    setEditModal(null);
    try {
      const { error } = await supabase.from('posts').delete().not('id', 'is', null);
      if (error) throw error;
      fetchPosts();
      setNotification({ message: `All ${totalPosts} posts deleted`, count: totalPosts, type: 'success' });
    } catch (err) {
      console.error('Error deleting all posts:', err);
      setPosts(previousPosts);
      setNotification({ message: err.message || 'Could not delete posts', count: 0, type: 'error' });
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const monthlyInsights = useMemo(() => {
    const monthly = posts.filter(p => {
      if (!p.published_at) return false;
      const d = new Date(p.published_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    if (monthly.length === 0) return null;

    const formatPerf = {};
    const pillarPerf = {};
    let totalImps = 0;

    monthly.forEach(p => {
      const imps = p.impressions || 0;
      totalImps += imps;
      if (p.format) {
        if (!formatPerf[p.format]) formatPerf[p.format] = { sum: 0, count: 0 };
        formatPerf[p.format].sum += imps;
        formatPerf[p.format].count++;
      }
      if (p.pillar) {
        if (!pillarPerf[p.pillar]) pillarPerf[p.pillar] = { sum: 0, count: 0 };
        pillarPerf[p.pillar].sum += imps;
        pillarPerf[p.pillar].count++;
      }
    });

    const bestFormat = Object.keys(formatPerf).length > 0
      ? Object.keys(formatPerf).reduce((a, b) => (formatPerf[a].sum / formatPerf[a].count) > (formatPerf[b].sum / formatPerf[b].count) ? a : b)
      : null;

    const bestPillar = Object.keys(pillarPerf).length > 0
      ? Object.keys(pillarPerf).reduce((a, b) => (pillarPerf[a].sum / pillarPerf[a].count) > (pillarPerf[b].sum / pillarPerf[b].count) ? a : b)
      : null;

    return {
      totalPosts: monthly.length,
      avgImpressions: Math.round(totalImps / monthly.length),
      bestFormat,
      bestPillar,
    };
  }, [posts, currentMonth, currentYear]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = parseCSVLine(lines[0]).map(normalizeCSVHeader);
      const rows = lines.slice(1);
      let count = 0;

      for (const row of rows) {
        const vals = parseCSVLine(row);
        const entry = {};
        headers.forEach((h, i) => {
          const value = vals[i] || '';
          if (h === 'date' || h === 'calendar_date' || h === 'publish_date') entry.calendar_date = value;
          else if (['topic', 'hook', 'hook_idea', 'title', 'post_topic'].includes(h)) entry.hook_idea = value;
          else if (h === 'format' || h === 'content_format') entry.format = value;
          else if (h === 'pillar' || h === 'content_pillar') entry.pillar = value;
          else if (h === 'angle' || h === 'content_angle') entry.angle = value;
          else if (['cta', 'call_to_action'].includes(h)) entry.cta = value;
        });
        entry.status = 'scheduled';
        if (entry.calendar_date) {
          const { error } = await supabase.from('posts').insert(entry);
          if (!error) count++;
          else console.error('CSV row import failed:', error);
        }
      }
      fetchPosts();
      setNotification({
        message: `post(s) imported for ${MONTHS[currentMonth]}.`,
        count,
        type: 'success',
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const unscheduledPosts = posts.filter(p => !p.calendar_date && ['drafting', 'scheduled'].includes(p.status));

  const isPostDay = (day) => {
    const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const handleDragStart = (event) => {
    const post = event.active.data.current?.post || null;
    setActiveDragPost(post);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const post = active.data.current?.post;
    setActiveDragPost(null);
    if (!post || !over) return;
    const overId = String(over.id);
    if (!overId.startsWith('date:')) return;
    const date = overId.replace('date:', '');
    if (date && post.calendar_date !== date) {
      await handleDropOnDate(date, post.id);
    }
  };

  const handleCellClick = (day) => {
    const postsForDay = getPostsForDate(day);
    if (postsForDay.length > 0) {
      setDetailModal(postsForDay[0]);
    } else {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setEditModal({ date: dateStr, entry: null });
    }
  };

  const handlePostCardClick = (e, post) => {
    e.stopPropagation();
    setDetailModal(post);
  };

  const handleEditFromDetail = (post) => {
    setDetailModal(null);
    if (onNavigateToPost) onNavigateToPost(post);
  };

  const pillarGradientFrom = (pillar) => getPillarDotColor(pillar).replace('bg-', 'from-');

  const renderCalendarView = () => (
    <div className="grid grid-cols-7 gap-px bg-border-brand/20 rounded-xl overflow-hidden border border-border-brand/30">
      {DAYS.map(d => (
        <div key={d} className="bg-bg-secondary px-3 py-2.5 text-center border-b border-border-brand/30">
          <span className="text-xs font-semibold text-text-secondary">{d}</span>
        </div>
      ))}
      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
        <div key={`empty-${i}`} className="bg-bg-primary/50 min-h-[140px] border-b border-r border-border-brand/15" />
      ))}
      {calendarDays.map(day => {
        const postsForDay = getPostsForDate(day);
        const posting = isPostDay(day);
        const today = isToday(day);
        const dateStr = formatDateStr(currentYear, currentMonth, day);

        return (
          <DateDropZone
            key={day}
            date={dateStr}
            onClick={() => handleCellClick(day)}
            className={`bg-bg-primary min-h-[140px] p-2.5 flex flex-col gap-1.5 border-b border-r border-border-brand/15 transition-ui cursor-pointer relative group/cell ${
              today ? 'ring-2 ring-accent ring-inset' : ''
            } ${
              postsForDay.length === 0 ? 'border-dashed border-border-brand/25' : ''
            } ${posting && postsForDay.length === 0 ? 'bg-accent/5' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold tabular-nums ${today ? 'text-accent' : 'text-text-secondary'} ${!posting ? 'opacity-40' : ''}`}>
                {day}
              </span>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-h-0">
              {postsForDay.map(post => (
                <DraggableCalendarPost
                  key={post.id}
                  post={post}
                  onClick={e => handlePostCardClick(e, post)}
                  className={`group/chip flex items-center gap-1.5 max-w-full border rounded-full px-2.5 py-1 transition-ui cursor-grab active:cursor-grabbing ${
                    isPublished(post)
                      ? 'bg-success/12 border-success/35 hover:border-success/60'
                      : 'bg-bg-secondary hover:bg-bg-tertiary border-border-brand/40 hover:border-accent/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPublished(post) ? 'bg-success' : getPillarDotColor(post.pillar)}`} />
                  <span className={`text-[10px] font-medium leading-tight line-clamp-1 flex-1 min-w-0 ${isPublished(post) ? 'text-success' : 'text-text-primary'}`}>
                    {postTitle(post)}
                  </span>
                  {isPublished(post) && <span className="text-[8px] font-bold uppercase text-success">Live</span>}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleDeletePost(post.id); }}
                    className="shrink-0 p-0.5 rounded-full text-text-muted hover:text-danger opacity-0 group-hover/chip:opacity-100 transition-ui cursor-pointer"
                    title="Delete post"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </DraggableCalendarPost>
              ))}
            </div>

            {postsForDay.length === 0 && posting && (
              <span className="text-[10px] text-accent/50 absolute bottom-2 right-2 font-medium opacity-0 group-hover/cell:opacity-100 transition-opacity">
                Available
              </span>
            )}
          </DateDropZone>
        );
      })}
    </div>
  );

  const renderTableView = () => {
    const daysWithPosts = calendarDays
      .map(day => ({ day, posts: getPostsForDate(day), date: formatDateStr(currentYear, currentMonth, day) }))
      .filter(d => d.posts.length > 0);

    if (daysWithPosts.length === 0) {
      return (
        <div className="h-48 border border-dashed border-border-brand/40 rounded-2xl flex flex-col items-center justify-center text-center p-6 select-none">
          <span className="text-sm font-medium text-text-secondary">No scheduled posts this month</span>
          <p className="text-xs text-text-muted mt-1">Schedule posts by clicking a day on the calendar view.</p>
        </div>
      );
    }

    return (
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b border-border-brand/50 text-xs font-medium text-text-secondary">
                <th className="px-6 py-3.5 font-normal">Date</th>
                <th className="px-6 py-3.5 font-normal">Day</th>
                <th className="px-6 py-3.5 font-normal">Topic</th>
                <th className="px-6 py-3.5 font-normal">Format</th>
                <th className="px-6 py-3.5 font-normal">Pillar</th>
                <th className="px-6 py-3.5 font-normal">Angle</th>
                <th className="px-6 py-3.5 font-normal">CTA</th>
                <th className="px-6 py-3.5 font-normal">Status</th>
                <th className="px-6 py-3.5 font-normal w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-brand/40 text-sm text-text-primary">
              {daysWithPosts.map(({ posts: p, date }) => (
                <Fragment key={date}>
                  <TableDateDropRow key={`${date}-drop`} date={date}>
                    <td colSpan={9} className="px-6 py-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </td>
                  </TableDateDropRow>
                  {p.map(post => (
                    <tr
                      key={post.id}
                      className="group hover:bg-bg-tertiary/40 transition-ui cursor-pointer"
                      onClick={() => setDetailModal(post)}
                    >
                    <td className="px-6 py-3.5 font-semibold tabular-nums">{new Date(date + 'T00:00:00').getDate()}</td>
                    <td className="px-6 py-3.5 text-text-secondary">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </td>
                    <td className="px-6 py-3.5 max-w-[200px]">
                      <DraggableCalendarPost post={post} className="inline-block max-w-full cursor-grab active:cursor-grabbing">
                        <span className="line-clamp-1 font-medium">{postTitle(post)}</span>
                      </DraggableCalendarPost>
                    </td>
                    <td className="px-6 py-3.5">
                      {post.format ? <PropertyPill label={post.format} /> : <span className="text-text-muted text-xs">—</span>}
                    </td>
                    <td className="px-6 py-3.5"><PillarBadge pillar={post.pillar} /></td>
                    <td className="px-6 py-3.5 max-w-[150px]">
                      <span className="line-clamp-1 text-text-secondary">{post.angle || '—'}</span>
                    </td>
                    <td className="px-6 py-3.5 max-w-[150px]">
                      <span className="line-clamp-1 text-text-secondary">{post.cta || '—'}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <PropertyPill label={post.status} dot />
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleDeletePost(post.id); }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-bg-elevated opacity-0 group-hover:opacity-100 transition-ui cursor-pointer"
                        title="Delete post"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCardView = () => {
    const scheduledPosts = posts.filter(p => {
      if (!p.calendar_date) return false;
      const d = new Date(p.calendar_date + 'T00:00:00');
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).sort(sortByCalendarDate);

    if (scheduledPosts.length === 0) {
      return (
        <div className="h-48 border border-dashed border-border-brand/40 rounded-2xl flex flex-col items-center justify-center text-center p-6 select-none">
          <span className="text-sm font-medium text-text-secondary">No scheduled posts this month</span>
          <p className="text-xs text-text-muted mt-1">Schedule posts to see them in card view.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {scheduledPosts.map((post, i) => (
          <DraggableCalendarPost
            key={post.id}
            post={post}
            onClick={() => setDetailModal(post)}
            className={`group min-w-0 glass-card overflow-hidden cursor-grab active:cursor-grabbing transition-ui hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5 animate-slideUp ${STAGGER_DELAYS[i % STAGGER_DELAYS.length]}`}
          >
            <div className={`h-1.5 bg-gradient-to-r ${pillarGradientFrom(post.pillar)} to-accent`} />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <PropertyPill label={post.status} dot />
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleDeletePost(post.id); }}
                  className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-bg-tertiary opacity-0 group-hover:opacity-100 transition-ui cursor-pointer"
                  title="Delete post"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <p className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 min-h-[2.5em]">
                {postTitle(post)}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {post.format && <PropertyPill label={post.format} />}
                <PillarBadge pillar={post.pillar} />
              </div>

              {(post.angle || post.cta) && (
                <div className="space-y-0.5">
                  {post.angle && (
                    <p className="text-xs text-text-secondary line-clamp-1">
                      <span className="text-text-muted">Angle: </span>{post.angle}
                    </p>
                  )}
                  {post.cta && (
                    <p className="text-xs text-text-secondary line-clamp-1">
                      <span className="text-text-muted">CTA: </span>{post.cta}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border-brand/30">
                <span className="text-xs font-medium text-text-secondary tabular-nums">
                  {new Date(post.calendar_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <svg className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-ui" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </DraggableCalendarPost>
        ))}
      </div>
    );
  };

  const renderUnscheduledIdeas = () => {
    if (unscheduledPosts.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Unscheduled ideas</h3>
          <span className="text-xs font-medium text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-brand/40">
            {unscheduledPosts.length}
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {unscheduledPosts.map(post => (
            <DraggableCalendarPost
              key={post.id}
              post={post}
              onClick={() => onNavigateToPost && onNavigateToPost(post)}
              className="shrink-0 w-56 glass-card p-4 cursor-grab active:cursor-grabbing hover:border-accent/40 transition-ui space-y-2 select-none group/idea"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-sm font-semibold text-text-primary line-clamp-2 flex-1">
                  {post.raw_idea || post.hook_idea || 'Untitled'}
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleDeletePost(post.id); }}
                  className="shrink-0 p-1 rounded text-text-muted hover:text-danger hover:bg-bg-tertiary opacity-0 group-hover/idea:opacity-100 transition-ui cursor-pointer"
                  title="Delete post"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <PropertyPill label={post.draft ? 'Draft' : 'Seed'} />
                <span className="text-xs text-text-muted">
                  {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-text-muted italic">Drag to a calendar day to schedule</p>
            </DraggableCalendarPost>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-text-secondary font-medium">Loading calendar…</span>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-bg-primary animate-fadeIn scrollbar-thin">
      {notification && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl animate-fadeIn select-none ${
          notification.type === 'error' ? 'bg-danger/10 border border-danger/25' : 'bg-success/10 border border-success/25'
        }`}>
          <svg className={`w-5 h-5 shrink-0 ${notification.type === 'error' ? 'text-danger' : 'text-success'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className={`text-sm font-medium ${notification.type === 'error' ? 'text-danger' : 'text-success'}`}>
            {notification.count} {notification.message}
          </p>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-auto p-1 rounded text-success/60 hover:text-success transition-ui cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <PageHeader
        title="Content Calendar"
        subtitle="Plan your Mon / Wed / Fri posting schedule"
        actions={
          <>
            {posts.length > 0 && (
              <Button variant="danger" size="md" onClick={handleDeleteAll}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete all
              </Button>
            )}
            <label className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-ui cursor-pointer bg-bg-tertiary text-text-primary border border-border-brand hover:border-accent/40 hover:bg-bg-elevated px-4 py-2.5 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
            <ViewToggle options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
          </>
        }
      />

      {monthlyInsights && (
        <div className="glass-card px-5 py-3 border border-border-brand/40 flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="text-xs font-semibold text-text-secondary">
            {MONTHS[currentMonth]} insights
          </span>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {monthlyInsights.bestFormat && (
              <span className="text-text-primary">
                Top format: <span className="text-accent font-medium">{monthlyInsights.bestFormat}</span>
              </span>
            )}
            {monthlyInsights.bestPillar && (
              <span className="text-text-primary">
                Top pillar: <span className="text-accent font-medium">{monthlyInsights.bestPillar}</span>
              </span>
            )}
            <span className="text-text-secondary">
              Avg impressions: <span className="text-text-primary font-medium tabular-nums">{monthlyInsights.avgImpressions.toLocaleString()}</span>
            </span>
            <span className="text-text-secondary">
              Posts: <span className="text-text-primary font-medium tabular-nums">{monthlyInsights.totalPosts}</span>
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between select-none">
        <Button variant="secondary" size="sm" onClick={prevMonth}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </Button>
        <h3 className="text-lg font-bold text-text-primary tracking-tight">
          {MONTHS[currentMonth]} {currentYear}
        </h3>
        <Button variant="secondary" size="sm" onClick={nextMonth}>
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>

      {viewMode === 'calendar' && renderCalendarView()}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'card' && renderCardView()}

      {renderUnscheduledIdeas()}

      {editModal && (
        <CalendarEditModal
          date={editModal.date}
          entry={editModal.entry}
          onClose={() => setEditModal(null)}
          onSave={handleSaveCalendarEntry}
        />
      )}

      {detailModal && (
        <PostDetailModal
          post={detailModal}
          onClose={() => setDetailModal(null)}
          onDelete={() => handleDeletePost(detailModal.id)}
          onEdit={() => handleEditFromDetail(detailModal)}
        />
      )}
      </div>

      <DragOverlay>
        {activeDragPost ? (
          <div className="w-64 rounded-xl border border-accent/40 bg-bg-tertiary p-4 shadow-2xl shadow-accent/15">
            <p className="line-clamp-2 text-sm font-semibold text-text-primary">{postTitle(activeDragPost)}</p>
            <p className="mt-2 text-xs font-medium text-accent">Drop on a date</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
