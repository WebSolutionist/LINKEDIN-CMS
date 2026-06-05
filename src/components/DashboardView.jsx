import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import PillarBadge from './PillarBadge';
import PageHeader from './ui/PageHeader';

export default function DashboardView() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    publishedThisMonth: 0,
    avgImpressions: 0,
    topFormat: 'N/A',
    topPillar: 'N/A',
    streak: 0,
  });

  const [formatData, setFormatData] = useState([]);
  const [pillarData, setPillarData] = useState([]);
  const [monthlyPosts, setMonthlyPosts] = useState([]);
  const [formatChartType, setFormatChartType] = useState('bar');
  const [pillarChartType, setPillarChartType] = useState('bar');
  const [animatedBars, setAnimatedBars] = useState({});

  const calculateMetrics = (published) => {
    if (!published || published.length === 0) {
      setStats({ publishedThisMonth: 0, avgImpressions: 0, topFormat: 'N/A', topPillar: 'N/A', streak: 0 });
      setFormatData([]);
      setPillarData([]);
      setMonthlyPosts([]);
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthPosts = published.filter(p => {
      const d = new Date(p.published_at || p.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalImpressions = published.reduce((sum, p) => sum + (p.impressions || 0), 0);
    const avgImps = published.length ? Math.round(totalImpressions / published.length) : 0;

    const formatPerf = {};
    published.forEach(p => {
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
    published.forEach(p => {
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
    published.forEach(p => {
      const pubDate = new Date(p.published_at || p.created_at);
      if (pubDate >= startOfWeek) postDatesThisWeek.add(pubDate.toDateString());
    });

    setStats({
      publishedThisMonth: monthPosts.length,
      avgImpressions: avgImps,
      topFormat: bestFormat,
      topPillar: bestPillar,
      streak: postDatesThisWeek.size,
    });

    setFormatData(formatList.sort((a, b) => b.value - a.value));
    setPillarData(pillarList.sort((a, b) => b.value - a.value));
    setMonthlyPosts(monthPosts.sort((a, b) => (b.impressions || 0) - (a.impressions || 0)));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (error) throw error;
      calculateMetrics(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const statCards = [
    {
      label: 'Monthly Output',
      value: stats.publishedThisMonth,
      sub: 'Posts published this month',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Avg Impressions',
      value: stats.avgImpressions.toLocaleString(),
      sub: 'Average impressions per post',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      label: 'Dominant Format',
      value: stats.topFormat,
      sub: 'Top performing format (avg imps)',
      large: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      label: 'Core Pillar',
      value: stats.topPillar,
      sub: 'Top performing pillar (avg imps)',
      large: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
    },
    {
      label: 'Active Streak',
      value: stats.streak,
      sub: `Posted ${stats.streak} days this week`,
      suffix: '/ 7 days',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      ),
    },
  ];

  const staggerDelays = ['0ms', '80ms', '160ms', '240ms', '320ms'];

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin bg-bg-primary">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-card p-6 border border-border-brand space-y-4">
              <div className="h-4 w-36 skeleton" />
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 skeleton" />
                      <div className="h-3 w-16 skeleton" />
                    </div>
                    <div className="h-3 rounded-full skeleton" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 animate-fadeIn scrollbar-thin bg-bg-primary">
      <PageHeader
        title="Content Overview"
        subtitle="Track performance and audit your content output"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="glass-card gradient-border-top relative p-5 flex flex-col gap-1 border border-border-brand group hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 animate-slideUp cursor-default"
            style={{ animationDelay: staggerDelays[i], animationFillMode: 'forwards' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{stat.label}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent-deep/20 border border-accent/10 flex items-center justify-center group-hover:border-accent/30 group-hover:glow-accent transition-all duration-300">
                <span className="text-accent group-hover:drop-shadow-[0_0_4px_rgba(0,180,216,0.5)] transition-all duration-300">
                  {stat.icon}
                </span>
              </div>
            </div>
            {stat.suffix ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-text-primary group-hover:text-accent transition-colors duration-300">{stat.value}</span>
                <span className="text-xs text-text-secondary font-semibold">{stat.suffix}</span>
              </div>
            ) : (
              <span className={`font-black text-text-primary group-hover:text-accent transition-colors duration-300 ${stat.large ? 'text-lg mt-1 truncate' : 'text-3xl'}`}>
                {stat.value}
              </span>
            )}
            <span className="text-[9px] text-text-secondary mt-1">{stat.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div
          className="glass-card p-6 border border-border-brand space-y-4 animate-slideUp"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-border-brand/40">
            <h3 className="text-sm font-semibold text-text-primary">Impressions by format</h3>
            <div className="flex gap-1 p-0.5 bg-bg-primary border border-border-brand rounded-lg">
              <button
                onClick={() => setFormatChartType('bar')}
                className={`px-3 py-1 text-[9px] font-semibold tracking-wide rounded-md transition-all cursor-pointer ${formatChartType === 'bar' ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Bar
              </button>
              <button
                onClick={() => setFormatChartType('pie')}
                className={`px-3 py-1 text-[9px] font-semibold tracking-wide rounded-md transition-all cursor-pointer ${formatChartType === 'pie' ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Pie
              </button>
            </div>
          </div>
          {formatData.length > 0
            ? (formatChartType === 'bar' ? renderBarChart(formatData, Math.max(...formatData.map(d => d.value)) || 100) : renderPieChart(formatData))
            : renderEmptyChart()}
        </div>

        <div
          className="glass-card p-6 border border-border-brand space-y-4 animate-slideUp"
          style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-border-brand/40">
            <h3 className="text-sm font-semibold text-text-primary">Impressions by pillar</h3>
            <div className="flex gap-1 p-0.5 bg-bg-primary border border-border-brand rounded-lg">
              <button
                onClick={() => setPillarChartType('bar')}
                className={`px-3 py-1 text-[9px] font-semibold tracking-wide rounded-md transition-all cursor-pointer ${pillarChartType === 'bar' ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Bar
              </button>
              <button
                onClick={() => setPillarChartType('pie')}
                className={`px-3 py-1 text-[9px] font-semibold tracking-wide rounded-md transition-all cursor-pointer ${pillarChartType === 'pie' ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Pie
              </button>
            </div>
          </div>
          {pillarData.length > 0
            ? (pillarChartType === 'bar' ? renderBarChart(pillarData, Math.max(...pillarData.map(d => d.value)) || 100) : renderPieChart(pillarData))
            : renderEmptyChart()}
        </div>
      </div>

      <div
        className="glass-card p-6 border border-border-brand space-y-4 animate-slideUp"
        style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-brand/40">
          <h3 className="text-sm font-semibold text-text-primary">This month&apos;s performance</h3>
          <span className="text-[10px] text-text-secondary font-semibold">Ranked by impressions</span>
        </div>

        {monthlyPosts.length > 0 ? (
          <div className="space-y-2">
            {monthlyPosts.map((post, idx) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-bg-primary/30 border border-border-brand/40 hover:bg-bg-tertiary/30 hover:border-accent/30 hover:glow-accent transition-all duration-300 relative group cursor-pointer"
              >
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-md bg-gradient-to-b from-accent-purple to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent flex items-center justify-center shrink-0 glow-accent">
                  <span className="text-[11px] font-black text-white">#{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{post.hook_idea || post.raw_idea || 'Untitled'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {post.format && <span className="text-[9px] text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">{post.format}</span>}
                    <PillarBadge pillar={post.pillar} />
                    <span className="text-[9px] text-text-secondary">
                      {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-black text-accent">{(post.impressions || 0).toLocaleString()}</span>
                    <span className="text-[9px] text-text-secondary block">impressions</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-text-primary">{(post.comments || 0).toLocaleString()}</span>
                    <span className="text-[9px] text-text-secondary block">comments</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-text-secondary">{(post.profile_views || 0).toLocaleString()}</span>
                    <span className="text-[9px] text-text-secondary block">views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-36 border border-dashed border-border-brand/40 rounded-xl flex flex-col items-center justify-center text-center animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-bg-tertiary border border-border-brand/50 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-border-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold tracking-wide text-text-secondary">No posts this month yet</span>
            <p className="text-[10px] text-text-secondary/60 mt-1">Publish posts to see your monthly performance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
