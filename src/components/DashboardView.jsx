import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import {
  generateWeeklyReview,
  generatePostRecommendations,
  generateHealthScoreNote,
} from '../utils/gemini';
import { exportDashboardVisualPDF } from '../utils/pdfExporter';

const QUALITY_MAP = { surface: 1, basic: 2, engaged: 3, deep: 4 };
const QUALITY_LABELS = { surface: 'Surface', basic: 'Basic', engaged: 'Engaged', deep: 'Deep' };
const ICP_LABELS = {
  founders: 'Founders', students: 'Students', smbs: 'SMBs',
  service_providers: 'Service Providers', innovators_builders: 'Innovators/Builders', random: 'Random',
};
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DashboardView({ onWriteRecommendation }) {
  const [posts, setPosts] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeReview, setActiveReview] = useState(null);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('ALL'); // 'ALL' or 'YYYY-MM'

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
    calculateMetrics(allPosts, 'ALL');
  };

  // Available Month Periods for Filter
  const availablePeriods = useMemo(() => {
    const periodSet = new Set();
    posts.forEach(p => {
      const d = new Date(p.published_at || p.created_at);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        periodSet.add(key);
      }
    });
    return Array.from(periodSet).sort().reverse();
  }, [posts]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    calculateMetrics(posts, period);
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

  const calculateMetrics = (allPosts, period = selectedPeriod) => {
    if (!allPosts || allPosts.length === 0) return;

    // Filter posts by selected month or All Time
    const targetPosts = period === 'ALL'
      ? allPosts
      : allPosts.filter(p => {
          const d = new Date(p.published_at || p.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === period;
        });

    // Get this week's posts
    const { weekNumber, weekStart, weekEnd } = getWeekInfo();
    setCurrentWeekNumber(weekNumber);

    const thisWeek = targetPosts.filter(p => {
      const d = new Date(p.published_at || p.created_at);
      return d >= weekStart && d <= weekEnd;
    });
    setWeekPosts(thisWeek);

    // Format performance by profile visits (not impressions)
    const formatMap = {};
    targetPosts.forEach(p => {
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
    targetPosts.forEach(p => {
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

    // Avg DMs across target posts
    const postsWithDms = targetPosts.filter(p => p.dms > 0);
    setAvgDms(postsWithDms.length > 0
      ? Math.round((targetPosts.reduce((s, p) => s + (p.dms || 0), 0) / targetPosts.length) * 10) / 10
      : 0);

    // Avg comment quality
    const qualityPosts = targetPosts.filter(p => p.comment_quality && QUALITY_MAP[p.comment_quality]);
    setAvgQuality(qualityPosts.length > 0
      ? Math.round(qualityPosts.reduce((s, p) => s + QUALITY_MAP[p.comment_quality], 0) / qualityPosts.length * 10) / 10
      : 0);

    // ICP breakdown
    const icpMap = {};
    targetPosts.forEach(p => {
      if (p.icp_audience) {
        if (!icpMap[p.icp_audience]) icpMap[p.icp_audience] = 0;
        icpMap[p.icp_audience] += 1;
      }
    });
    setIcpBreakdown(Object.keys(icpMap).map(key => ({
      label: ICP_LABELS[key] || key,
      value: icpMap[key],
    })));

    // Calculate dynamic Health Score for period
    if (targetPosts.length > 0) {
      const consistencyScore = Math.min(Math.round((targetPosts.length / 12) * 100), 100);
      const avgDmsVal = targetPosts.reduce((s, p) => s + (p.dms || 0), 0) / targetPosts.length;
      const avgViewsVal = targetPosts.reduce((s, p) => s + (p.profile_views || 0), 0) / targetPosts.length;
      const avgQVal = targetPosts.filter(p => p.comment_quality && QUALITY_MAP[p.comment_quality])
        .reduce((s, p) => s + QUALITY_MAP[p.comment_quality], 0) / Math.max(targetPosts.filter(p => p.comment_quality).length, 1);

      const dmsNorm = Math.min((avgDmsVal / 5) * 100, 100);
      const viewsNorm = Math.min((avgViewsVal / 500) * 100, 100);
      const qNorm = avgQVal ? (avgQVal / 4) * 100 : 0;
      const engagementScore = Math.round((dmsNorm * 0.4 + qNorm * 0.35 + viewsNorm * 0.25));

      const uniqueFmt = new Set(targetPosts.filter(p => p.format).map(p => p.format));
      const varietyScore = Math.round((uniqueFmt.size / 6) * 100);

      const uniquePil = new Set(targetPosts.filter(p => p.pillar).map(p => p.pillar));
      const pillarBalanceScore = Math.round((uniquePil.size / 5) * 100);

      const computedPeriodScore = Math.round(
        consistencyScore * 0.35 +
        engagementScore * 0.35 +
        varietyScore * 0.15 +
        pillarBalanceScore * 0.15
      );

      setHealthScore({
        overall_score: computedPeriodScore,
        ai_note: `${targetPosts.length} posts analyzed for ${period === 'ALL' ? 'All Time' : period}`,
      });
    }
  };

  const calculateAndSaveHealthScore = async () => {
    const { weekNumber, weekStart, weekEnd } = getWeekInfo();
    if (weekPosts.length === 0) return null;

    const consistencyScore = Math.min(Math.round((weekPosts.length / 3) * 100), 100);

    const avgWeekDms = weekPosts.reduce((s, p) => s + (p.dms || 0), 0) / Math.max(weekPosts.length, 1);
    const avgWeekViews = weekPosts.reduce((s, p) => s + (p.profile_views || 0), 0) / Math.max(weekPosts.length, 1);
    const avgWeekQuality = weekPosts.filter(p => p.comment_quality && QUALITY_MAP[p.comment_quality])
      .reduce((s, p) => s + QUALITY_MAP[p.comment_quality], 0) / Math.max(weekPosts.filter(p => p.comment_quality).length, 1);

    const dmsNormalized = Math.min((avgWeekDms / 5) * 100, 100);
    const viewsNormalized = Math.min((avgWeekViews / 500) * 100, 100);
    const qualityNormalized = avgWeekQuality ? (avgWeekQuality / 4) * 100 : 0;
    const engagementScore = Math.round((dmsNormalized * 0.4 + qualityNormalized * 0.35 + viewsNormalized * 0.25));

    const uniqueFormats = new Set(weekPosts.filter(p => p.format).map(p => p.format));
    const varietyScore = Math.round((uniqueFormats.size / 6) * 100);

    const uniquePillars = new Set(weekPosts.filter(p => p.pillar).map(p => p.pillar));
    const pillarBalanceScore = Math.round((uniquePillars.size / 5) * 100);

    const overallScore = Math.round(
      consistencyScore * 0.35 +
      engagementScore * 0.35 +
      varietyScore * 0.15 +
      pillarBalanceScore * 0.15
    );

    const weakAreas = [];
    if (consistencyScore < 70) weakAreas.push('Consistency');
    if (engagementScore < 50) weakAreas.push('Engagement');
    if (varietyScore < 40) weakAreas.push('Format Variety');
    if (pillarBalanceScore < 40) weakAreas.push('Pillar Balance');

    const note = await generateHealthScoreNote(overallScore, weakAreas, weekPosts.length);
    setHealthNote(note);

    const newScoreObj = {
      week_number: weekNumber,
      week_start: weekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0],
      overall_score: overallScore,
      consistency_score: consistencyScore,
      engagement_score: engagementScore,
      variety_score: varietyScore,
      pillar_balance_score: pillarBalanceScore,
      ai_note: note,
    };

    try {
      const { data, error } = await supabase
        .from('health_scores')
        .insert(newScoreObj)
        .select()
        .single();

      if (!error && data) {
        setHealthScore(data);
      }
    } catch (err) {
      console.error('Error saving health score:', err);
    }
    return overallScore;
  };

  const handleRefreshRecommendations = async () => {
    if (refreshLoading) return;
    setRefreshLoading(true);

    try {
      const { weekNumber } = getWeekInfo();
      const recs = await generatePostRecommendations(posts, formatPerf, pillarPerf);

      setRecommendations(recs);

      await supabase
        .from('post_recommendations')
        .insert({
          week_number: weekNumber,
          recommendations: recs,
        });
    } catch (err) {
      console.error('Error refreshing recommendations:', err);
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

  const handleExportPDF = () => {
    let periodLabel = 'All Time';
    if (selectedPeriod !== 'ALL') {
      const [year, month] = selectedPeriod.split('-');
      periodLabel = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
    }

    const filtered = selectedPeriod === 'ALL'
      ? posts
      : posts.filter(p => {
          const d = new Date(p.published_at || p.created_at);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedPeriod;
        });

    const totalVisits = filtered.reduce((s, p) => s + (p.profile_views || 0), 0);
    const totalDms = filtered.reduce((s, p) => s + (p.dms || 0), 0);
    const qualityPosts = filtered.filter(p => p.comment_quality && QUALITY_MAP[p.comment_quality]);
    const avgQ = qualityPosts.length > 0
      ? Math.round(qualityPosts.reduce((s, p) => s + QUALITY_MAP[p.comment_quality], 0) / qualityPosts.length * 10) / 10
      : 0;

    let avgQualityLabel = 'Not rated';
    if (avgQ >= 3.5) avgQualityLabel = 'Deep';
    else if (avgQ >= 2.5) avgQualityLabel = 'Engaged';
    else if (avgQ >= 1.5) avgQualityLabel = 'Basic';
    else if (avgQ > 0) avgQualityLabel = 'Surface';

    exportDashboardVisualPDF(
      periodLabel,
      { totalPosts: filtered.length, totalVisits, totalDms, avgQualityLabel },
      formatPerf,
      pillarPerf,
      filtered
    );
  };

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-wide text-white uppercase flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              What's Working
            </h2>
            <p className="text-xs text-[--text-secondary]">
              Performance driven by profile visits, DMs, and comment depth — not vanity metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Month Review Selector */}
            <div className="flex items-center gap-2 bg-[--bg-tertiary] px-3 py-2 rounded-xl border border-[--border-color]">
              <span className="text-xs font-semibold text-[--text-secondary]">Review Period:</span>
              <select
                value={selectedPeriod}
                onChange={e => handlePeriodChange(e.target.value)}
                className="bg-[--bg-primary] text-xs font-bold text-white border border-[--border-color] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[--accent-primary] cursor-pointer"
              >
                <option value="ALL">All Time</option>
                {availablePeriods.map(p => {
                  const [year, month] = p.split('-');
                  return (
                    <option key={p} value={p}>
                      {MONTH_NAMES[parseInt(month, 10) - 1]} {year}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Visual PDF Export Button */}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300 cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF Report
            </button>

            <button
              onClick={handleRefreshRecommendations}
              disabled={refreshLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-[--bg-tertiary] border border-[--border-color] hover:border-[--accent-primary]/40 text-xs font-bold text-white uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40"
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
              Refresh Recs
            </button>

            <button
              onClick={handleGenerateWeeklyReview}
              disabled={reviewLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[--accent-primary] to-[--accent-secondary] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[--accent-primary]/20 active:scale-95 transition-all duration-300 glow-accent cursor-pointer disabled:opacity-40"
            >
              Weekly Audit
            </button>
          </div>
        </div>
      </div>

      {/* Format & Pillar Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Visits by Format */}
        <div className="glass-card p-6 border border-[--border-color] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              Profile Visits by Format
            </h3>
            <span className="text-[10px] text-[--text-secondary] font-semibold">Ranked by visits</span>
          </div>

          {formatPerf.length > 0 ? (
            <div className="space-y-3">
              {formatPerf.map((item) => {
                const maxViews = formatPerf[0]?.avgViews || 1;
                const percent = Math.min((item.avgViews / maxViews) * 100, 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[--text-secondary]">{item.avgDms} avg DMs</span>
                        <span className="font-bold text-[--accent-primary]">{item.avgViews} avg visits</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[--bg-primary] overflow-hidden border border-[--border-color]/30">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[--accent-primary] to-indigo-500 transition-all duration-500"
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[--text-secondary] italic">No published posts with format data yet.</p>
          )}
        </div>

        {/* Profile Visits by Content Pillar */}
        <div className="glass-card p-6 border border-[--border-color] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              Profile Visits by Content Pillar
            </h3>
            <span className="text-[10px] text-[--text-secondary] font-semibold">Ranked by visits</span>
          </div>

          {pillarPerf.length > 0 ? (
            <div className="space-y-3">
              {pillarPerf.map((item) => {
                const maxViews = pillarPerf[0]?.avgViews || 1;
                const percent = Math.min((item.avgViews / maxViews) * 100, 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[--text-secondary]">{item.avgDms} avg DMs</span>
                        <span className="font-bold text-[--accent-primary]">{item.avgViews} avg visits</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[--bg-primary] overflow-hidden border border-[--border-color]/30">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[--accent-primary] transition-all duration-500"
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[--text-secondary] italic">No published posts with pillar data yet.</p>
          )}
        </div>
      </div>

      {/* ZONE 2: Decision Engine Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Health Score */}
        <div className={`glass-card p-5 border rounded-2xl flex flex-col justify-between ${
          healthScore ? getHealthBg(healthScore.overall_score) : 'border-[--border-color]'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Health Score</span>
          <div className="my-2">
            <span className={`text-3xl font-black ${healthScore ? getHealthColor(healthScore.overall_score) : 'text-white'}`}>
              {healthScore ? healthScore.overall_score : '0'}
            </span>
            <span className="text-xs text-[--text-secondary] font-semibold">/100</span>
          </div>
          <p className="text-[10px] text-[--text-secondary] line-clamp-2">
            {healthScore ? healthScore.ai_note || 'Calculated weekly' : `${weekPosts.length} posts this week`}
          </p>
        </div>

        {/* Best Post */}
        <div className="glass-card p-5 border border-[--border-color] rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Best Post</span>
          <p className="text-xs font-bold text-white line-clamp-2 my-2">
            {posts.length > 0 ? posts.sort((a, b) => (b.profile_views || 0) - (a.profile_views || 0))[0]?.draft?.substring(0, 45) + '...' : 'No posts this period'}
          </p>
          <span className="text-[10px] text-[--accent-primary] font-semibold">
            {posts.length > 0 ? `${Math.max(...posts.map(p => p.profile_views || 0))} profile visits` : 'Untracked'}
          </span>
        </div>

        {/* Best Format */}
        <div className="glass-card p-5 border border-[--border-color] rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Best Format</span>
          <p className="text-sm font-bold text-white my-2">
            {formatPerf.length > 0 ? formatPerf[0].name : 'No formats this period'}
          </p>
          <span className="text-[10px] text-[--accent-primary] font-semibold">
            {formatPerf.length > 0 ? `${formatPerf[0].avgViews} avg visits` : 'Untracked'}
          </span>
        </div>

        {/* Best Pillar */}
        <div className="glass-card p-5 border border-[--border-color] rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">Best Pillar</span>
          <p className="text-sm font-bold text-white my-2">
            {pillarPerf.length > 0 ? pillarPerf[0].name : 'No pillars this period'}
          </p>
          <span className="text-[10px] text-[--accent-primary] font-semibold">
            {pillarPerf.length > 0 ? `${pillarPerf[0].avgViews} avg visits` : 'Untracked'}
          </span>
        </div>

        {/* ICP Pulse */}
        <div className="glass-card p-5 border border-[--border-color] rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">ICP Pulse</span>
          <p className="text-sm font-bold text-white my-2">
            {icpBreakdown.length > 0 ? (ICP_LABELS[icpBreakdown.sort((a, b) => b.value - a.value)[0]?.label] || icpBreakdown.sort((a, b) => b.value - a.value)[0]?.label || 'Untracked') : 'Untracked'}
          </p>
          <span className="text-[10px] text-[--text-secondary]">
            {icpBreakdown.length > 0 ? `${icpBreakdown.reduce((s, i) => s + i.value, 0)} total tagged` : 'Tag ICP in Published Tracker'}
          </span>
        </div>
      </div>

      {/* ZONE 3: Data-Backed Post Recommendations */}
      <div className="border-t border-[--border-color]/40 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Data-Backed Content Recommendations
            </h3>
            <p className="text-xs text-[--text-secondary]">
              AI recommendations built from your profile visit drivers and high-converting pillars
            </p>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="glass-card p-5 border border-[--border-color] rounded-2xl flex flex-col justify-between space-y-4 hover:border-[--accent-primary]/40 transition-all">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[--accent-primary]">
                    Idea Option #{idx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-white line-clamp-2">
                    {rec.title}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-[9px] font-bold text-[--accent-primary] bg-[--accent-primary]/10 border border-[--accent-primary]/25 px-2 py-0.5 rounded-full">
                    {rec.format}
                  </span>
                  <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-full">
                    {rec.pillar}
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
              Refresh recommendations above to generate data-backed post ideas based on your performance history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
