const STORAGE_KEY = 'cms_posts';

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function sortPosts(list, orders) {
  if (!orders || orders.length === 0) return list;
  return list.sort((a, b) => {
    for (const { key, asc, nullsFirst } of orders) {
      const va = a[key], vb = b[key];
      if (va == null && vb == null) continue;
      if (va == null) return nullsFirst ? -1 : 1;
      if (vb == null) return nullsFirst ? 1 : -1;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      if (cmp !== 0) return asc ? cmp : -cmp;
    }
    return 0;
  });
}

export const storage = {
  getAll() {
    return getAll();
  },

  getById(id) {
    return getAll().find(p => p.id === id) || null;
  },

  query(filters = {}) {
    let posts = getAll();
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'status_eq' && value != null) {
        posts = posts.filter(p => p.status === value);
      } else if (key === 'status_in' && Array.isArray(value)) {
        posts = posts.filter(p => value.includes(p.status));
      } else if (key === 'status_not_null' && value) {
        posts = posts.filter(p => p.status != null);
      } else if (key === 'published_at_not_null' && value) {
        posts = posts.filter(p => p.published_at != null);
      } else if (key === 'published' && value) {
        posts = posts.filter(p => p.status === 'published' || p.published_at != null);
      } else if (key === 'calendar_date_eq' && value != null) {
        posts = posts.filter(p => p.calendar_date === value);
      } else if (key === 'calendar_date_not_null' && value) {
        posts = posts.filter(p => p.calendar_date != null);
      }
    }
    return posts;
  },

  insert(data) {
    const posts = getAll();
    const now = new Date().toISOString();
    const post = { ...data, id: data.id || genId(), created_at: data.created_at || now, updated_at: now };
    posts.unshift(post);
    saveAll(posts);
    return post;
  },

  update(id, data) {
    const posts = getAll();
    const idx = posts.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const updated = { ...posts[idx], ...data, updated_at: new Date().toISOString() };
    posts[idx] = updated;
    saveAll(posts);
    return updated;
  },

  delete(id) {
    const posts = getAll().filter(p => p.id !== id);
    saveAll(posts);
  },

  deleteAll() {
    saveAll([]);
  },
};
