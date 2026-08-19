import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import PillarBadge from './PillarBadge';
import PageHeader from './ui/PageHeader';
import { spring, micro, cardItem, staggerContainer } from '../utils/animations';
import { getPostTitle } from '../utils/posts';
import { exportDashboardVisualPDF } from '../utils/pdfExporter';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const QUALITY_MAP = { surface: 1, basic: 2, engaged: 3, deep: 4 };
const ICP_LABELS = {
  founders: 'Founders', students: 'Students', smbs: 'SMBs',
  service_providers: 'Service Providers', innovators_builders: 'Innovators/Builders', random: 'Random',
};

export default function DashboardView({ onNavigateToPost, onWriteRecommendation }) {
  const [loading, setLoading] = useState(true);
  const [publishedPosts, setPublishedPosts] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('ALL'); // 'ALL' or 'YYYY-MM'

  const [stats, setStats] = useState({
    healthScore: 0,
    healthNote: '',
    bestPost: 'No posts this period',
    bestPostVisits: 0,
    topFormat: 'N/A',
    topFormatVisits: 0,
    topPillar: 'N/A',
    topPillarVisits: 0,
    icpPulse: 'Untracked',
    icpTaggedCount: 0,
  });

  const [formatData, setFormatData] = useState([]);
  const [pillarData, setPillarData] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [formatChartType, setFormatChartType] = useState('bar');
  const [pillarChartType, setPillarChartType] = useState('bar');
  const [animatedBars, setAnimatedBars] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (error) throw error;
      setPublishedPosts(data || []);
      calculateMetrics(data || [], 'ALL');
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

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    calculateMetrics(publishedPosts, period);
  };

  const calculateMetrics = (allPosts, period = selectedPeriod) => {
    if (!allPosts || allPosts.length === 0) {
      setStats({
        healthScore: 0, healthNote: 'No published posts yet',
        bestPost: 'No posts this period', bestPostVisits: 0,
        topFormat: 'N/A', topFormatVisits: 0,
        topPillar: 'N/A', topPillarVisits: 0,
        icpPulse: 'Untracked', icpTaggedCount: 0,
      });
      setFormatData([]);
      setPillarData([]);
      setFilteredPosts([]);
      return;
    }

    const targetPosts = period === 'ALL'
      ? allPosts
      : allPosts.filter(p => {
          const d = new Date(p.published_at || p.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === period;
        });

    setFilteredPosts(targetPosts);

    // Profile Visits by Format
    const formatPerf = {};
    targetPosts.forEach(p => {
      if (p.format) {
        if (!formatPerf[p.format]) formatPerf[p.format] = { views: 0, count: 0 };
        formatPerf[p.format].views += (p.profile_views || 0);
        formatPerf[p.format].count++;
      }
    });

    let bestFormat = 'N/A';
    let maxFormatAvg = -1;
    const formatList = Object.keys(formatPerf).map(name => {
      const avg = Math.round(formatPerf[name].views / formatPerf[name].count);
      if (avg > maxFormatAvg) { maxFormatAvg = avg; bestFormat = name; }
      return { name, value: avg };
    });

    // Profile Visits by Pillar
    const pillarPerf = {};
    targetPosts.forEach(p => {
      if (p.pillar) {
        if (!pillarPerf[p.pillar]) pillarPerf[p.pillar] = { views: 0, count: 0 };
        pillarPerf[p.pillar].views += (p.profile_views || 0);
        pillarPerf[p.pillar].count++;
      }
    });

    let bestPillar = 'N/A';
    let maxPillarAvg = -1;
    const pillarList = Object.keys(pillarPerf).map(name => {
      const avg = Math.round(pillarPerf[name].views / pillarPerf[name].count);
      if (avg > maxPillarAvg) { maxPillarAvg = avg; bestPillar = name; }
      return { name, value: avg };
    });

    // Best Post by Profile Visits
    const sortedByVisits = [...targetPosts].sort((a, b) => (b.profile_views || 0) - (a.profile_views || 0));
    const topPostObj = sortedByVisits[0];

    // ICP Pulse
    const icpMap = {};
    let totalIcpTagged = 0;
    targetPosts.forEach(p => {
      if (p.icp_audience) {
        icpMap[p.icp_audience] = (icpMap[p.icp_audience] || 0) + 1;
        totalIcpTagged++;
      }
    });
    const topIcpKey = Object.keys(icpMap).sort((a, b) => icpMap[b] - icpMap[a])[0];
    const topIcpLabel = topIcpKey ? (ICP_LABELS[topIcpKey] || topIcpKey) : 'Untracked';

    // Calculate Health Score
    let computedHealthScore = 0;
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

      computedHealthScore = Math.round(
        consistencyScore * 0.35 +
        engagementScore * 0.35 +
        varietyScore * 0.15 +
        pillarBalanceScore * 0.15
      );
    }

    setStats({
      healthScore: computedHealthScore,
      healthNote: `${targetPosts.length} posts analyzed for ${period === 'ALL' ? 'All Time' : period}`,
      bestPost: topPostObj ? getPostTitle(topPostObj) : 'No posts this period',
      bestPostVisits: topPostObj ? (topPostObj.profile_views || 0) : 0,
      topFormat: bestFormat,
      topFormatVisits: maxFormatAvg > -1 ? maxFormatAvg : 0,
      topPillar: bestPillar,
      topPillarVisits: maxPillarAvg > -1 ? maxPillarAvg : 0,
      icpPulse: topIcpLabel,
      icpTaggedCount: totalIcpTagged,
    });

    setFormatData(formatList.sort((a, b) => b.value - a.value));
    setPillarData(pillarList.sort((a, b) => b.value - a.value));
  };

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

  const handleExportPDF = () => {
    let periodLabel = 'All Time';
    if (selectedPeriod !== 'ALL') {
      const [year, month] = selectedPeriod.split('-');
      periodLabel = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
    }

    const totalVisits = filteredPosts.reduce((s, p) => s + (p.profile_views || 0), 0);
    const totalDms = filteredPosts.reduce((s, p) => s + (p.dms || 0), 0);
    const qualityPosts = filteredPosts.filter(p => p.comment_quality && QUALITY_MAP[p.comment_quality]);
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
      { totalPosts: filteredPosts.length, totalVisits, totalDms, avgQualityLabel },
      formatData,
      pillarData,
      filteredPosts
    );
  };

  const renderBarChart = (data, maxVal) => (
    <div className="space-y-3">
      {data.map(item => {
        const targetPercent = Math.max(6, (item.value / maxVal) * 100);
        const currentPercent = animatedBars[item.name] ? targetPercent : 0;
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-text-primary">{item.name}</span>
              <span className="text-accent font-bold">{item.value.toLocaleString()} avg visits</span>
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
          style={{
            background: `conic-gradient(${conicGradient})`,
            transition: 'transform 0.4s ease-out',
          }}
        >
          <div className="w-full h-full rounded-full animate-scaleIn" />
        </div>
        <div className="space-y-1.5">
          {segments.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-2 text-xs animate-slideInLeft"
              style={{ animationDelay: `${segments.indexOf(s) * 60}ms` }}
            >
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
      <div className="w-12 h-12 rounded-full bg-bg-tertiary border border-border-brand/50 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-border-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <span className="text-[11px] font-semibold tracking-wide text-text-secondary mb-1">No data yet</span>
      <p className="text-[10px] text-text-secondary/60 max-w-[200px]">Publish posts to populate analytics.</p>
    </div>
  );

  const decisionCards = [
    {
      label: 'Health Score',
      value: `${stats.healthScore} / 100`,
      sub: stats.healthNote,
      icon: (
        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Best Post',
      value: stats.bestPost,
      sub: `${stats.bestPostVisits} profile visits`,
      large: true,
      icon: (
        <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      label: 'Best Format',
      value: stats.topFormat,
      sub: `${stats.topFormatVisits} avg visits`,
      large: true,
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      label: 'Best Pillar',
      value: stats.topPillar,
      sub: `${stats.topPillarVisits} avg visits`,
      large: true,
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
    },
    {
      label: 'ICP Pulse',
      value: stats.icpPulse,
      sub: `${stats.icpTaggedCount} total tagged`,
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  const containerVariants = staggerContainer(0.07, 0.4);
  const chartVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 scrollbar-thin bg-bg-primary">
        <div className="border-b border-border-brand/50 pb-6 select-none space-y-2">
          <div className="h-8 w-48 skeleton" />
          <div className="h-3 w-64 skeleton" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card gradient-border-top relative p-5 border border-border-brand space-y-3">
              <div className="h-3 w-20 skeleton" />
              <div className="h-8 w-16 skeleton" />
              <div className="h-2 w-32 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxFormatVal = formatData.length > 0 ? Math.max(...formatData.map(d => d.value)) : 1;
  const maxPillarVal = pillarData.length > 0 ? Math.max(...pillarData.map(d => d.value)) : 1;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 scrollbar-thin bg-bg-primary">
      {/* Header with Month Review Selector & Visual PDF Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-brand/50 pb-6">
        <PageHeader
          title="Content Decision Engine"
          subtitle="Data-driven insights for what to post next based on profile visits and ICP signals"
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Review Period Selector */}
          <div className="flex items-center gap-2 bg-bg-secondary px-3 py-2 rounded-xl border border-border-brand">
            <span className="text-xs font-semibold text-text-secondary">Review Period:</span>
            <select
              value={selectedPeriod}
              onChange={e => handlePeriodChange(e.target.value)}
              className="bg-bg-primary text-xs font-bold text-text-primary border border-border-brand rounded-lg px-2.5 py-1 focus:outline-none focus:border-accent cursor-pointer"
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

          {/* Visual PDF Report Export Button */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-purple to-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300 cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF Report
          </button>
        </div>
      </div>

      {/* Decision Engine Header Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5"
      >
        {decisionCards.map((card) => (
          <motion.div
            key={card.label}
            variants={cardItem}
            whileHover={{ ...micro.cardHover }}
            transition={{ ...spring.smooth }}
            className="glass-card gradient-border-top relative p-5 border border-border-brand flex flex-col justify-between overflow-hidden cursor-default group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-wider text-text-secondary uppercase">
                {card.label}
              </span>
              <div className="p-2 rounded-xl bg-bg-tertiary border border-border-brand/40 text-accent group-hover:scale-110 transition-transform duration-300">
                {card.icon}
              </div>
            </div>

            <div>
              <p className={`font-bold tracking-tight text-text-primary ${card.large ? 'text-base line-clamp-1' : 'text-2xl'}`}>
                {card.value}
              </p>
              <p className="text-[10px] text-text-secondary mt-1 line-clamp-1">
                {card.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Visits by Format */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="visible"
          className="glass-card p-6 border border-border-brand space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Profile Visits by Format</h3>
              <p className="text-xs text-text-secondary">Average profile visits per format</p>
            </div>
            <div className="flex bg-bg-primary rounded-xl p-1 border border-border-brand/40 text-xs">
              <button
                onClick={() => setFormatChartType('bar')}
                className={`px-3 py-1 rounded-lg transition-ui cursor-pointer ${formatChartType === 'bar' ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Bar
              </button>
              <button
                onClick={() => setFormatChartType('pie')}
                className={`px-3 py-1 rounded-lg transition-ui cursor-pointer ${formatChartType === 'pie' ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Pie
              </button>
            </div>
          </div>

          {formatData.length > 0 ? (
            formatChartType === 'bar' ? renderBarChart(formatData, maxFormatVal) : renderPieChart(formatData)
          ) : (
            renderEmptyChart()
          )}
        </motion.div>

        {/* Profile Visits by Content Pillar */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="visible"
          className="glass-card p-6 border border-border-brand space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Profile Visits by Pillar</h3>
              <p className="text-xs text-text-secondary">Average profile visits per pillar</p>
            </div>
            <div className="flex bg-bg-primary rounded-xl p-1 border border-border-brand/40 text-xs">
              <button
                onClick={() => setPillarChartType('bar')}
                className={`px-3 py-1 rounded-lg transition-ui cursor-pointer ${pillarChartType === 'bar' ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Bar
              </button>
              <button
                onClick={() => setPillarChartType('pie')}
                className={`px-3 py-1 rounded-lg transition-ui cursor-pointer ${pillarChartType === 'pie' ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Pie
              </button>
            </div>
          </div>

          {pillarData.length > 0 ? (
            pillarChartType === 'bar' ? renderBarChart(pillarData, maxPillarVal) : renderPieChart(pillarData)
          ) : (
            renderEmptyChart()
          )}
        </motion.div>
      </div>

      {/* Posts Leaderboard for Selected Period */}
      <div className="glass-card p-6 border border-border-brand space-y-4">
        <h3 className="text-sm font-bold text-text-primary">
          {selectedPeriod === 'ALL' ? 'All-Time Posts Leaderboard (Profile Visits)' : `Posts Published in ${selectedPeriod}`}
        </h3>

        {filteredPosts.length > 0 ? (
          <div className="space-y-3">
            {filteredPosts.map(post => (
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
                  <span className="text-accent font-bold">{(post.profile_views || 0).toLocaleString()} visits</span>
                  <span className="text-text-secondary">{(post.dms || 0)} DMs</span>
                  <span className="text-text-secondary">{(post.impressions || 0).toLocaleString()} imps</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary italic">No posts recorded for this period.</p>
        )}
      </div>
    </div>
  );
}
