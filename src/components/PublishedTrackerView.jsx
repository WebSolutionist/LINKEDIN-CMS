import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const PILLAR_COLORS = {
  'Website Reality': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  'Strategic Reframe': 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  'Web Solution Thinking': 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
  'Personal Reflection': 'bg-pink-500/10 text-pink-400 border border-pink-500/25',
  'Soft Positioning': 'bg-violet-500/10 text-violet-400 border border-violet-500/25',
};

const COMMENT_QUALITY_OPTIONS = [
  { value: '', label: 'Not rated' },
  { value: 'surface', label: 'Surface (Likes only)' },
  { value: 'basic', label: 'Basic (Shallow discussion)' },
  { value: 'engaged', label: 'Engaged (Good discussion)' },
  { value: 'deep', label: 'Deep (Meaningful conversation)' },
];

const ICP_OPTIONS = [
  { value: '', label: 'Not tagged' },
  { value: 'founders', label: 'Founders' },
  { value: 'students', label: 'Students' },
  { value: 'smbs', label: 'SMBs' },
  { value: 'service_providers', label: 'Service Providers' },
  { value: 'innovators_builders', label: 'Innovators/Builders' },
  { value: 'random', label: 'Random' },
];

export default function PublishedTrackerView() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editingPost, setEditingPost] = useState(null);
  const [impressions, setImpressions] = useState(0);
  const [comments, setComments] = useState(0);
  const [profileViews, setProfileViews] = useState(0);
  const [dms, setDms] = useState(0);
  const [commentQuality, setCommentQuality] = useState('');
  const [icpAudience, setIcpAudience] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Quick Log modal
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogText, setQuickLogText] = useState('');
  const [quickLogFormat, setQuickLogFormat] = useState('');
  const [quickLogPillar, setQuickLogPillar] = useState('');
  const [quickLogDate, setQuickLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickLogLoading, setQuickLogLoading] = useState(false);

  // Filters
  const [filterText, setFilterText] = useState('');
  const [filterIcp, setFilterIcp] = useState('');

  useEffect(() => {
    fetchPublishedPosts();
  }, []);

  const fetchPublishedPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching published posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setImpressions(post.impressions || 0);
    setComments(post.comments || 0);
    setProfileViews(post.profile_views || 0);
    setDms(post.dms || 0);
    setCommentQuality(post.comment_quality || '');
    setIcpAudience(post.icp_audience || '');
  };

  const handleSaveStats = async () => {
    if (!editingPost) return;
    setSaveLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .update({
          impressions: parseInt(impressions) || 0,
          comments: parseInt(comments) || 0,
          profile_views: parseInt(profileViews) || 0,
          dms: parseInt(dms) || 0,
          comment_quality: commentQuality || null,
          icp_audience: icpAudience || null,
        })
        .eq('id', editingPost.id)
        .select()
        .single();

      if (error) throw error;

      setPosts(posts.map(p => p.id === data.id ? data : p));
      setEditingPost(null);
    } catch (err) {
      console.error('Error saving stats:', err);
      alert('Failed to update stats.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleQuickLog = async (e) => {
    e.preventDefault();
    if (!quickLogText.trim()) return;
    setQuickLogLoading(true);

    try {
      const currentDate = new Date();
      const oneJan = new Date(currentDate.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((currentDate - oneJan) / (24 * 60 * 60 * 1000));
      const currentWeekNumber = Math.ceil((currentDate.getDay() + 1 + numberOfDays) / 7);

      const { data, error } = await supabase
        .from('posts')
        .insert({
          raw_idea: quickLogText.trim(),
          status: 'published',
          format: quickLogFormat || null,
          pillar: quickLogPillar || null,
          draft: quickLogText.trim(),
          published_at: new Date(quickLogDate).toISOString(),
          week_number: currentWeekNumber,
          impressions: 0,
          comments: 0,
          profile_views: 0,
          dms: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setPosts([data, ...posts]);
      setShowQuickLog(false);
      resetQuickLog();
    } catch (err) {
      console.error('Error logging quick post:', err);
      alert('Failed to log post.');
    } finally {
      setQuickLogLoading(false);
    }
  };

  const resetQuickLog = () => {
    setQuickLogText('');
    setQuickLogFormat('');
    setQuickLogPillar('');
    setQuickLogDate(new Date().toISOString().split('T')[0]);
  };

  const getPostTitle = (draft) => {
    if (!draft) return 'Untitled Post';
    const lines = draft.split('\n');
    const firstLine = lines.find(line => line.trim().length > 0);
    if (!firstLine) return 'Untitled Post';
    return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
  };

  const getQualityLabel = (val) => {
    const opt = COMMENT_QUALITY_OPTIONS.find(o => o.value === val);
    return opt ? opt.label : 'Not rated';
  };

  const getIcpLabel = (val) => {
    const opt = ICP_OPTIONS.find(o => o.value === val);
    return opt ? opt.label : 'Not tagged';
  };

  // Filter logic
  const filteredPosts = posts.filter(p => {
    if (filterText && !getPostTitle(p.draft).toLowerCase().includes(filterText.toLowerCase())) return false;
    if (filterIcp && p.icp_audience !== filterIcp) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[--bg-primary]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[--accent-primary]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-[--text-secondary] font-semibold tracking-wider uppercase">
            Fetching archives...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 animate-fadeIn scrollbar-thin">
      <div className="flex items-center justify-between border-b border-[--border-color]/50 pb-5 select-none">
        <div>
          <h2 className="text-2xl font-black tracking-wide text-white uppercase">
            Published Tracker
          </h2>
          <p className="text-xs text-[--text-secondary]">
            Audit your live performance history, log engagement quality, and tag audience signals
          </p>
        </div>

        <button
          onClick={() => setShowQuickLog(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[--accent-primary]/20 active:scale-95 transition-all duration-300 glow-accent cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Quick Log
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-secondary]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search posts..."
            className="w-full bg-[--bg-secondary] text-xs text-white border border-[--border-color] rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[--accent-primary] transition-all placeholder:text-[--text-secondary]/50"
          />
        </div>
        <select
          value={filterIcp}
          onChange={(e) => setFilterIcp(e.target.value)}
          className="bg-[--bg-secondary] text-xs text-white border border-[--border-color] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[--accent-primary] transition-all cursor-pointer"
        >
          <option value="">All ICP</option>
          {ICP_OPTIONS.filter(o => o.value).map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-[10px] text-[--text-secondary] font-semibold">
          {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredPosts.length > 0 ? (
        <div className="glass-card border border-[--border-color] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="border-b border-[--border-color] bg-[--bg-secondary]/80 text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                  <th className="px-4 py-4">Post Title</th>
                  <th className="px-4 py-4">Format</th>
                  <th className="px-4 py-4">Pillar</th>
                  <th className="px-4 py-4 text-center">Impressions</th>
                  <th className="px-4 py-4 text-center">Comments</th>
                  <th className="px-4 py-4 text-center">Profile Views</th>
                  <th className="px-4 py-4 text-center">DMs</th>
                  <th className="px-4 py-4 text-center">Comment Quality</th>
                  <th className="px-4 py-4 text-center">ICP Audience</th>
                  <th className="px-4 py-4">Published</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border-color]/40 text-xs font-medium text-[--text-primary]">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-[--bg-tertiary]/35 transition-colors group">
                    <td className="px-4 py-4.5 max-w-[220px]">
                      <p className="font-bold text-white line-clamp-1 group-hover:text-[--accent-primary] transition-colors leading-tight">
                        {getPostTitle(post.draft)}
                      </p>
                      <p className="text-[9px] text-[--text-secondary] mt-0.5 line-clamp-1 max-w-[200px] italic">
                        {post.raw_idea}
                      </p>
                    </td>

                    <td className="px-4 py-4.5 whitespace-nowrap">
                      {post.format ? (
                        <span className="inline-flex items-center rounded-md bg-[--bg-primary] border border-[--border-color] px-2.5 py-0.5 text-[10px] font-semibold text-[--text-secondary] whitespace-nowrap shrink-0">
                          {post.format}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[--text-secondary]/50 font-semibold uppercase">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4.5 whitespace-nowrap">
                      {post.pillar ? (
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                          PILLAR_COLORS[post.pillar] || 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {post.pillar}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[--text-secondary]/50 font-semibold uppercase">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4.5 text-center font-bold text-[--accent-primary]">
                      {(post.impressions || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-4.5 text-center font-bold text-white">
                      {(post.comments || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-4.5 text-center font-bold text-[--text-secondary]">
                      {(post.profile_views || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-4.5 text-center font-bold text-amber-400">
                      {(post.dms || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-4.5 text-center">
                      {post.comment_quality ? (
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          post.comment_quality === 'deep' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                          post.comment_quality === 'engaged' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' :
                          post.comment_quality === 'basic' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                          'bg-gray-500/10 text-gray-400 border border-gray-500/25'
                        }`}>
                          {getQualityLabel(post.comment_quality)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[--text-secondary]/50 font-semibold">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4.5 text-center">
                      {post.icp_audience ? (
                        <span className="inline-flex items-center rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/25 px-2 py-0.5 text-[10px] font-semibold">
                          {getIcpLabel(post.icp_audience)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[--text-secondary]/50 font-semibold">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4.5 text-[10px] text-[--text-secondary] font-semibold whitespace-nowrap">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    <td className="px-4 py-4.5 text-right">
                      <button
                        onClick={() => handleOpenEdit(post)}
                        className="p-2 bg-[--bg-primary] hover:bg-[--accent-glow] border border-[--border-color] hover:border-[--accent-primary]/60 text-[--text-secondary] hover:text-[--accent-primary] rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                        title="Edit Performance Stats"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[--border-color]/35 rounded-2xl select-none">
          <div className="p-4 rounded-full bg-[--bg-secondary] border border-[--border-color] mb-4">
            <svg className="w-8 h-8 text-[--accent-primary]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            No published posts tracked yet
          </h3>
          <p className="text-xs text-[--text-secondary] max-w-[280px] mt-1.5 leading-relaxed">
            Publish posts from the Writing Room or use Quick Log to capture spontaneous posts.
          </p>
        </div>
      )}

      {/* EDIT PERFORMANCE MODAL */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card flex flex-col w-full max-w-lg bg-[--bg-secondary] border border-[--border-color] rounded-2xl shadow-2xl overflow-hidden animate-scaleIn select-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-color]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Update Performance Metrics
                </h3>
                <p className="text-[10px] text-[--text-secondary] mt-0.5 line-clamp-1 max-w-[360px]">
                  Post: "{getPostTitle(editingPost.draft)}"
                </p>
              </div>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-lg text-[--text-secondary] hover:text-white hover:bg-[--bg-tertiary] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-6 space-y-4 border-b border-[--border-color]/35">
              {/* Row 1: Vanity Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Impressions</label>
                  <input type="number" min="0" value={impressions} onChange={(e) => setImpressions(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Comments</label>
                  <input type="number" min="0" value={comments} onChange={(e) => setComments(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Profile Views</label>
                  <input type="number" min="0" value={profileViews} onChange={(e) => setProfileViews(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all" />
                </div>
              </div>

              {/* Row 2: Decision Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">DMs Received</label>
                  <input type="number" min="0" value={dms} onChange={(e) => setDms(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Comment Quality</label>
                  <select value={commentQuality} onChange={(e) => setCommentQuality(e.target.value)}
                    className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all cursor-pointer">
                    {COMMENT_QUALITY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">ICP Audience</label>
                  <select value={icpAudience} onChange={(e) => setIcpAudience(e.target.value)}
                    className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all cursor-pointer">
                    {ICP_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex items-center justify-between bg-[--bg-primary]/15">
              <button onClick={() => setEditingPost(null)}
                className="px-4 py-2 text-xs font-bold text-[--text-secondary] hover:text-white uppercase tracking-wider transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleSaveStats} disabled={saveLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer glow-accent">
                {saveLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>Save Metrics</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK LOG MODAL */}
      {showQuickLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card flex flex-col w-full max-w-lg bg-[--bg-secondary] border border-[--border-color] rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-color]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Quick Log Spontaneous Post
                </h3>
                <p className="text-[10px] text-[--text-secondary]">
                  Log a post you published outside the CMS
                </p>
              </div>
              <button onClick={() => { setShowQuickLog(false); resetQuickLog(); }}
                className="p-1.5 rounded-lg text-[--text-secondary] hover:text-white hover:bg-[--bg-tertiary] transition-all cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleQuickLog} className="p-6 space-y-4 border-b border-[--border-color]/35">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                  Post Title or Full Text <span className="text-[--accent-primary]">*</span>
                </label>
                <textarea
                  value={quickLogText}
                  onChange={(e) => setQuickLogText(e.target.value)}
                  placeholder="Paste the post title or full content..."
                  rows={3}
                  className="w-full bg-[--bg-primary] text-xs text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all resize-none placeholder:text-[--text-secondary]/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Format (optional)</label>
                  <select value={quickLogFormat} onChange={(e) => setQuickLogFormat(e.target.value)}
                    className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all cursor-pointer">
                    <option value="">—</option>
                    <option value="Story Post">Story Post</option>
                    <option value="Educational Post">Educational Post</option>
                    <option value="Case Study">Case Study</option>
                    <option value="Opinion Post">Opinion Post</option>
                    <option value="Contrarian Post">Contrarian Post</option>
                    <option value="Offer Post">Offer Post</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Pillar (optional)</label>
                  <select value={quickLogPillar} onChange={(e) => setQuickLogPillar(e.target.value)}
                    className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all cursor-pointer">
                    <option value="">—</option>
                    <option value="Website Reality">Website Reality</option>
                    <option value="Strategic Reframe">Strategic Reframe</option>
                    <option value="Web Solution Thinking">Web Solution Thinking</option>
                    <option value="Personal Reflection">Personal Reflection</option>
                    <option value="Soft Positioning">Soft Positioning</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Publish Date</label>
                <input
                  type="date"
                  value={quickLogDate}
                  onChange={(e) => setQuickLogDate(e.target.value)}
                  className="w-full bg-[--bg-primary] text-xs font-semibold text-white border border-[--border-color] rounded-xl p-3 focus:outline-none focus:border-[--accent-primary] transition-all [color-scheme:dark]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => { setShowQuickLog(false); resetQuickLog(); }}
                  className="px-4 py-2 text-xs font-bold text-[--text-secondary] hover:text-white uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={quickLogLoading || !quickLogText.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer glow-accent disabled:opacity-40 disabled:pointer-events-none">
                  {quickLogLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Logging...
                    </>
                  ) : (
                    <>Log Post</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
