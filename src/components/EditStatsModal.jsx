import { useState } from 'react';
import Modal, { ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import Button from './ui/Button';
import { getPostTitle } from '../utils/posts';

const inputClass = "w-full bg-bg-primary text-sm text-text-primary border border-border-brand/60 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-ui";

const CQ_OPTIONS = [
  { val: 'High', label: 'High (Meaningful Conversations)' },
  { val: 'Medium', label: 'Medium (Relevant Feedback)' },
  { val: 'Low', label: 'Low (Short/Basic Comments)' },
  { val: 'Ina', label: 'Ina (Generic/Bot Emojis)' },
];

export default function EditStatsModal({ post, onClose, onSave }) {
  const [impressions, setImpressions] = useState(post.impressions || 0);
  const [comments, setComments] = useState(post.comments || 0);
  const [likes, setLikes] = useState(post.likes || 0);
  const [profileViews, setProfileViews] = useState(post.profile_views || 0);
  const [dms, setDms] = useState(post.dms || 0);
  const [cq, setCq] = useState(post.cq || 'Medium');
  const [icp, setIcp] = useState(post.icp || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(post.id, {
      impressions: parseInt(impressions) || 0,
      comments: parseInt(comments) || 0,
      likes: parseInt(likes) || 0,
      profile_views: parseInt(profileViews) || 0,
      dms: parseInt(dms) || 0,
      cq: cq || 'Medium',
      icp: icp.trim(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="md">
      <ModalHeader
        title="Update Post Metrics & Quality Audit"
        subtitle={`"${getPostTitle(post)}"`}
        onClose={onClose}
      />
      <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Numerical Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Impressions</label>
            <input
              type="number" min="0" value={impressions}
              onChange={e => setImpressions(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Likes</label>
            <input
              type="number" min="0" value={likes}
              onChange={e => setLikes(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Comments</label>
            <input
              type="number" min="0" value={comments}
              onChange={e => setComments(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Profile Views</label>
            <input
              type="number" min="0" value={profileViews}
              onChange={e => setProfileViews(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">Direct Messages (DMs)</label>
          <input
            type="number" min="0" value={dms}
            onChange={e => setDms(Math.max(0, parseInt(e.target.value) || 0))}
            className={inputClass}
          />
        </div>

        {/* Comment Quality (CQ) */}
        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">Comment Quality (CQ)</label>
          <select
            value={cq}
            onChange={e => setCq(e.target.value)}
            className={`${inputClass} cursor-pointer`}
          >
            {CQ_OPTIONS.map(opt => (
              <option key={opt.val} value={opt.val}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Target ICP */}
        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">Target ICP / Buyer Role</label>
          <input
            type="text"
            value={icp}
            onChange={e => setIcp(e.target.value)}
            placeholder="e.g. Agency Founders, Tech Leads, Service Providers"
            className={inputClass}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Metrics'}</Button>
      </ModalFooter>
    </Modal>
  );
}
