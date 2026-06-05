import { useState } from 'react';
import Modal, { ModalHeader, ModalBody, ModalFooter } from './ui/Modal';
import Button from './ui/Button';

const FORMATS = ['Story Post', 'Educational Post', 'Case Study', 'Opinion Post', 'Contrarian Post', 'Offer Post'];
const PILLARS = ['Website Reality', 'Strategic Reframe', 'Web Solution Thinking', 'Personal Reflection', 'Soft Positioning'];

const selectClass = "w-full bg-bg-primary text-sm text-text-primary border border-border-brand/60 rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-ui cursor-pointer appearance-none";
const inputClass = "w-full bg-bg-primary text-sm text-text-primary border border-border-brand/60 rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-ui placeholder:text-text-muted";
const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;

export default function CalendarEditModal({ date, entry, onClose, onSave }) {
  const [hookIdea, setHookIdea] = useState(entry?.hook_idea || '');
  const [format, setFormat] = useState(entry?.format || '');
  const [pillar, setPillar] = useState(entry?.pillar || '');
  const [angle, setAngle] = useState(entry?.angle || '');
  const [cta, setCta] = useState(entry?.cta || '');
  const [saving, setSaving] = useState(false);

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleSave = async () => {
    setSaving(true);
    await onSave({ calendar_date: date, hook_idea: hookIdea, format, pillar, angle, cta, status: 'scheduled' });
    setSaving(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg">
      <ModalHeader title="Schedule post" subtitle={formattedDate} onClose={onClose} />

      <ModalBody className="space-y-4">
        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">Hook / topic</label>
          <input value={hookIdea} onChange={e => setHookIdea(e.target.value)} placeholder="What's this post about?" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1.5 block">Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} className={selectClass}
              style={{ backgroundImage: chevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}>
              <option value="">Select format</option>
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1.5 block">Pillar</label>
            <select value={pillar} onChange={e => setPillar(e.target.value)} className={selectClass}
              style={{ backgroundImage: chevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}>
              <option value="">Select pillar</option>
              {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">Angle</label>
          <input value={angle} onChange={e => setAngle(e.target.value)} placeholder="Narrative angle" className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">Call to action</label>
          <input value={cta} onChange={e => setCta(e.target.value)} placeholder="What should they do after reading?" className={inputClass} />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save to calendar'}</Button>
      </ModalFooter>
    </Modal>
  );
}
