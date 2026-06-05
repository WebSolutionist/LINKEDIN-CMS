import Modal, { ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import Button from './ui/Button';
import PropertyPill from './ui/PropertyPill';
import PillarBadge from './PillarBadge';

export default function PostDetailModal({ post, onClose, onDelete, onEdit }) {
  const formatDate = (dateStr) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

  const title = post.hook_idea || post.raw_idea || 'Untitled';
  const draftPreview = post.draft ? post.draft.substring(0, 300) : null;

  return (
    <Modal open onClose={onClose} size="lg">
      <ModalHeader
        title={title}
        subtitle={post.calendar_date ? formatDate(post.calendar_date) : 'Not scheduled'}
        onClose={onClose}
      />

      <div className="px-6 py-3 border-b border-border-brand/40 flex flex-wrap items-center gap-3">
        <PropertyPill label={post.status} dot />
        {post.format && <PropertyPill label={post.format} />}
        {post.pillar && <PillarBadge pillar={post.pillar} size="lg" />}
      </div>

      <ModalBody className="space-y-5">
        {post.angle && (
          <div>
            <p className="text-xs font-medium text-text-muted mb-1">Angle</p>
            <p className="text-sm text-text-primary leading-relaxed">{post.angle}</p>
          </div>
        )}
        {post.cta && (
          <div>
            <p className="text-xs font-medium text-text-muted mb-1">Call to action</p>
            <p className="text-sm text-text-primary leading-relaxed">{post.cta}</p>
          </div>
        )}
        {draftPreview && (
          <div>
            <p className="text-xs font-medium text-text-muted mb-2">Draft preview</p>
            <div className="bg-bg-primary/60 border border-border-brand/30 rounded-xl p-4">
              <p className="text-sm text-text-secondary leading-relaxed italic whitespace-pre-wrap">
                {draftPreview}{post.draft.length > 300 ? '...' : ''}
              </p>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
        <Button onClick={onEdit}>Edit in Writing Room</Button>
      </ModalFooter>
    </Modal>
  );
}
