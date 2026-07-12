"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

// Custom form dropdown (DESIGN.md §5) — replaces native <select> app-wide so the
// open menu matches the design system. A hidden input carries the value, so it
// drops into any form. Menu renders position:fixed (never clipped by overflow
// containers or table wrappers); trigger keeps focus, full keyboard support.
export default function Dropdown({
  name,
  options,
  defaultValue = "",
  placeholder,
  prefix,
  id,
  ariaLabel,
  variant = "field",
  compact = false,
  active = false,
  submitOnChange = false,
}: {
  name: string;
  options: DropdownOption[];
  defaultValue?: string;
  /** shown (muted) when nothing is selected */
  placeholder?: string;
  /** always-visible context label, e.g. "Status" → "Status: Qualified" */
  prefix?: string;
  id?: string;
  ariaLabel?: string;
  /** filter = 34px chip in a filter bar; field = full-width form control */
  variant?: "filter" | "field";
  /** 34px height for dense rows */
  compact?: boolean;
  /** applied-filter styling (iris border + tint) */
  active?: boolean;
  /** submit the closest form when an option is picked (filter bars) */
  submitOnChange?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 180, up: false });
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const display = prefix
    ? `${prefix}: ${selected?.label ?? "All"}`
    : selected?.label ?? placeholder ?? "";

  function openMenu() {
    const r = btnRef.current!.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const up = spaceBelow < 300 && r.top > spaceBelow;
    setPos({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: r.width, up });
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(v: string) {
    setValue(v);
    setOpen(false);
    if (submitOnChange && inputRef.current) {
      inputRef.current.value = v; // ensure the value is committed before submit
      inputRef.current.form?.requestSubmit();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)); break;
      case "ArrowUp": e.preventDefault(); setHi((h) => Math.max(0, h - 1)); break;
      case "Home": e.preventDefault(); setHi(0); break;
      case "End": e.preventDefault(); setHi(options.length - 1); break;
      case "Enter":
      case " ": e.preventDefault(); if (options[hi]) choose(options[hi].value); break;
      case "Escape": e.preventDefault(); setOpen(false); break;
      case "Tab": setOpen(false); break;
    }
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      // scrolling inside the menu itself shouldn't close it
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const cls =
    `dd-btn dd-${variant}` +
    (compact ? " dd-compact" : "") +
    (active ? " on" : "");

  return (
    <div className={`dd${variant === "field" ? " dd-block" : ""}`} ref={wrapRef}>
      <input ref={inputRef} type="hidden" name={name} value={value} readOnly />
      <button
        type="button"
        id={id}
        ref={btnRef}
        className={cls}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={!selected && placeholder && !prefix ? "dd-ph" : undefined}>{display}</span>
        <svg viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="dd-pop"
          ref={menuRef}
          style={{
            left: pos.left,
            top: pos.top,
            width: Math.max(pos.width, 180),
            transform: pos.up ? "translateY(-100%)" : undefined,
          }}
          onPointerDown={(e) => e.preventDefault()} /* keep focus on the trigger */
        >
          <ul className="dd-menu" role="listbox" id={listId} aria-activedescendant={`${listId}-${hi}`}>
            {options.map((o, i) => (
              <li
                key={o.value === "" ? "__all" : o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === value}
                className={`dd-opt${i === hi ? " hi" : ""}`}
                onMouseEnter={() => setHi(i)}
                onClick={() => choose(o.value)}
              >
                <span>{o.label}</span>
                {o.value === value && (
                  <svg className="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
