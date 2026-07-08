import { useState } from 'react';
import Modal, { ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import Button from './ui/Button';
import { getPostTitle } from '../utils/posts';

const inputClass = "w-full bg-bg-primary text-sm text-text-primary border border-border-brand/60 rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-ui";

export default function EditStatsModal({ post, onClose, onSave }) {
  const [impressions, setImpressions] = useState(post.impressions || 0);
  const [comments, setComments] = useState(post.comments || 0);
  const [likes, setLikes] = useState(post.likes || 0);
  const [profileViews, setProfileViews] = useState(post.profile_views || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(post.id, {
      impressions: parseInt(impressions) || 0,
      comments: parseInt(comments) || 0,
      likes: parseInt(likes) || 0,
      profile_views: parseInt(profileViews) || 0,
    });
    setSaving(false);
    onClose();
  };

  const fields = [
    { label: 'Impressions', val: impressions, set: setImpressions },
    { label: 'Comments', val: comments, set: setComments },
    { label: 'Likes', val: likes, set: setLikes },
    { label: 'Profile views', val: profileViews, set: setProfileViews },
  ];

  return (
    <Modal open onClose={onClose} size="md">
      <ModalHeader
        title="Update metrics"
        subtitle={`"${getPostTitle(post)}"`}
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        {fields.map(f => (
          <div key={f.label}>
            <label className="text-xs font-medium text-text-muted mb-1.5 block">{f.label}</label>
            <input
              type="number" min="0" value={f.val}
              onChange={e => f.set(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass}
            />
          </div>
        ))}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save metrics'}</Button>
      </ModalFooter>
    </Modal>
  );
}
