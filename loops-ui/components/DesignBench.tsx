'use client';

// DesignBench — Mission Control surface for agent specs.
// Kanban columns: Drafting → Ready → Building → Shipped.
// Clicking a card opens the spec in a reader panel (same split-pane
// pattern as ResearchShelf).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SpecDoc, SpecStatus } from '@/lib/types';
import { renderMarkdown, escapeHtml, inlineFormat } from '@/lib/renderMarkdown';

const COLUMNS: { status: SpecStatus; label: string; emptyHint: string }[] = [
  { status: 'drafting', label: 'Drafting', emptyHint: 'Promote research docs to start specs here' },
  { status: 'ready', label: 'Ready', emptyHint: 'Specs ready to decompose into tasks' },
  { status: 'building', label: 'Building', emptyHint: 'Specs with active build tasks' },
  { status: 'shipped', label: 'Shipped', emptyHint: 'Completed specs' },
];

const STATUS_DOT: Record<SpecStatus, string> = {
  drafting: 'bg-tan-fill',
  ready: 'bg-sage-fill',
  building: 'bg-[var(--ocean,#7A9AA0)]',
  shipped: 'bg-ink-ghost',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ─── Main component ───────────────────────────────────────────────

export function DesignBench({
  specs,
  onRefetch,
  onDecomposeViaChat,
  onSpecViaChat,
  onHandoffViaChat,
  onPlanViaChat,
  onFocusSpec,
}: {
  specs: SpecDoc[];
  onRefetch?: () => void;
  onDecomposeViaChat?: (spec: SpecDoc) => void;
  onSpecViaChat?: (spec: SpecDoc) => void;
  onHandoffViaChat?: (spec: SpecDoc) => void;
  onPlanViaChat?: (spec: SpecDoc) => void;
  onFocusSpec?: (spec: SpecDoc) => void;
}) {
  const [decomposing, setDecomposing] = useState<string | null>(null);

  const decomposeSpec = useCallback(async (spec: SpecDoc) => {
    setDecomposing(spec.id);
    try {
      const res = await fetch('/api/vault/specs/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specPath: spec.filePath }),
      });
      const data = await res.json();
      if (res.ok) {
        onRefetch?.();
      } else {
        console.error('Decompose failed:', data.error);
      }
    } catch (err) {
      console.error('Decompose error:', err);
    } finally {
      setDecomposing(null);
    }
  }, [onRefetch]);
  const [openSpec, setOpenSpec] = useState<SpecDoc | null>(null);
  const [splitPct, setSplitPct] = useState(25);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Give HTML artifacts more room
  useEffect(() => {
    if (openSpec?.isHtml) setSplitPct(15);
    else if (openSpec) setSplitPct(25);
  }, [openSpec?.id, openSpec?.isHtml]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.max(15, Math.min(80, pct)));
    };
    const onUp = () => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<SpecStatus, SpecDoc[]>();
    for (const s of specs) {
      const existing = map.get(s.status) || [];
      existing.push(s);
      map.set(s.status, existing);
    }
    return map;
  }, [specs]);

  return (
    <main ref={containerRef} className="flex-1 min-h-0 flex overflow-hidden">
      {/* Kanban */}
      <div
        className="min-h-0 flex flex-col overflow-hidden"
        style={{ width: openSpec ? `${splitPct}%` : '100%', transition: draggingRef.current ? 'none' : 'width 0.2s' }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0">
          <div>
            <h2 className="text-[14px] font-medium text-ink">Design Bench</h2>
            <p className="text-[11px] text-ink-ghost">
              Agent specs. Decompose when ready to build.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-ink-ghost tabular-nums">
              {specs.length} spec{specs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Kanban columns */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 scrollbar-subtle">
          {specs.length === 0 ? (
            <div className="text-[12px] text-ink-ghost italic pt-10 text-center">
              No specs yet. Promote a research doc from the Research shelf.
            </div>
          ) : (
            <div className={`grid gap-4 ${openSpec ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'}`}>
              {COLUMNS.map(({ status, label, emptyHint }) => {
                const items = grouped.get(status) || [];
                return (
                  <div key={status} className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                      <h3 className="text-[11px] font-medium text-ink-soft uppercase tracking-wider">
                        {label}
                      </h3>
                      <span className="text-[10px] text-ink-ghost tabular-nums">{items.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {items.length === 0 ? (
                        <div className="text-[10px] text-ink-ghost italic py-4 px-2 border border-dashed border-edge-subtle rounded-lg text-center">
                          {emptyHint}
                        </div>
                      ) : (
                        items.map((spec) => (
                          <SpecCard
                            key={spec.id}
                            spec={spec}
                            isActive={openSpec?.id === spec.id}
                            isDecomposing={decomposing === spec.id}
                            onOpen={() => setOpenSpec(spec)}
                            onDecompose={() => decomposeSpec(spec)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Drag handle + Reader */}
      {openSpec && (
        <>
          <div
            className="w-1.5 shrink-0 cursor-col-resize group flex items-center justify-center hover:bg-edge/40 active:bg-edge/60 transition-colors"
            onMouseDown={onDragStart}
            title="Drag to resize"
          >
            <div className="w-[3px] h-8 rounded-full bg-edge group-hover:bg-ink-ghost group-active:bg-ink-soft transition-colors" />
          </div>
          <SpecReader
            spec={openSpec}
            onClose={() => setOpenSpec(null)}
            onDecompose={onDecomposeViaChat ? () => onDecomposeViaChat(openSpec) : undefined}
            onSpec={onSpecViaChat ? () => onSpecViaChat(openSpec) : undefined}
            onHandoff={onHandoffViaChat ? () => onHandoffViaChat(openSpec) : undefined}
            onPlan={onPlanViaChat ? () => onPlanViaChat(openSpec) : undefined}
            onFocus={onFocusSpec ? () => onFocusSpec(openSpec) : undefined}
          />
        </>
      )}
    </main>
  );
}

// ─── Spec card ────────────────────────────────────────────────────

function SpecCard({
  spec,
  isActive,
  isDecomposing,
  onOpen,
  onDecompose,
}: {
  spec: SpecDoc;
  isActive: boolean;
  isDecomposing: boolean;
  onOpen: () => void;
  onDecompose: () => void;
}) {
  return (
    <div
      className={`group bg-card border rounded-lg p-3 hover:border-edge-hover transition-colors cursor-pointer ${
        isActive ? 'border-[var(--sage)] bg-sage-fill/20' : 'border-edge'
      }`}
      onClick={onOpen}
    >
      <h4 className="text-[12px] font-medium text-ink leading-tight mb-1.5 line-clamp-2">
        {spec.title}
      </h4>

      {/* Metadata */}
      <div className="flex items-center gap-2 text-[10px] text-ink-ghost flex-wrap">
        <span>{spec.createdAt}</span>
        <span>{formatSize(spec.sizeBytes)}</span>
        {spec.effortEstimate && (
          <span className="px-1 py-[1px] rounded bg-inset">{spec.effortEstimate}</span>
        )}
        {spec.linkedLoopCount > 0 && (
          <span className="px-1 py-[1px] rounded bg-sage-fill text-sage-text">
            {spec.linkedLoopCount} loop{spec.linkedLoopCount !== 1 ? 's' : ''}
          </span>
        )}
        {spec.openQuestions.length > 0 && (
          <span className="px-1 py-[1px] rounded bg-tan-fill text-tan-text">
            {spec.openQuestions.length} question{spec.openQuestions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Source research links */}
      {spec.sourceResearch.length > 0 && (
        <div className="mt-1.5 text-[9px] text-ink-ghost truncate">
          from: {spec.sourceResearch.map((r) => r.split('/').pop()?.replace(/\.md$/, '')).join(', ')}
        </div>
      )}

      {/* Decompose action — available on drafting and ready specs */}
      {(spec.status === 'drafting' || spec.status === 'ready') && (
        <div className="mt-2 pt-2 border-t border-edge-subtle">
          <button
            type="button"
            disabled={isDecomposing}
            className="text-[10px] text-ink-soft hover:text-ink hover:bg-sage-fill hover:text-sage-text px-2 py-0.5 rounded-md border border-transparent hover:border-[var(--sage)]/40 transition-colors disabled:opacity-50"
            title="Extract tasks from Requirements/Decomposition and create build loops"
            onClick={(e) => { e.stopPropagation(); onDecompose(); }}
          >
            {isDecomposing ? 'Decomposing...' : 'Decompose'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Spec reader ──────────────────────────────────────────────────

function SpecReader({
  spec,
  onClose,
  onDecompose,
  onSpec,
  onHandoff,
  onPlan,
  onFocus,
}: {
  spec: SpecDoc;
  onClose: () => void;
  onDecompose?: () => void;
  onSpec?: () => void;
  onHandoff?: () => void;
  onPlan?: () => void;
  onFocus?: () => void;
}) {
  const [filePath, setFilePath] = useState(spec.filePath);
  const [title, setTitle] = useState(spec.title);
  const [content, setContent] = useState<string | null>(null);
  const [isHtml, setIsHtml] = useState(spec.isHtml ?? false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setFilePath(spec.filePath);
    setTitle(spec.title);
    setIsHtml(spec.isHtml ?? false);
    setHistory([]);
    setEditing(false);
    setDirty(false);
  }, [spec.filePath, spec.title, spec.isHtml]);

  useEffect(() => {
    setLoading(true);
    setContent(null);
    const params = new URLSearchParams({ file: filePath });
    fetch(`/api/vault/read?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content || '');
        setIsHtml(data.isHtml ?? filePath.endsWith('.html'));
        setLoading(false);
        scrollRef.current?.scrollTo(0, 0);
        if (filePath !== spec.filePath && data.content) {
          const h1 = data.content.match(/^#\s+(.+)$/m);
          if (h1) setTitle(h1[1].trim());
          else setTitle(filePath.split('/').pop()?.replace(/\.(md|html)$/, '') || filePath);
        }
      })
      .catch(() => {
        setContent('Failed to load spec.');
        setLoading(false);
      });
  }, [filePath, spec.filePath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) { setEditing(false); setDirty(false); }
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, editing]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[data-vault-link]') as HTMLAnchorElement | null;
    if (link) {
      e.preventDefault();
      const vaultPath = link.getAttribute('data-vault-link');
      if (vaultPath) {
        setHistory((prev) => [...prev, filePath]);
        setFilePath(vaultPath);
      }
    }
  }, [filePath]);

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setFilePath(prev);
    }
  }, [history]);

  const startEditing = useCallback(() => {
    setEditBuffer(content || '');
    setEditing(true);
    setDirty(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [content]);

  const saveEdit = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/vault/write', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: filePath, content: editBuffer }),
      });
      setContent(editBuffer);
      setEditing(false);
      setDirty(false);
    } catch {
      console.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [filePath, editBuffer]);

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-surface">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-edge shrink-0">
        {history.length > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="text-ink-ghost hover:text-ink text-[12px] px-1.5 py-0.5 rounded hover:bg-inset transition-colors"
            title="Back to previous document"
          >
            ←
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-medium text-ink truncate">{title}</h3>
          <div className="text-[10px] text-ink-ghost mt-0.5 flex items-center gap-2">
            <span>{filePath}</span>
            <span className={`px-1.5 py-[1px] rounded-full ${STATUS_DOT[spec.status]} text-ink`}>
              {spec.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Focus — always available, any stage */}
          {onFocus && spec.status !== 'shipped' && (
            <button
              type="button"
              onClick={onFocus}
              className="text-[10px] font-medium text-ink bg-inset hover:bg-edge px-2.5 py-1 rounded-md border border-edge hover:border-edge-hover transition-colors"
              title="Focus on this spec — switch to Focus mode and add to calendar"
            >
              Focus
            </button>
          )}

          {/* Pipeline buttons — all visible, flow through stages */}
          {spec.status !== 'shipped' && (
            <>
              {onPlan && (
                <button
                  type="button"
                  onClick={onPlan}
                  className="text-[10px] font-medium text-[var(--sand,#C5B39A)] bg-[var(--sand,#C5B39A)]/10 hover:bg-[var(--sand,#C5B39A)]/15 px-2.5 py-1 rounded-md border border-[var(--sand,#C5B39A)]/20 hover:border-[var(--sand,#C5B39A)]/40 transition-colors"
                  title="Research and structure this goal into a plan"
                >
                  /plan
                </button>
              )}

              {onSpec && (
                <button
                  type="button"
                  onClick={onSpec}
                  className="text-[10px] font-medium text-[var(--ocean,#7A9AA0)] bg-[var(--ocean,#7A9AA0)]/10 hover:bg-[var(--ocean,#7A9AA0)]/15 px-2.5 py-1 rounded-md border border-[var(--ocean,#7A9AA0)]/20 hover:border-[var(--ocean,#7A9AA0)]/40 transition-colors"
                  title="Search vault for context, ask goals, and flesh out this spec"
                >
                  /spec
                </button>
              )}

              {onDecompose && (
                <button
                  type="button"
                  onClick={onDecompose}
                  className="text-[10px] font-medium text-[var(--mauve)] bg-mauve-fill hover:bg-mauve-fill/70 px-2.5 py-1 rounded-md border border-[var(--mauve)]/20 hover:border-[var(--mauve)]/40 transition-colors"
                  title="Decompose this spec into tasks via Claude"
                >
                  /decompose
                </button>
              )}

              {onHandoff && spec.linkedLoopCount > 0 && (
                <button
                  type="button"
                  onClick={onHandoff}
                  className="text-[10px] font-medium text-sage-text bg-sage-fill hover:bg-sage-fill/70 px-2.5 py-1 rounded-md border border-[var(--sage)]/20 hover:border-[var(--sage)]/40 transition-colors"
                  title="Hand off to an isolated agent for implementation"
                >
                  /handoff
                </button>
              )}
            </>
          )}

          <span className="text-[9px] text-ink-ghost ml-1">{editing ? 'esc cancel' : 'esc close'}</span>
          <button
            type="button"
            onClick={() => { if (editing) { setEditing(false); setDirty(false); } else onClose(); }}
            className="text-ink-ghost hover:text-ink text-[14px] px-1.5 py-0.5 rounded hover:bg-inset transition-colors"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {/* Content */}
      {isHtml && content ? (
        <iframe
          srcDoc={content}
          className="flex-1 min-h-0 w-full border-none"
          sandbox="allow-scripts allow-same-origin"
          title={title}
        />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4 scrollbar-subtle"
          onClick={editing ? undefined : handleContentClick}
        >
          {loading ? (
            <div className="text-[11px] text-ink-ghost animate-pulse pt-4">Loading...</div>
          ) : editing ? (
            <textarea
              ref={textareaRef}
              value={editBuffer}
              onChange={(e) => { setEditBuffer(e.target.value); setDirty(true); }}
              onKeyDown={(e) => {
                if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (dirty) saveEdit();
                }
              }}
              className="w-full h-full text-[12px] text-ink font-mono leading-relaxed bg-transparent border-none outline-none resize-none"
              spellCheck={false}
            />
          ) : content ? (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
          ) : (
            <div className="text-[11px] text-ink-ghost italic pt-4">Empty spec.</div>
          )}
        </div>
      )}
    </div>
  );
}
