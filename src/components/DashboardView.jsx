import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  generateWeeklyReview,
  generatePostRecommendations,
  generateHealthScoreNote,
} from '../utils/gemini';

const QUALITY_MAP = { surface: 1, basic: 2, engaged: 3, deep: 4 };
const QUALITY_LABELS = { surface: 'Surface', basic: 'Basic', engaged: 'Engaged', deep: 'Deep' };
const ICP_LABELS = {
  founders: 'Founders', students: 'Students', smbs: 'SMBs',
  service_providers: 'Service Providers', innovators_builders: 'Innovators/Builders', random: 'Random',
};

export default function DashboardView({ onWriteRecommendation }) {
  const [posts, setPosts] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeReview, setActiveReview] = useState(null);
  const [weeklyReviews, setWeeklyReviews] = useState([]);

  // Computed metrics
  const [formatPerf, setFormatPerf] = useState([]);
  const [pillarPerf, setPillarPerf] = useState([]);
  const [icpBreakdown, setIcpBreakdown] = useState([]);
  const [avgDms, setAvgDms] = useState(0);
  const [avgQuality, setAvgQuality] = useState(0);
  const [weekPosts, setWeekPosts] = useState([]);
  const [currentWeekNumber, setCurrentWeekNumber] = useState(0);
  const [healthNote, setHealthNote] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPosts(),
        fetchHealthScores(),
        fetchRecommendations(),
        fetchWeeklyReviews(),
      ]);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWeekInfo = () => {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);

    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekNumber, weekStart, weekEnd };
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) throw error;
    const allPosts = data || [];
    setPosts(allPosts);
    calculateMetrics(allPosts);
  };

  const fetchHealthScores = async () => {
    const { weekNumber } = getWeekInfo();
    const { data, error } = await supabase
      .from('health_scores')
      .select('*')
      .eq('week_number', weekNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setHealthScore(data[0]);
    }
  };

  const fetchRecommendations = async () => {
    const { weekNumber } = getWeekInfo();
    const { data, error } = await supabase
      .from('post_recommendations')
      .select('*')
      .eq('week_number', weekNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const recs = data[0].recommendations || [];
      setRecommendations(Array.isArray(recs) ? recs : []);
    }
  };

  const fetchWeeklyReviews = async () => {
    const { data, error } = await supabase
      .from('weekly_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setWeeklyReviews(data || []);
  };

  const calculateMetrics = (allPosts) => {
    if (!allPosts || allPosts.length === 0) return;

    // Get this week's posts
    const { weekNumber, weekStart, weekEnd } = getWeekInfo();
    setCurrentWeekNumber(weekNumber);

    const thisWeek = allPosts.filter(p => {
      const d = new Date(p.published_at || p.created_at);
      return d >= weekStart && d <= weekEnd;
    });
    setWeekPosts(thisWeek);

    // Format performance by profile visits (not impressions)
    const formatMap = {};
    allPosts.forEach(p => {
      if (p.format) {
        if (!formatMap[p.format]) formatMap[p.format] = { views: 0, dms: 0, qualitySum: 0, qualityCount: 0, count: 0 };
        formatMap[p.format].views += p.profile_views || 0;
        formatMap[p.format].dms += p.dms || 0;
        formatMap[p.format].count += 1;
        if (p.comment_quality && QUALITY_MAP[p.comment_quality]) {
          formatMap[p.format].qualitySum += QUALITY_MAP[p.comment_quality];
          formatMap[p.format].qualityCount += 1;
        }
      }
    });

    const formatList = Object.keys(formatMap).map(name => ({
      name,
      avgViews: Math.round(formatMap[name].views / formatMap[name].count),
      avgDms: Math.round((formatMap[name].dms / formatMap[name].count) * 10) / 10,
      avgQuality: formatMap[name].qualityCount > 0
        ? Math.round((formatMap[name].qualitySum / formatMap[name].qualityCount) * 10) / 10
        : 0,
      count: formatMap[name].count,
    }));

    setFormatPerf(formatList.sort((a, b) => b.avgViews - a.avgViews));

    // Pillar performance by profile visits
    const pillarMap = {};
    allPosts.forEach(p => {
      if (p.pillar) {
        if (!pillarMap[p.pillar]) pillarMap[p.pillar] = { views: 0, dms: 0, count: 0 };
        pillarMap[p.pillar].views += p.profile_views || 0;
        pillarMap[p.pillar].dms += p.dms || 0;
        pillarMap[p.pillar].count += 1;
      }
    });

    const pillarList = Object.keys(pillarMap).map(name => ({
      name,
      avgViews: Math.round(pillarMap[name].views / pillarMap[name].count),
      avgDms: Math.round((pillarMap[name].dms / pillarMap[name].count) * 10) / 10,
      count: pillarMap[name].count,
    }));

    setPillarPerf(pillarList.sort((a, b) => b.avgViews - a.avgViews));

    // Avg DMs across all posts
    const postsWithDms = allPosts.filter(p => p.dms > 0);
    setAvgDms(postsWithDms.length > 0
      ? Math.round((allPosts.reduce((s, p) => s + (p.dms || 0), 0) / allPosts.length) * 10) / 10
      : 0);

    // Avg comment quality
    const qualityPosts = allPosts.filter(p => p.comment_quality && QUALITY_MAP[p.comment_quality]);
    setAvgQuality(qualityPosts.length > 0
      ? Math.round(qualityPosts.reduce((s, p) => s + QUALITY_MAP[p.comment_quality], 0) / qualityPosts.length * 10) / 10
      : 0);

    // ICP breakdown
    const icpMap = {};
    allPosts.forEach(p => {
      if (p.icp_audience) {
        if (!icpMap[p.icp_audience]) icpMap[p.icp_audience] = 0;
        icpMap[p.icp_audience] += 1;
      }
    });
    setIcpBreakdown(Object.keys(icpMap).map(key => ({
      label: ICP_LABELS[key] || key,
      value: icpMap[key],
    })));
  };

  const calculateAndSaveHealthScore = async () => {
    const { weekNumber, weekStart, weekEnd } = getWeekInfo();
    if (weekPosts.length === 0) return null;

    // Consistency: 3x/week target
    const consistencyScore = Math.min(Math.round((weekPosts.length / 3) * 100), 100);

    // Engagement: normalize DMs + quality + profile visits
    const avgWeekDms = weekPosts.reduce((s, p) => s + (p.dms || 0), 0) / Math.max(weekPosts.length, 1);
    const avgWeekViews = weekPosts.reduce((s, p) => s + (p.profile_views || 0), 0) / Math.max(weekPosts.length, 1);
    const avgWeekQuality = weekPosts.filter(p => p.comment_quality && QUALITY_MAP[p.comment_quality])
      .reduce((s, p) => s + QUALITY_MAP[p.comment_quality], 0) / Math.max(weekPosts.filter(p => p.comment_quality).length, 1);

    const dmsNormalized = Math.min((avgWeekDms / 5) * 100, 100);
    const viewsNormalized = Math.min((avgWeekViews / 500) * 100, 100);
    const qualityNormalized = avgWeekQuality ? (avgWeekQuality / 4) * 100 : 0;
    const engagementScore = Math.round((dmsNormalized * 0.4 + qualityNormalized * 0.35 + viewsNormalized * 0.25));

    // Variety: unique formats
    const uniqueFormats = new Set(weekPosts.filter(p => p.format).map(p => p.format));
    const varietyScore = Math.round((uniqueFormats.size / 6) * 100);

    // Pillar balance: unique pillars
    const uniquePillars = new Set(weekPosts.filter(p => p.pillar).map(p => p.pillar));
    const pillarBalanceScore = Math.round((uniquePillars.size / 5) * 100);

    const overallScore = Math.round(
      consistencyScore * 0.35 +
      engagementScore * 0.35 +
      varietyScore * 0.15 +
      pillarBalanceScore * 0.15
    );

    // Get LINK's note
    const weakAreas = [];
    if (consistencyScore < 70) weakAreas.push('Consistency');
    if (engagementScore < 50) weakAreas.push('Engagement');
    if (varietyScore < 40) weakAreas.push('Format Variety');
    if (pillarBalanceScore < 40) weakAreas.push('Pillar Balance');

    const linkNotes = await generateHealthScoreNote(
      { overall_score: overallScore, consistency_score: consistencyScore, engagement_score: engagementScore, variety_score: varietyScore, pillar_balance_score: pillarBalanceScore },
      weekPosts,
      weakAreas
    );
    setHealthNote(linkNotes);

    const scoreData = {
      week_number: weekNumber,
      week_start: weekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0],
      consistency_score: consistencyScore,
      engagement_score: engagementScore,
      variety_score: varietyScore,
      pillar_balance_score: pillarBalanceScore,
      overall_score: overallScore,
      link_notes: linkNotes,
    };

    const { data, error } = await supabase
      .from('health_scores')
      .insert(scoreData)
      .select()
      .single();

    if (!error && data) {
      setHealthScore(data);
    }

    return scoreData;
  };

  const handleRefreshRecommendations = async () => {
    if (refreshLoading || posts.length === 0) return;
    setRefreshLoading(true);

    try {
      const recs = await generatePostRecommendations(posts);
      if (recs.length > 0) {
        const { weekNumber } = getWeekInfo();
        await supabase.from('post_recommendations').insert({
          week_number: weekNumber,
          recommendations: recs,
        });
        setRecommendations(recs);
      }
    } catch (err) {
      console.error('Error generating recommendations:', err);
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleGenerateWeeklyReview = async () => {
    if (reviewLoading) return;
    setReviewLoading(true);

    try {
      const { weekNumber, weekStart, weekEnd } = getWeekInfo();
      const weeklyPosts = posts.filter(p => {
        const d = new Date(p.published_at || p.created_at);
        return d >= weekStart && d <= weekEnd;
      });

      if (weeklyPosts.length === 0) {
        alert('No posts published this week to review.');
        setReviewLoading(false);
        return;
      }

      const reviewText = await generateWeeklyReview(weeklyPosts, weekNumber);

      const { data, error } = await supabase
        .from('weekly_reviews')
        .insert({
          week_number: weekNumber,
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          ai_review: reviewText,
        })
        .select()
        .single();

      if (!error && data) {
        setWeeklyReviews([data, ...weeklyReviews]);
        setActiveReview(data);
      }
    } catch (err) {
      console.error('Error generating review:', err);
      alert('Failed to generate review.');
    } finally {
      setReviewLoading(false);
    }
  };

  // Also auto-calculate health score on data load if not exists
  useEffect(() => {
    if (!loading && !healthScore && weekPosts.length > 0) {
      calculateAndSaveHealthScore();
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[--bg-primary]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[--accent-primary]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-[--text-secondary] font-semibold tracking-wider uppercase">
            Loading Command Center...
          </span>
        </div>
      </div>
    );
  }

  const getHealthColor = (score) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getHealthBg = (score) => {
    if (score >= 75) return 'bg-emerald-500/10 border-emerald-500/25';
    if (score >= 50) return 'bg-amber-500/10 border-amber-500/25';
    return 'bg-red-500/10 border-red-500/25';
  };

  const getHealthBarColor = (score) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 animate-fadeIn scrollbar-thin">
      {/* ZONE 1: What's Working */}
      <div className="border-b border-[--border-color]/50 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-wide text-white uppercase flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              What's Working
            </h2>
            <p className="text-xs text-[--text-secondary]">
              Performance driven by profile visits, DMs, and comment depth — not vanity metrics
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefreshRecommendations}
              disabled={refreshLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[--bg-tertiary] border border-[--border-color] hover:border-[--accent-primary]/40 text-xs font-bold text-white uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              {refreshLoading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh Recommendations
            </button>

            <button
              onClick={handleGenerateWeeklyReview}
              disabled={reviewLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[--accent-primary]/20 active:scale-95 transition-all duration-300 glow-accent cursor-pointer disabled:opacity-40"
            >
              {reviewLoading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : null}
              Weekly Audit
            </button>
          </div>
        </div>
      </div>

      {/* Format & Pillar Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Formats */}
        <div className="glass-card p-6 border border-[--border-color] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[--border-color]/40">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Best Formats</h3>
            <span className="text-[10px] text-[--text-secondary] font-semibold uppercase">Avg Profile Visits</span>
          </div>
          {formatPerf.length > 0 ? (
            <div className="space-y-3">
              {formatPerf.slice(0, 4).map((f, i) => {
                const maxViews = formatPerf[0]?.avgViews || 1;
                const barWidth = Math.max(8, (f.avgViews / maxViews) * 100);
                return (
                  <div key={f.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[--text-primary] font-bold">{f.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[--accent-primary] font-bold">{f.avgViews}</span>
                        <span className="text-amber-400 text-[10px]">{f.avgDms} DMs</span>
                        {f.avgQuality > 0 && (
                          <span className="text-emerald-400 text-[10px]">Q:{f.avgQuality}</span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[--bg-primary] overflow-hidden border border-[--border-color]/30">
                      <div className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-gradient-to-r from-[--accent-secondary] to-[--accent-primary]' : 'bg-[--border-color]'}`}
                        style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center border border-dashed border-[--border-color]/30 rounded-xl text-[11px] text-[--text-secondary]">
              No format data yet — publish posts to see performance
            </div>
          )}
        </div>

        {/* Best Pillars */}
        <div className="glass-card p-6 border border-[--border-color] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[--border-color]/40">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Best Pillars</h3>
            <span className="text-[10px] text-[--text-secondary] font-semibold uppercase">Avg Profile Visits</span>
          </div>
          {pillarPerf.length > 0 ? (
            <div className="space-y-3">
              {pillarPerf.slice(0, 4).map((p, i) => {
                const maxViews = pillarPerf[0]?.avgViews || 1;
                const barWidth = Math.max(8, (p.avgViews / maxViews) * 100);
                return (
                  <div key={p.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[--text-primary] font-bold">{p.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[--accent-primary] font-bold">{p.avgViews}</span>
                        <span className="text-amber-400 text-[10px]">{p.avgDms} DMs</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[--bg-primary] overflow-hidden border border-[--border-color]/30">
                      <div className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-gradient-to-r from-[--accent-secondary] to-[--accent-primary]' : 'bg-[--border-color]'}`}
                        style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center border border-dashed border-[--border-color]/30 rounded-xl text-[11px] text-[--text-secondary]">
              No pillar data yet — tag pillars to see performance
            </div>
          )}
        </div>
      </div>

      {/* Engagement Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card p-5 flex flex-col gap-1 border border-[--border-color] group hover:border-[--accent-primary]/40 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Avg DMs per Post</span>
          <span className="text-3xl font-black text-white group-hover:text-amber-400 transition-colors">
            {avgDms}
          </span>
          <span className="text-[9px] text-[--text-secondary]">Direct messages per post avg</span>
        </div>
        <div className="glass-card p-5 flex flex-col gap-1 border border-[--border-color] group hover:border-[--accent-primary]/40 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Avg Comment Quality</span>
          <span className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">
            {avgQuality || '—'}
          </span>
          <span className="text-[9px] text-[--text-secondary]">1-4 scale (Surface to Deep)</span>
        </div>
        <div className="glass-card p-5 flex flex-col gap-1 border border-[--border-color] group hover:border-[--accent-primary]/40 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">ICP Signal</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-white group-hover:text-[--accent-primary] transition-colors">
              {icpBreakdown.length > 0
                ? icpBreakdown.sort((a, b) => b.value - a.value).slice(0, 2).map(i => i.label).join(', ')
                : 'No data'}
            </span>
          </div>
          <span className="text-[9px] text-[--text-secondary]">Top audience segments</span>
        </div>
      </div>

      {/* ZONE 2: Content Health Score */}
      <div className="border-t border-[--border-color]/40 pt-8">
        <h2 className="text-2xl font-black tracking-wide text-white uppercase mb-6">
          Content Health Score
        </h2>

        {healthScore ? (
          <div className={`glass-card p-8 border ${getHealthBg(healthScore.overall_score)} space-y-6`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                  Week {healthScore.week_number} — {healthScore.week_start} to {healthScore.week_end}
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className={`text-6xl font-black ${getHealthColor(healthScore.overall_score)}`}>
                    {healthScore.overall_score}
                  </span>
                  <span className="text-lg font-bold text-[--text-secondary]">/ 100</span>
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${getHealthBg(healthScore.overall_score)}`}>
                    {healthScore.overall_score >= 75 ? 'Strong' : healthScore.overall_score >= 50 ? 'Developing' : 'Needs Attention'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Consistency', score: healthScore.consistency_score, desc: `${weekPosts.length}/3 posts` },
                { label: 'Engagement Quality', score: healthScore.engagement_score, desc: 'DMs + Comment Depth' },
                { label: 'Format Variety', score: healthScore.variety_score, desc: 'Unique formats used' },
                { label: 'Pillar Balance', score: healthScore.pillar_balance_score, desc: 'Unique pillars covered' },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[--text-primary]">{item.label}</span>
                    <span className={`font-black ${getHealthColor(item.score)}`}>{item.score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[--bg-primary] overflow-hidden border border-[--border-color]/30">
                    <div className={`h-full rounded-full transition-all duration-1000 ${getHealthBarColor(item.score)}`}
                      style={{ width: `${Math.max(4, item.score)}%` }} />
                  </div>
                  <span className="text-[9px] text-[--text-secondary]">{item.desc}</span>
                </div>
              ))}
            </div>

            {healthNote && (
              <div className="p-4 bg-[--bg-primary]/40 border border-[--border-color]/30 rounded-xl">
                <p className="text-xs text-[--text-primary] leading-relaxed italic">
                  "{healthNote}"
                </p>
                <span className="text-[9px] text-[--text-secondary] mt-2 block font-bold uppercase tracking-wider">
                  — LINK Assessment
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-8 border border-dashed border-[--border-color]/50 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[--text-secondary] mb-1">
              No health score yet
            </span>
            <p className="text-[10px] text-[--text-secondary]/60 max-w-[300px]">
              Publish and track at least one post this week, then run a Weekly Audit to generate your content health score.
            </p>
          </div>
        )}
      </div>

      {/* ZONE 3: Your Next 3 Posts */}
      <div className="border-t border-[--border-color]/40 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black tracking-wide text-white uppercase">
            Your Next 3 Posts
          </h2>
          <span className="text-[10px] text-[--text-secondary] font-semibold">
            Powered by your actual performance data
          </span>
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map((rec, idx) => (
              <div key={idx} className={`glass-card p-6 border ${idx === 0 ? 'border-[--accent-primary]/40' : 'border-[--border-color]'} space-y-4 relative group hover:border-[--accent-primary]/40 transition-all`}>
                {idx === 0 && (
                  <span className="absolute -top-2.5 right-4 text-[9px] font-black uppercase tracking-widest text-[--accent-primary] bg-[--bg-secondary] px-2 py-0.5 rounded-full border border-[--accent-primary]/40">
                    Top Pick
                  </span>
                )}

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                    Recommendation {idx + 1}
                  </span>
                  <p className="text-sm font-bold text-white leading-snug">
                    {rec.topic}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-[9px] font-bold text-[--accent-primary] bg-[--accent-primary]/10 border border-[--accent-primary]/25 px-2 py-0.5 rounded-full">
                    {rec.format}
                  </span>
                  <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-full">
                    {rec.pillar}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    rec.confidence === 'high' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25' :
                    rec.confidence === 'medium' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25' :
                    'text-gray-400 bg-gray-500/10 border border-gray-500/25'
                  }`}>
                    {rec.confidence} confidence
                  </span>
                </div>

                <p className="text-[11px] text-[--text-secondary] leading-relaxed">
                  {rec.reasoning}
                </p>

                <button
                  onClick={() => onWriteRecommendation && onWriteRecommendation(rec)}
                  className="w-full py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all hover:opacity-95 cursor-pointer glow-accent"
                >
                  Write This Post
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 border border-dashed border-[--border-color]/50 flex flex-col items-center justify-center text-center space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[--text-secondary]">
              No recommendations yet
            </span>
            <p className="text-[10px] text-[--text-secondary]/60 max-w-[350px]">
              Refresh recommendations above to generate data-backed post ideas based on your performance history. The AI needs at least a few published posts to build from.
            </p>
            <button
              onClick={handleRefreshRecommendations}
              disabled={refreshLoading || posts.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              {refreshLoading ? 'Generating...' : 'Generate Recommendations'}
            </button>
          </div>
        )}
      </div>

      {/* Weekly Audit History Sidebar (collapsible at bottom) */}
      {weeklyReviews.length > 0 && (
        <div className="border-t border-[--border-color]/40 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Strategy Audit History
            </h3>
            <button
              onClick={() => setActiveReview(weeklyReviews[0])}
              className="text-[10px] font-bold text-[--accent-primary] uppercase tracking-wider hover:underline cursor-pointer"
            >
              View Latest
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
            {weeklyReviews.slice(0, 5).map(rev => (
              <button
                key={rev.id}
                onClick={() => setActiveReview(rev)}
                className="shrink-0 w-56 p-4 rounded-xl border border-[--border-color]/60 bg-[--bg-primary]/30 hover:bg-[--bg-tertiary]/35 hover:border-[--accent-primary]/40 transition-all text-left cursor-pointer"
              >
                <span className="text-xs font-bold text-white">Audit Week #{rev.week_number}</span>
                <p className="text-[9px] text-[--text-secondary] mt-0.5">
                  {new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-[10px] text-[--text-secondary] mt-2 line-clamp-2">{rev.ai_review}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Review Content Modal */}
      {activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card flex flex-col w-full max-w-xl max-h-[85vh] bg-[--bg-secondary] border border-[--border-color] rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-color]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Strategy Audit: Week #{activeReview.week_number}
                </h3>
                <p className="text-[10px] text-[--text-secondary] mt-0.5">
                  {activeReview.week_start} to {activeReview.week_end}
                </p>
              </div>
              <button onClick={() => setActiveReview(null)}
                className="p-1.5 rounded-lg text-[--text-secondary] hover:text-white hover:bg-[--bg-tertiary] transition-all cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin text-xs text-[--text-primary] space-y-4 leading-relaxed whitespace-pre-line font-sans border-b border-[--border-color]/35">
              {activeReview.ai_review}
            </div>
            <div className="px-6 py-4 flex justify-end bg-[--bg-primary]/25">
              <button onClick={() => setActiveReview(null)}
                className="px-5 py-2 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer glow-accent">
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
