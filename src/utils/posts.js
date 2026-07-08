export function getPostTitle(post) {
  if (!post) return 'Untitled';
  if (post.hook_idea) return post.hook_idea;
  if (post.raw_idea) return post.raw_idea;
  const firstLine = post.draft?.split('\n').find(l => l.trim());
  if (firstLine) return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
  return 'Untitled';
}
