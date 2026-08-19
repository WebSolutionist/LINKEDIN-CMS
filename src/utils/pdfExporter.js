import html2pdf from 'html2pdf.js';

export function exportDashboardVisualPDF(selectedMonthLabel, stats, formatPerf, pillarPerf, topPosts) {
  const container = document.createElement('div');
  container.style.padding = '30px';
  container.style.backgroundColor = '#060d1a';
  container.style.color = '#f8f9fa';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  container.style.width = '800px';

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  container.innerHTML = `
    <div style="border-bottom: 2px solid #00b4d8; padding-bottom: 15px; margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
            Web Solutionist Executive Report
          </h1>
          <p style="font-size: 12px; color: #00b4d8; margin: 4px 0 0 0; font-weight: 600;">
            LinkedIn Decision Engine Performance Analysis — Period: ${selectedMonthLabel}
          </p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 10px; color: #94a3b8; margin: 0;">Generated on ${today}</p>
        </div>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px;">
      <div style="background: rgba(12, 22, 41, 0.9); border: 1px solid #1e3a60; padding: 12px; border-radius: 10px;">
        <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; margin: 0;">Total Published</p>
        <p style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 4px 0 0 0;">${stats.totalPosts}</p>
      </div>
      <div style="background: rgba(12, 22, 41, 0.9); border: 1px solid #1e3a60; padding: 12px; border-radius: 10px;">
        <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; margin: 0;">Profile Visits</p>
        <p style="font-size: 20px; font-weight: 700; color: #00b4d8; margin: 4px 0 0 0;">${stats.totalVisits.toLocaleString()}</p>
      </div>
      <div style="background: rgba(12, 22, 41, 0.9); border: 1px solid #1e3a60; padding: 12px; border-radius: 10px;">
        <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; margin: 0;">Total DMs</p>
        <p style="font-size: 20px; font-weight: 700; color: #fbbf24; margin: 4px 0 0 0;">${stats.totalDms}</p>
      </div>
      <div style="background: rgba(12, 22, 41, 0.9); border: 1px solid #1e3a60; padding: 12px; border-radius: 10px;">
        <p style="font-size: 9px; color: #94a3b8; text-transform: uppercase; margin: 0;">Avg Comment Quality</p>
        <p style="font-size: 20px; font-weight: 700; color: #34d399; margin: 4px 0 0 0;">${stats.avgQualityLabel}</p>
      </div>
    </div>

    <!-- Performance Charts / Lists -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
      <div style="background: rgba(12, 22, 41, 0.9); border: 1px solid #1e3a60; padding: 15px; border-radius: 12px;">
        <h3 style="font-size: 12px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; text-transform: uppercase;">
          Profile Visits by Format
        </h3>
        ${formatPerf.length ? formatPerf.map(f => `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-bottom: 3px;">
              <span>${f.name}</span>
              <span style="font-weight: 700; color: #00b4d8;">${f.avgViews} avg visits</span>
            </div>
            <div style="height: 6px; background: #132038; border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${Math.min(100, Math.max(10, (f.avgViews / (formatPerf[0]?.avgViews || 1)) * 100))}%; background: linear-gradient(90deg, #7c3aed, #00b4d8); border-radius: 4px;"></div>
            </div>
          </div>
        `).join('') : '<p style="font-size: 11px; color: #64748b;">No format data available</p>'}
      </div>

      <div style="background: rgba(12, 22, 41, 0.9); border: 1px solid #1e3a60; padding: 15px; border-radius: 12px;">
        <h3 style="font-size: 12px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; text-transform: uppercase;">
          Profile Visits by Content Pillar
        </h3>
        ${pillarPerf.length ? pillarPerf.map(p => `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-bottom: 3px;">
              <span>${p.name}</span>
              <span style="font-weight: 700; color: #00b4d8;">${p.avgViews} avg visits</span>
            </div>
            <div style="height: 6px; background: #132038; border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${Math.min(100, Math.max(10, (p.avgViews / (pillarPerf[0]?.avgViews || 1)) * 100))}%; background: linear-gradient(90deg, #00b4d8, #34d399); border-radius: 4px;"></div>
            </div>
          </div>
        `).join('') : '<p style="font-size: 11px; color: #64748b;">No pillar data available</p>'}
      </div>
    </div>

    <!-- Top Posts Table -->
    <div style="background: rgba(12, 22, 41, 0.9); border: 1px solid #1e3a60; padding: 15px; border-radius: 12px;">
      <h3 style="font-size: 12px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; text-transform: uppercase;">
        Top Posts Performance Breakdown
      </h3>
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 10px;">
        <thead>
          <tr style="border-bottom: 1px solid #1e3a60; color: #94a3b8; font-weight: 700;">
            <th style="padding: 8px;">Title</th>
            <th style="padding: 8px;">Format</th>
            <th style="padding: 8px;">Pillar</th>
            <th style="padding: 8px; text-align: center;">Profile Visits</th>
            <th style="padding: 8px; text-align: center;">DMs</th>
            <th style="padding: 8px; text-align: center;">CQ</th>
          </tr>
        </thead>
        <tbody>
          ${topPosts.length ? topPosts.slice(0, 5).map(post => `
            <tr style="border-bottom: 1px solid rgba(30, 58, 96, 0.4); color: #f8f9fa;">
              <td style="padding: 8px; font-weight: 600;">${post.draft ? post.draft.substring(0, 35) + '...' : 'Untitled Post'}</td>
              <td style="padding: 8px; color: #94a3b8;">${post.format || '—'}</td>
              <td style="padding: 8px; color: #94a3b8;">${post.pillar || '—'}</td>
              <td style="padding: 8px; text-align: center; color: #00b4d8; font-weight: 700;">${post.profile_views || 0}</td>
              <td style="padding: 8px; text-align: center; color: #fbbf24; font-weight: 700;">${post.dms || 0}</td>
              <td style="padding: 8px; text-align: center; color: #34d399; font-weight: 600;">${post.comment_quality || '—'}</td>
            </tr>
          `).join('') : '<tr><td colspan="6" style="padding: 10px; color: #64748b;">No posts in this period</td></tr>'}
        </tbody>
      </table>
    </div>

    <div style="margin-top: 25px; padding-top: 10px; border-top: 1px solid #1e3a60; text-align: center; font-size: 9px; color: #64748b;">
      Web Solutionist CMS — Confidential Executive Content Intelligence
    </div>
  `;

  const opt = {
    margin: 10,
    filename: `LinkedIn_Executive_Analytics_${selectedMonthLabel.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, backgroundColor: '#060d1a' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save();
}
