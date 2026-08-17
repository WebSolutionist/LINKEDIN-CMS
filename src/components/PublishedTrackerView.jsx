import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { getPostTitle } from '../utils/posts';
import { exportPostsToCSV } from '../utils/exportUtils';
import PageHeader from './ui/PageHeader';
import PropertyPill from './ui/PropertyPill';
import PillarBadge from './PillarBadge';
import EditStatsModal from './EditStatsModal';
import PostDetailModal from './PostDetailModal';

const PILLARS = [
  'Website Reality',
  'Strategic Reframe',
  'Web Solution Thinking',
  'Personal Reflection',
  'Soft Positioning',
];

const CQ_BADGES = {
  High: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Medium: 'bg-accent/15 text-accent border-accent/30',
  Low: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Ina: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export default function PublishedTrackerView({ onViewOnCalendar }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [previewPost, setPreviewPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPillar, setSelectedPillar] = useState('ALL');
  const [sortBy, setSortBy] = useState('published_at');
  const [viewMode, setViewMode] = useState('table');

  const handleSaveStats = async (postId, metrics) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update(metrics)
        .eq('id', postId)
        .select()
        .single();
      if (error) throw error;
      setPosts(prev => prev.map(p => (p.id === data.id ? data : p)));
    } catch (err) {
      console.error('Error saving stats:', err);
    }
  };

  const fetchPublishedPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, raw_idea, draft, hook_idea, pillar, format, impressions, comments, likes, profile_views, dms, cq, icp, published_at, created_at, calendar_date, status')
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

  useEffect(() => {
    fetchPublishedPosts();
  }, []);

  const stats = useMemo(() => {
    if (!posts.length) return { totalImpressions: 0, totalEngagement: 0, avgEngagementRate: '0.0', topPillar: 'N/A', count: 0 };
    
    let totalImp = 0;
    let totalEng = 0;
    const pillarCount = {};

    posts.forEach(p => {
      const imp = p.impressions || 0;
      const eng = (p.likes || 0) + (p.comments || 0) + (p.dms || 0);
      totalImp += imp;
      totalEng += eng;

      if (p.pillar) {
        pillarCount[p.pillar] = (pillarCount[p.pillar] || 0) + imp;
      }
    });

    let topPillar = 'N/A';
    let maxImp = -1;
    Object.entries(pillarCount).forEach(([pillar, imp]) => {
      if (imp > maxImp) {
        maxImp = imp;
        topPillar = pillar;
      }
    });

    const avgEngagementRate = totalImp > 0 ? ((totalEng / totalImp) * 100).toFixed(1) : '0.0';

    return {
      totalImpressions: totalImp,
      totalEngagement: totalEng,
      avgEngagementRate,
      topPillar,
      count: posts.length,
    };
  }, [posts]);

  const filteredAndSortedPosts = useMemo(() => {
    return posts
      .filter(post => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const title = getPostTitle(post).toLowerCase();
          const raw = (post.raw_idea || '').toLowerCase();
          if (!title.includes(q) && !raw.includes(q)) return false;
        }
        if (selectedPillar !== 'ALL' && post.pillar !== selectedPillar) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'impressions') return (b.impressions || 0) - (a.impressions || 0);
        if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
        if (sortBy === 'comments') return (b.comments || 0) - (a.comments || 0);
        if (sortBy === 'engagement') {
          const engA = (a.likes || 0) + (a.comments || 0) + (a.dms || 0);
          const engB = (b.likes || 0) + (b.comments || 0) + (b.dms || 0);
          return engB - engA;
        }
        return new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at);
      });
  }, [posts, searchQuery, selectedPillar, sortBy]);

  const maxImpressionsInSet = useMemo(() => {
    if (!posts.length) return 0;
    return Math.max(...posts.map(p => p.impressions || 0));
  }, [posts]);

  const handleExportCSV = () => {
    exportPostsToCSV(filteredAndSortedPosts, `linkedin_published_tracker_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 bg-bg-primary scrollbar-thin">
        <div className="pb-6 border-b border-border-brand/40 space-y-2">
          <div className="h-8 w-56 skeleton rounded-lg" />
          <div className="h-4 w-72 skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 glass-card p-4 flex flex-col justify-between">
              <div className="h-3 w-20 skeleton rounded" />
              <div className="h-7 w-28 skeleton rounded" />
            </div>
          ))}
        </div>
        <div className="h-11 max-w-md skeleton rounded-xl" />
        <div className="glass-card h-96 skeleton rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 bg-bg-primary animate-fadeIn scrollbar-thin">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Published Performance Tracker"
          subtitle="Audit live metrics, discover top-performing pillars, and export LinkedIn analytics reports."
        />
        
        {/* Export Button */}
        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent text-white text-xs font-bold shadow-lg hover:shadow-accent/20 transition-ui cursor-pointer shrink-0 self-start sm:self-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export LinkedIn Report
        </button>
      </div>

      {/* KPI Performance Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 relative overflow-hidden group hover:border-accent/40 transition-ui">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Impressions</p>
          <p className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
            {stats.totalImpressions.toLocaleString()}
          </p>
          <span className="text-[11px] text-accent font-medium mt-1 inline-block">
            {stats.count ? Math.round(stats.totalImpressions / stats.count).toLocaleString() : 0} avg / post
          </span>
        </div>

        <div className="glass-card p-4 relative overflow-hidden group hover:border-accent-purple/40 transition-ui">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Engagement</p>
          <p className="text-2xl font-bold text-accent-purple mt-1 tabular-nums">
            {stats.totalEngagement.toLocaleString()}
          </p>
          <span className="text-[11px] text-text-secondary mt-1 inline-block">
            Likes, Comments & DMs
          </span>
        </div>

        <div className="glass-card p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-ui">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Avg Engagement Rate</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
            {stats.avgEngagementRate}%
          </p>
          <span className="text-[11px] text-emerald-500 font-medium mt-1 inline-block">
            {stats.avgEngagementRate > 3 ? '⚡ Above Benchmark' : 'Balanced Interaction'}
          </span>
        </div>

        <div className="glass-card p-4 relative overflow-hidden group hover:border-amber-500/40 transition-ui">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Top Performing Pillar</p>
          <div className="mt-2">
            <PillarBadge pillar={stats.topPillar} size="lg" />
          </div>
          <span className="text-[11px] text-text-secondary mt-1 block">
            Highest Reach Driver
          </span>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-bg-secondary/40 p-3 rounded-2xl border border-border-brand/40">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center flex-1">
          <div className="relative min-w-[240px] max-w-sm">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-9 pr-4 py-2 bg-bg-primary/80 border border-border-brand/60 rounded-xl text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent transition-ui"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedPillar('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-ui cursor-pointer shrink-0 ${
                selectedPillar === 'ALL'
                  ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm'
                  : 'bg-bg-primary/50 text-text-secondary hover:text-text-primary border border-border-brand/40'
              }`}
            >
              All Pillars ({posts.length})
            </button>
            {PILLARS.map(p => {
              const pCount = posts.filter(item => item.pillar === p).length;
              if (pCount === 0) return null;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPillar(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-ui cursor-pointer shrink-0 ${
                    selectedPillar === p
                      ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm'
                      : 'bg-bg-primary/50 text-text-secondary hover:text-text-primary border border-border-brand/40'
                  }`}
                >
                  {p} ({pCount})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-bg-primary/80 border border-border-brand/60 rounded-xl px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-ui cursor-pointer"
            >
              <option value="published_at">Newest First</option>
              <option value="impressions">Highest Impressions</option>
              <option value="engagement">Most Engaged</option>
              <option value="likes">Most Likes</option>
              <option value="comments">Most Comments</option>
            </select>
          </div>

          <div className="flex items-center bg-bg-primary/80 p-1 rounded-xl border border-border-brand/60">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-ui cursor-pointer ${
                viewMode === 'table' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Table View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-ui cursor-pointer ${
                viewMode === 'grid' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Analytics Grid View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredAndSortedPosts.length > 0 ? (
        viewMode === 'table' ? (
          /* Table View: Dynamic, Spacious, Fully Uncompressed */
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1050px]">
                <thead>
                  <tr className="border-b border-border-brand/50 bg-bg-secondary/60 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Post Title</th>
                    <th className="px-4 py-4 font-medium">Format</th>
                    <th className="px-4 py-4 font-medium">Content Pillar</th>
                    <th className="px-3 py-4 font-medium text-center">Impressions</th>
                    <th className="px-3 py-4 font-medium text-center">Likes</th>
                    <th className="px-3 py-4 font-medium text-center">Comments</th>
                    <th className="px-3 py-4 font-medium text-center">Views</th>
                    <th className="px-3 py-4 font-medium text-center">DMs</th>
                    <th className="px-4 py-4 font-medium text-center">CQ</th>
                    <th className="px-4 py-4 font-medium">Target ICP</th>
                    <th className="px-4 py-4 font-medium">Published</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-brand/30 text-sm text-text-primary">
                  {filteredAndSortedPosts.map(post => {
                    const isTopImpression = maxImpressionsInSet > 0 && post.impressions === maxImpressionsInSet;
                    const cqKey = post.cq || 'Medium';
                    const cqBadgeClass = CQ_BADGES[cqKey] || CQ_BADGES.Medium;

                    return (
                      <tr
                        key={post.id}
                        className="group hover:bg-bg-tertiary/40 transition-ui cursor-pointer"
                        onClick={() => setPreviewPost(post)}
                      >
                        <td className="px-6 py-4 max-w-[280px]">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-text-primary group-hover:text-accent transition-ui leading-snug line-clamp-1">
                              {getPostTitle(post)}
                            </p>
                            {isTopImpression && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                🔥 TOP
                              </span>
                            )}
                          </div>
                          {post.raw_idea && (
                            <p className="text-xs text-text-secondary mt-1 line-clamp-1 italic">
                              {post.raw_idea}
                            </p>
                          )}
                        </td>

                        {/* Format Pill - Uncompressed */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {post.format ? (
                            <PropertyPill label={post.format} />
                          ) : (
                            <span className="text-xs text-text-secondary/60">--</span>
                          )}
                        </td>

                        {/* Pillar Badge - Uncompressed */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {post.pillar ? (
                            <PillarBadge pillar={post.pillar} size="sm" />
                          ) : (
                            <span className="text-xs text-text-secondary/60">--</span>
                          )}
                        </td>

                        <td className="px-3 py-4 text-center font-bold tabular-nums text-accent">
                          {(post.impressions || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-4 text-center font-medium tabular-nums text-text-primary">
                          {(post.likes || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-4 text-center font-medium tabular-nums text-text-primary">
                          {(post.comments || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-4 text-center font-medium tabular-nums text-text-secondary">
                          {(post.profile_views || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-4 text-center font-semibold tabular-nums text-accent-purple">
                          {(post.dms || 0).toLocaleString()}
                        </td>

                        {/* Comment Quality (CQ) */}
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${cqBadgeClass}`}>
                            {cqKey}
                          </span>
                        </td>

                        {/* Target ICP */}
                        <td className="px-4 py-4 max-w-[160px]">
                          <span className="text-xs text-text-secondary line-clamp-1">
                            {post.icp || '--'}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-xs text-text-secondary whitespace-nowrap tabular-nums">
                          {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {post.calendar_date && (
                              <button
                                type="button"
                                onClick={() => onViewOnCalendar?.(post.calendar_date)}
                                className="p-2 bg-bg-primary border border-border-brand text-text-secondary hover:border-accent/50 hover:text-accent rounded-xl transition-ui cursor-pointer inline-flex items-center justify-center"
                                title="View on Calendar"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingPost(post)}
                              className="p-2 bg-bg-primary border border-border-brand text-text-secondary hover:border-accent/50 hover:text-accent rounded-xl transition-ui cursor-pointer inline-flex items-center justify-center"
                              title="Edit Metrics & Quality"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPosts.map(post => {
              const engCount = (post.likes || 0) + (post.comments || 0) + (post.dms || 0);
              const cqKey = post.cq || 'Medium';
              const cqBadgeClass = CQ_BADGES[cqKey] || CQ_BADGES.Medium;

              return (
                <div
                  key={post.id}
                  onClick={() => setPreviewPost(post)}
                  className="glass-card p-5 flex flex-col justify-between hover:border-accent/50 transition-ui cursor-pointer group relative"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {post.pillar && <PillarBadge pillar={post.pillar} size="sm" />}
                        {post.format && <PropertyPill label={post.format} />}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cqBadgeClass}`}>
                        CQ: {cqKey}
                      </span>
                    </div>

                    <h3 className="font-bold text-text-primary text-base group-hover:text-accent transition-ui line-clamp-2 leading-snug">
                      {getPostTitle(post)}
                    </h3>
                    {(post.draft || post.raw_idea) && (
                      <p className="text-xs text-text-secondary mt-2 line-clamp-3 leading-relaxed">
                        {post.draft || post.raw_idea}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-border-brand/40 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[10px] text-text-secondary block uppercase font-medium">Reach</span>
                        <span className="text-sm font-bold text-accent tabular-nums">
                          {(post.impressions || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-secondary block uppercase font-medium">Engaged</span>
                        <span className="text-sm font-bold text-accent-purple tabular-nums">
                          {engCount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-secondary block uppercase font-medium">DMs</span>
                        <span className="text-sm font-semibold text-text-primary tabular-nums">
                          {(post.dms || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setEditingPost(post)}
                        className="p-2 bg-bg-primary/80 border border-border-brand hover:border-accent/60 text-text-secondary hover:text-accent rounded-xl transition-ui"
                        title="Edit Metrics"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="glass-card flex flex-col items-center justify-center text-center px-8 py-16 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-bg-secondary border border-border-brand flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-text-primary">
            {searchQuery || selectedPillar !== 'ALL' ? 'No posts match your filters' : 'No published posts tracked yet'}
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
            {searchQuery || selectedPillar !== 'ALL'
              ? 'Try resetting your search query or selecting "All Pillars".'
              : 'Publish posts from your Writing Room to track metrics and engagement trends.'}
          </p>
        </div>
      )}

      {editingPost && (
        <EditStatsModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleSaveStats}
        />
      )}

      {previewPost && (
        <PostDetailModal
          post={previewPost}
          onClose={() => setPreviewPost(null)}
        />
      )}
    </div>
  );
}
