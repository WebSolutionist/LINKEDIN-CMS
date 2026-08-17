export function exportPostsToCSV(posts, filename = 'linkedin_content_analytics.csv') {
  if (!posts || !posts.length) return;

  const headers = [
    'Post Title',
    'Raw Idea',
    'Format',
    'Pillar',
    'Status',
    'Impressions',
    'Likes',
    'Comments',
    'Profile Views',
    'DMs',
    'Comment Quality (CQ)',
    'Target ICP',
    'Published Date',
    'Created Date'
  ];

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const val = String(str).replace(/"/g, '""');
    return `"${val}"`;
  };

  const rows = posts.map(p => [
    escapeCSV(p.title || p.raw_idea || 'Untitled Post'),
    escapeCSV(p.raw_idea || ''),
    escapeCSV(p.format || ''),
    escapeCSV(p.pillar || ''),
    escapeCSV(p.status || 'published'),
    p.impressions || 0,
    p.likes || 0,
    p.comments || 0,
    p.profile_views || 0,
    p.dms || 0,
    escapeCSV(p.cq || 'N/A'),
    escapeCSV(p.icp || 'N/A'),
    escapeCSV(p.published_at ? new Date(p.published_at).toISOString().split('T')[0] : ''),
    escapeCSV(p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '')
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
