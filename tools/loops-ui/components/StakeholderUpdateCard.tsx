'use client';

// StakeholderUpdateCard: renders the current weekly draft for the
// primary stakeholder. Copy / Edit / Regenerate actions.
// "Regenerate" resets the local edit to the passed-in draft (the
// draft is always recomputed from live loops on render, so edits are
// session-local).

import { useEffect, useState } from 'react';
import { config } from '@/lib/config';

export function StakeholderUpdateCard({ draft }: { draft: string }) {
  const [edited, setEdited] = useState<string>(draft);
  const [copiedAt, setCopiedAt] = useState<number>(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setEdited(draft);
  }, [draft, editing]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(edited);
      setCopiedAt(Date.now());
    } catch {
      /* no-op */
    }
  };

  const regenerate = () => {
    setEdited(draft);
    setEditing(false);
  };

  const copiedRecently = Date.now() - copiedAt < 2000;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.08em] text-ink-ghost">
          {config.stakeholder.name} update — draft
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-[11px] text-ink-soft hover:text-ink bg-inset hover:bg-card px-2.5 py-1 rounded-md border-[0.5px] border-edge hover:border-edge-hover transition-colors"
          >
            {editing ? 'Done editing' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={regenerate}
            className="text-[11px] text-ink-soft hover:text-ink bg-inset hover:bg-card px-2.5 py-1 rounded-md border-[0.5px] border-edge hover:border-edge-hover transition-colors"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={copy}
            className="text-[11px] text-ink bg-inset hover:bg-[var(--mauve)]/10 hover:text-mauve-text px-3 py-1 rounded-md border-[0.5px] border-edge hover:border-[var(--mauve)]/40 transition-colors"
          >
            {copiedRecently ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      {editing ? (
        <textarea
          value={edited}
          onChange={(e) => setEdited(e.target.value)}
          rows={Math.min(24, edited.split('\n').length + 2)}
          className="w-full bg-card border border-edge rounded-lg px-4 py-3 text-[12px] text-ink font-mono leading-relaxed focus:outline-none focus:border-[var(--mauve)]/50"
        />
      ) : (
        <pre className="bg-card border border-edge rounded-lg px-4 py-3 text-[12px] text-ink font-mono leading-relaxed whitespace-pre-wrap">
          {edited}
        </pre>
      )}
    </section>
  );
}
