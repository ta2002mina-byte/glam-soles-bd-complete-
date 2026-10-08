"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updateHomepageSection } from "@/app/actions/admin/cms";
import type { HomepageSectionRow } from "@/types/admin";

export function HomepageSectionsPanel({ initialSections }: { initialSections: HomepageSectionRow[] }) {
  const [sections, setSections] = useState(
    [...initialSections].sort((a, b) => a.sortOrder - b.sortOrder)
  );

  async function toggle(section: HomepageSectionRow) {
    const nextActive = !section.isActive;
    setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, isActive: nextActive } : s)));
    const result = await updateHomepageSection(section.id, { isActive: nextActive });
    if (result.status === "error") {
      setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, isActive: !nextActive } : s)));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;

    const a = sections[index];
    const b = sections[target];
    const reordered = [...sections];
    reordered[index] = { ...b, sortOrder: a.sortOrder };
    reordered[target] = { ...a, sortOrder: b.sortOrder };
    reordered.sort((x, y) => x.sortOrder - y.sortOrder);
    setSections(reordered);

    await Promise.all([
      updateHomepageSection(a.id, { sortOrder: b.sortOrder }),
      updateHomepageSection(b.id, { sortOrder: a.sortOrder }),
    ]);
  }

  return (
    <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-soft-white">
      {sections.map((section, index) => (
        <div key={section.id} className="flex items-center gap-3 px-4 py-3">
          <div className="flex flex-col">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={`Move ${section.label} up`}
              className="text-charcoal-soft/60 hover:text-charcoal disabled:opacity-30"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              disabled={index === sections.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`Move ${section.label} down`}
              className="text-charcoal-soft/60 hover:text-charcoal disabled:opacity-30"
            >
              <ArrowDown size={14} />
            </button>
          </div>
          <p className="flex-1 text-sm font-medium text-charcoal">{section.label}</p>
          <Switch checked={section.isActive} onCheckedChange={() => toggle(section)} label={`Show ${section.label}`} />
        </div>
      ))}
    </div>
  );
}
