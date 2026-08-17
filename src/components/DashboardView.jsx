import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { exportPostsToCSV } from '../utils/exportUtils';
import PillarBadge from './PillarBadge';
import PageHeader from './ui/PageHeader';
import { spring, micro, cardItem, staggerContainer } from '../utils/animations';
import { getPostTitle } from '../utils/posts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DashboardView({ onNavigateToPost }) {
  const [loading, setLoading] = useState(true);
  const [publishedPosts, setPublishedPosts] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('ALL'); // 'ALL' or 'YYYY-MM'
  
  const [formatChartType, setFormatChartType] = useState('bar');
  const [pillarChartType, setPillarChartType] = useState('bar');
  const [animatedBars, setAnimatedBars] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, raw_idea, draft, pillar, format, impressions, comments, likes, profile_views, dms, cq, icp, published_at, created_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (error) throw error;
      setPublishedPosts(data || []);
    } catch (err) {
      console.error('Error fetching dashboard posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Available Month Periods for Filter
  const availablePeriods = useMemo(() => {
    const periodSet = new Set();
    publishedPosts.forEach(p => {
      const d = new Date(p.published_at || p.created_at);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        periodSet.add(key);
      }
    });
    return Array.from(periodSet).sort().reverse();
  }, [publishedPosts]);

  // Filtered Posts based on Month Selection
  const filteredPosts = useMemo(() => {
    if (selectedPeriod === 'ALL') return publishedPosts;
    return publishedPosts.filter(p => {
      const d = new Date(p.published_at || p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedPeriod;
    });
  }, [publishedPosts, selectedPeriod]);

  // Metrics Calculation for Filtered Range
  const { stats, formatData, pillarData, sortedMonthlyPosts } = useMemo(() => {
    if (!filteredPosts || filteredPosts.length === 0) {
      return {
        stats: { output: 0, avgImpressions: 0, topFormat: 'N/A', topPillar: 'N/A', streak: 0 },
        formatData: [],
        pillarData: [],
        sortedMonthlyPosts: [],
      };
    }

    const totalImpressions = filteredPosts.reduce((sum, p) => sum + (p.impressions || 0), 0);
    const avgImps = Math.round(totalImpressions / filteredPosts.length);

    const formatPerf = {};
    filteredPosts.forEach(p => {
      if (p.format) {
        if (!formatPerf[p.format]) formatPerf[p.format] = { sum: 0, count: 0 };
        formatPerf[p.format].sum += (p.impressions || 0);
        formatPerf[p.format].count++;
      }
    });

    let bestFormat = 'N/A';
    let maxFormatAvg = -1;
    const formatList = Object.keys(formatPerf).map(name => {
      const avg = Math.round(formatPerf[name].sum / formatPerf[name].count);
      if (avg > maxFormatAvg) { maxFormatAvg = avg; bestFormat = name; }
      return { name, value: avg };
    });

    const pillarPerf = {};
    filteredPosts.forEach(p => {
      if (p.pillar) {
        if (!pillarPerf[p.pillar]) pillarPerf[p.pillar] = { sum: 0, count: 0 };
        pillarPerf[p.pillar].sum += (p.impressions || 0);
        pillarPerf[p.pillar].count++;
      }
    });

    let bestPillar = 'N/A';
    let maxPillarAvg = -1;
    const pillarList = Object.keys(pillarPerf).map(name => {
      const avg = Math.round(pillarPerf[name].sum / pillarPerf[name].count);
      if (avg > maxPillarAvg) { maxPillarAvg = avg; bestPillar = name; }
      return { name, value: avg };
    });

    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const postDatesThisWeek = new Set();
    filteredPosts.forEach(p => {
      const pubDate = new Date(p.published_at || p.created_at);
      if (pubDate >= startOfWeek) postDatesThisWeek.add(pubDate.toDateString());
    });

    return {
      stats: {
        output: filteredPosts.length,
        avgImpressions: avgImps,
        topFormat: bestFormat,
        topPillar: bestPillar,
        streak: postDatesThisWeek.size,
      },
      formatData: formatList.sort((a, b) => b.value - a.value),
      pillarData: pillarList.sort((a, b) => b.value - a.value),
      sortedMonthlyPosts: [...filteredPosts].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)),
    };
  }, [filteredPosts]);

  useEffect(() => {
    const allNames = [...formatData, ...pillarData].map(d => d.name);
    if (allNames.length === 0) return;
    const timeouts = allNames.map((name, i) =>
      setTimeout(() => {
        setAnimatedBars(prev => ({ ...prev, [name]: true }));
      }, 200 + i * 80)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [formatData, pillarData]);

  const handleExportReport = () => {
    const label = selectedPeriod === 'ALL' ? 'all_time' : selectedPeriod;
    exportPostsToCSV(filteredPosts, `linkedin_analytics_report_${label}.csv`);
  };

  const maxFormatVal = Math.max(...formatData.map(d => d.value), 1);
  const maxPillarVal = Math.max(...pillarData.map(d => d.value), 1);

  const renderBarChart = (data, maxVal) => (
    <div className="space-y-3">
      {data.map(item => {
        const targetPercent = Math.max(6, (item.value / maxVal) * 100);
        const currentPercent = animatedBars[item.name] ? targetPercent : 0;
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-text-primary">{item.name}</span>
              <span className="text-accent font-bold">{item.value.toLocaleString()} avg</span>
            </div>
            <div className="h-3 rounded-full bg-bg-primary overflow-hidden border border-border-brand/30">
              <div
                className="h-full w-full rounded-full bg-gradient-to-r from-accent-purple to-accent transition-transform duration-1000 ease-out shadow-[0_0_8px_rgba(124,58,237,0.25)] origin-left"
                style={{ transform: `scaleX(${currentPercent / 100})` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPieChart = (data) => {
    if (data.length === 0) return null;
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return null;

    const colors = ['#00B4D8', '#0077B6', '#023E8A', '#48CAE4', '#90E0EF', '#0096C7'];
    let cumulativePercent = 0;
    const segments = data.map((d, i) => {
      const percent = d.value / total;
      const start = cumulativePercent;
      cumulativePercent += percent;
      return { ...d, percent, start, color: colors[i % colors.length] };
    });

    const conicGradient = segments.map(s =>
      `${s.color} ${(s.start * 360).toFixed(1)}deg ${((s.start + s.percent) * 360).toFixed(1)}deg`
    ).join(', ');

    return (
      <div className="flex items-center gap-6 animate-fadeIn">
        <div
          className="w-36 h-36 rounded-full shrink-0"
          style={{ background: `conic-gradient(${conicGradient})` }}
        >
          <div className="w-full h-full rounded-full animate-scaleIn" />
        </div>
        <div className="space-y-1.5">
          {segments.map(s => (
            <div key={s.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-text-primary">{s.name}</span>
              <span className="text-accent font-bold">{(s.percent * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyChart = () => (
    <div className="h-48 border border-dashed border-border-brand/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
      <span className="text-[11px] font-semibold text-text-secondary mb-1">No post data for selected period</span>
      <p className="text-[10px] text-text-secondary/60 max-w-[200px]">Publish posts or adjust your month filter.</p>
    </div>
  );

  const statCards = [
    {
      label: 'Published Output',
      value: stats.output,
      sub: selectedPeriod === 'ALL' ? 'All-time published posts' : `Posts in ${selectedPeriod}`,
    },
    {
      label: 'Avg Impressions',
      value: stats.avgImpressions.toLocaleString(),
      sub: 'Average impressions per post',
    },
    {
      label: 'Dominant Format',
      value: stats.topFormat,
      sub: 'Highest reach format',
      large: true,
    },
    {
      label: 'Top Pillar',
      value: stats.topPillar,
      sub: 'Highest performing pillar',
      isPillar: true,
    },
    {
      label: 'Active Streak',
      value: `${stats.streak}d`,
      sub: 'Days posted this week',
    },
  ];

  const containerVariants = staggerContainer(0.07, 0.4);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 scrollbar-thin bg-bg-primary">
        <div className="border-b border-border-brand/50 pb-6 space-y-2">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-3 w-64 skeleton rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-5 border border-border-brand h-24 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 scrollbar-thin bg-bg-primary"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Content Overview & Past Reviews"
          subtitle="Audit performance across months and export LinkedIn analytics reports"
        />

        {/* Month Selector & Export Controls */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <div className="flex items-center gap-2 bg-bg-secondary/60 px-3 py-1.5 rounded-xl border border-border-brand/60">
            <span className="text-xs text-text-secondary font-medium hidden sm:inline">Review Period:</span>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-bg-primary text-xs text-text-primary border border-border-brand/40 rounded-lg px-2.5 py-1 focus:outline-none focus:border-accent transition-ui cursor-pointer"
            >
              <option value="ALL">All Time</option>
              {availablePeriods.map(p => {
                const [year, month] = p.split('-');
                const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
                return (
                  <option key={p} value={p}>
                    {monthName} {year}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent-purple to-accent text-white text-xs font-bold shadow-md hover:shadow-accent/20 transition-ui cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5"
      >
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            variants={cardItem}
            whileHover={{ ...micro.hoverLift, borderColor: 'rgba(0, 180, 216, 0.4)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="glass-card gradient-border-top relative p-5 border border-border-brand transition-ui flex flex-col justify-between"
          >
            <p className="text-[11px] font-semibold tracking-wider text-text-secondary uppercase">{card.label}</p>
            <div className="my-2">
              {card.isPillar ? (
                card.value !== 'N/A' ? (
                  <PillarBadge pillar={card.value} size="lg" />
                ) : (
                  <span className="text-xl font-bold text-text-muted">N/A</span>
                )
              ) : (
                <p className={`font-bold tracking-tight text-text-primary ${card.large ? 'text-lg line-clamp-1' : 'text-2xl font-mono'}`}>
                  {card.value}
                </p>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-tight">{card.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Format Performance */}
        <motion.div
          whileHover={{ ...micro.hoverLift }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-card p-6 border border-border-brand transition-ui space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Format Performance (Avg Reach)</h3>
            <div className="flex items-center bg-bg-primary p-1 rounded-xl border border-border-brand/40">
              <button
                type="button"
                onClick={() => setFormatChartType('bar')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-ui cursor-pointer ${
                  formatChartType === 'bar' ? 'bg-accent/20 text-accent font-bold' : 'text-text-secondary'
                }`}
              >
                Bar
              </button>
              <button
                type="button"
                onClick={() => setFormatChartType('pie')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-ui cursor-pointer ${
                  formatChartType === 'pie' ? 'bg-accent/20 text-accent font-bold' : 'text-text-secondary'
                }`}
              >
                Pie
              </button>
            </div>
          </div>
          {formatData.length > 0
            ? formatChartType === 'bar' ? renderBarChart(formatData, maxFormatVal) : renderPieChart(formatData)
            : renderEmptyChart()}
        </motion.div>

        {/* Content Pillar Performance */}
        <motion.div
          whileHover={{ ...micro.hoverLift }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-card p-6 border border-border-brand transition-ui space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Content Pillar Distribution</h3>
            <div className="flex items-center bg-bg-primary p-1 rounded-xl border border-border-brand/40">
              <button
                type="button"
                onClick={() => setPillarChartType('bar')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-ui cursor-pointer ${
                  pillarChartType === 'bar' ? 'bg-accent/20 text-accent font-bold' : 'text-text-secondary'
                }`}
              >
                Bar
              </button>
              <button
                type="button"
                onClick={() => setPillarChartType('pie')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-ui cursor-pointer ${
                  pillarChartType === 'pie' ? 'bg-accent/20 text-accent font-bold' : 'text-text-secondary'
                }`}
              >
                Pie
              </button>
            </div>
          </div>
          {pillarData.length > 0
            ? pillarChartType === 'bar' ? renderBarChart(pillarData, maxPillarVal) : renderPieChart(pillarData)
            : renderEmptyChart()}
        </motion.div>
      </div>

      {/* Period Post Performance Leaderboard */}
      <div className="glass-card p-6 border border-border-brand space-y-4">
        <h3 className="text-sm font-bold text-text-primary">
          {selectedPeriod === 'ALL' ? 'All-Time Posts Leaderboard' : `Posts Published in ${selectedPeriod}`}
        </h3>

        {sortedMonthlyPosts.length > 0 ? (
          <div className="space-y-3">
            {sortedMonthlyPosts.map(post => (
              <div
                key={post.id}
                onClick={() => onNavigateToPost?.(post)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-bg-secondary/60 hover:bg-bg-tertiary border border-border-brand/40 transition-ui cursor-pointer group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {post.pillar && <PillarBadge pillar={post.pillar} size="sm" />}
                  <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-ui truncate">
                    {getPostTitle(post)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs tabular-nums">
                  <span className="text-accent font-bold">{(post.impressions || 0).toLocaleString()} imps</span>
                  <span className="text-text-secondary">{(post.likes || 0)} likes</span>
                  <span className="text-text-secondary">{(post.comments || 0)} comments</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary italic">No posts recorded for this period.</p>
        )}
      </div>
    </motion.div>
  );
}
