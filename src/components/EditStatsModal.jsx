import { useState } from 'react';
import Modal, { ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import Button from './ui/Button';
import { getPostTitle } from '../utils/posts';

const inputClass = "w-full bg-bg-primary text-sm text-text-primary border border-border-brand/60 rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-ui";
const selectClass = "w-full bg-bg-primary text-sm text-text-primary border border-border-brand/60 rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-ui cursor-pointer";

const COMMENT_QUALITY_OPTIONS = [
  { value: '', label: 'Not rated' },
  { value: 'surface', label: 'Surface (Likes only)' },
  { value: 'basic', label: 'Basic (Shallow discussion)' },
  { value: 'engaged', label: 'Engaged (Good discussion)' },
  { value: 'deep', label: 'Deep (Meaningful conversation)' },
];

const ICP_OPTIONS = [
  { value: '', label: 'Not tagged' },
  { value: 'founders', label: 'Founders' },
  { value: 'smbs', label: 'SMBs' },
  { value: 'students', label: 'Students' },
  { value: 'service_providers', label: 'Service Providers' },
  { value: 'innovators_builders', label: 'Innovators/Builders' },
  { value: 'random', label: 'Random' },
];

export default function EditStatsModal({ post, onClose, onSave }) {
  const [profileViews, setProfileViews] = useState(post.profile_views || 0);
  const [dms, setDms] = useState(post.dms || 0);
  const [comments, setComments] = useState(post.comments || 0);
  const [likes, setLikes] = useState(post.likes || 0);
  const [impressions, setImpressions] = useState(post.impressions || 0);
  const [commentQuality, setCommentQuality] = useState(post.comment_quality || '');
  const [icpAudience, setIcpAudience] = useState(post.icp_audience || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(post.id, {
      profile_views: parseInt(profileViews) || 0,
      dms: parseInt(dms) || 0,
      comments: parseInt(comments) || 0,
      likes: parseInt(likes) || 0,
      impressions: parseInt(impressions) || 0,
      comment_quality: commentQuality,
      icp_audience: icpAudience,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="md">
      <ModalHeader
        title="Update Post Signal Metrics"
        subtitle={`"${getPostTitle(post)}"`}
        onClose={onClose}
      />
      <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
        {/* Tier 1 Signals */}
        <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 space-y-3">
          <span className="text-xs font-bold text-accent uppercase tracking-wider block">
            Tier 1 Buying Intent Signals (Most Important)
          </span>

          <div>
            <label className="text-xs font-medium text-text-primary mb-1 block">Profile Visits</label>
            <input
              type="number" min="0" value={profileViews}
              onChange={e => setProfileViews(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-primary mb-1 block">Direct Messages (DMs)</label>
            <input
              type="number" min="0" value={dms}
              onChange={e => setDms(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-primary mb-1 block">Comment Quality (CQ)</label>
            <select
              value={commentQuality}
              onChange={e => setCommentQuality(e.target.value)}
              className={selectClass}
            >
              {COMMENT_QUALITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text-primary mb-1 block">Target ICP Audience Tag</label>
            <select
              value={icpAudience}
              onChange={e => setIcpAudience(e.target.value)}
              className={selectClass}
            >
              {ICP_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tier 2 & 3 Signals */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">
            Tier 2 & 3 Metrics (Comments, Likes, Impressions)
          </span>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Comments Volume</label>
            <input
              type="number" min="0" value={comments}
              onChange={e => setComments(Math.max(0, parseInt(e.target.value) || 0))}
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
            <label className="text-xs font-medium text-text-muted mb-1 block">Impressions</label>
            <input
              type="number" min="0" value={impressions}
              onChange={e => setImpressions(Math.max(0, parseInt(e.target.value) || 0))}
              className={inputClass}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Signal Metrics'}</Button>
      </ModalFooter>
    </Modal>
  );
}
