import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import PageHeader from './ui/PageHeader';
import PropertyPill from './ui/PropertyPill';
import PillarBadge from './PillarBadge';
import EditStatsModal from './EditStatsModal';

export default function PublishedTrackerView({ onViewOnCalendar }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSaveStats = async (postId, metrics) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update(metrics)
        .eq('id', postId)
        .select()
        .single();
      if (error) throw error;
      setPosts(posts.map(p => p.id === data.id ? data : p));
    } catch (err) {
      console.error('Error saving stats:', err);
    }
  };

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

  useEffect(() => { fetchPublishedPosts(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const getPostTitle = (post) => {
    if (post.hook_idea) return post.hook_idea;
    if (post.draft) {
      const lines = post.draft.split('\n');
      const firstLine = lines.find(l => l.trim().length > 0);
      if (firstLine) return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
    }
    if (post.raw_idea) return post.raw_idea.length > 60 ? post.raw_idea.substring(0, 60) + '...' : post.raw_idea;
    return 'Untitled Post';
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = getPostTitle(post).toLowerCase();
    const raw = (post.raw_idea || '').toLowerCase();
    return title.includes(q) || raw.includes(q);
  });

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-bg-primary scrollbar-thin">
        <div className="pb-6 border-b border-border-brand/40 space-y-2">
          <div className="h-8 w-56 skeleton" />
          <div className="h-4 w-72 skeleton" />
        </div>
        <div className="h-11 max-w-md skeleton rounded-xl" />
        <div className="glass-card overflow-hidden">
          <div className="border-b border-border-brand/40 px-6 py-3 flex gap-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 w-16 skeleton" />
            ))}
          </div>
          <div className="divide-y divide-border-brand/30">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/5 skeleton" />
                  <div className="h-2.5 w-2/5 skeleton" />
                </div>
                <div className="flex gap-8">
                  <div className="h-3 w-14 skeleton" />
                  <div className="h-3 w-14 skeleton" />
                  <div className="h-3 w-14 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-bg-primary animate-fadeIn scrollbar-thin">
      <PageHeader
        title="Published Tracker"
        subtitle="Audit live performance and update metrics"
      />

      <div className="w-full max-w-md">
        <div className="glass-card rounded-xl flex items-center gap-2 px-3 py-1">
          <svg
            className="w-4 h-4 shrink-0 text-text-secondary pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search posts by title..."
            className="flex-1 bg-transparent border-0 rounded-xl py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {filteredPosts.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-brand/50 bg-bg-secondary/50 text-xs font-medium text-text-secondary">
                  <th className="px-6 py-3.5 font-normal">Post title</th>
                  <th className="px-6 py-3.5 font-normal">Format</th>
                  <th className="px-6 py-3.5 font-normal">Pillar</th>
                  <th className="px-6 py-3.5 font-normal text-center">Impressions</th>
                  <th className="px-6 py-3.5 font-normal text-center">Comments</th>
                  <th className="px-6 py-3.5 font-normal text-center">Profile views</th>
                  <th className="px-6 py-3.5 font-normal">Published</th>
                  <th className="px-6 py-3.5 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-brand/40 text-sm text-text-primary">
                {filteredPosts.map(post => (
                  <tr
                    key={post.id}
                    className="group hover:bg-bg-tertiary/40 transition-ui cursor-default"
                  >
                    <td className="px-6 py-4 max-w-[280px]">
                      <p className="font-semibold text-text-primary line-clamp-1 group-hover:text-accent transition-ui leading-snug">
                        {getPostTitle(post)}
                      </p>
                      {post.raw_idea && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1 max-w-[260px] italic">
                          {post.raw_idea}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {post.format ? (
                        <PropertyPill label={post.format} />
                      ) : (
                        <span className="text-xs text-text-secondary/60">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <PillarBadge pillar={post.pillar} />
                    </td>
                    <td className="px-6 py-4 text-center font-semibold tabular-nums text-accent">
                      {(post.impressions || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold tabular-nums text-accent">
                      {(post.comments || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold tabular-nums text-accent">
                      {(post.profile_views || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-text-secondary tabular-nums">
                      {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {post.calendar_date && (
                          <button
                            type="button"
                            onClick={() => onViewOnCalendar?.(post.calendar_date)}
                            className="p-2 bg-bg-primary border border-border-brand text-text-secondary hover:border-accent/50 hover:text-accent rounded-xl transition-ui cursor-pointer inline-flex items-center justify-center"
                            title="View on Calendar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingPost(post)}
                          className="p-2 bg-bg-primary border border-border-brand text-text-secondary hover:border-accent/50 hover:text-accent rounded-xl transition-ui cursor-pointer inline-flex items-center justify-center"
                          title="Edit Performance Stats"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center text-center px-8 py-16 animate-fadeIn">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-full bg-bg-secondary border border-border-brand flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-secondary/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            {searchQuery ? 'No matching posts found' : 'No published posts tracked yet'}
          </h3>
          <p className="text-sm text-text-secondary max-w-sm mt-2 leading-relaxed">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Publish content from the Writing Room to build your analytical database.'}
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
    </div>
  );
}
