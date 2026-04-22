'use client';

import { useCallback, useState } from 'react';
import type { Loop } from '@/lib/types';
import { P_LEVEL_OPTIONS, DIFFICULTY_OPTIONS } from '@/lib/ui';

export function LoopForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Loop>;
  onSave: (patch: Partial<Loop>) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial.text ?? '');
  const [pLevel, setPLevel] = useState(initial.pLevel ?? '');
  const [difficulty, setDifficulty] = useState<number | ''>(initial.difficulty ?? '');
  const [minutes, setMinutes] = useState<number | ''>(initial.timeEstimateMinutes ?? '');

  const handleSave = useCallback(() => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    onSave({
      text: text.trim(),
      pLevel: pLevel || null,
      difficulty: difficulty === '' ? null : Number(difficulty),
      timeEstimateMinutes: minutes === '' ? null : Number(minutes),
    });
  }, [text, pLevel, difficulty, minutes, onSave, onCancel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="task text"
        className="w-full bg-card border border-edge rounded-md px-2 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-[var(--slate)] focus:border-[var(--slate)]"
      />
      <div className="flex items-center gap-1.5 text-[10px] font-mono">
        <input
          list="plevel-options"
          value={pLevel}
          onChange={(e) => setPLevel(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={handleSave}
          placeholder="P-level"
          className="w-24 bg-card border border-edge rounded-md px-1.5 py-0.5 text-ink focus:outline-none focus:ring-1 focus:ring-[var(--slate)]"
        />
        <datalist id="plevel-options">
          {P_LEVEL_OPTIONS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value === '' ? '' : Number(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={handleSave}
          className="bg-card border border-edge rounded-md px-1.5 py-0.5 text-ink focus:outline-none focus:ring-1 focus:ring-[var(--slate)]"
        >
          <option value="">D:?</option>
          {DIFFICULTY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              D:{d}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value === '' ? '' : Number(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={handleSave}
          placeholder="min"
          className="w-16 bg-card border border-edge rounded-md px-1.5 py-0.5 text-ink focus:outline-none focus:ring-1 focus:ring-[var(--slate)]"
        />
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleSave}
            className="px-2 py-0.5 rounded-md bg-slate-fill text-slate-text hover:bg-[var(--slate)]/20"
          >
            save
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-0.5 rounded-md text-ink-ghost hover:text-ink-soft"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
