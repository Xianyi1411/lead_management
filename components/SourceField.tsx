"use client";

import { useState, useTransition } from "react";
import { LEAD_SOURCES, SOURCE_LABELS } from "@/lib/domain";
import { addCustomSource } from "@/app/(app)/leads/actions";
import Dropdown from "./Dropdown";

// Source picker with an inline "add a new source" flow (Blueprint §14.7).
// New names are registered server-side (deduped against built-ins and existing
// customs) so the whole team sees them and analytics stay grouped — never free
// text on the lead itself.
export default function SourceField({
  id,
  defaultValue,
  customSources,
  onChange,
}: {
  id: string;
  defaultValue: string;
  /** team-added sources already registered (server-fetched) */
  customSources: string[];
  /** notified on every selection (feeds the live fit score) */
  onChange?: (value: string) => void;
}) {
  const [extras, setExtras] = useState<string[]>(customSources);
  const [selected, setSelected] = useState(defaultValue);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = [
    ...LEAD_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
    ...extras.map((n) => ({ value: n, label: n })),
  ];
  // A lead can reference a custom source from before this render — keep it pickable.
  if (selected && !options.some((o) => o.value === selected)) {
    options.push({ value: selected, label: selected });
  }

  function pick(v: string) {
    setSelected(v);
    onChange?.(v);
  }

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await addCustomSource(newName);
      if (res.error) {
        setError(res.error);
        return;
      }
      const name = res.name!; // the canonical name (may be an existing match)
      setExtras((prev) =>
        prev.includes(name) || (LEAD_SOURCES as readonly string[]).includes(name)
          ? prev
          : [...prev, name]
      );
      pick(name);
      setAdding(false);
      setNewName("");
    });
  }

  return (
    <>
      {/* key remounts the dropdown so a just-added source shows as selected */}
      <Dropdown
        key={`src-${selected}`}
        id={id}
        name="source"
        defaultValue={selected}
        onChange={pick}
        options={options}
      />
      {adding ? (
        <div className="addsrc">
          <input
            value={newName}
            maxLength={30}
            placeholder="e.g. Google Ads"
            aria-label="New source name"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // don't submit the lead form
                add();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending || newName.trim().length < 2}
            onClick={add}
          >
            {pending ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => {
              setAdding(false);
              setNewName("");
              setError(null);
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="addsrc-toggle" onClick={() => setAdding(true)}>
          + Add a new source
        </button>
      )}
      {error && <div className="action-error">{error}</div>}
    </>
  );
}
