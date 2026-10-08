"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItemData {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItemData[];
  defaultOpenId?: string;
  className?: string;
}

/** Simple, dependency-free accordion. One panel open at a time, fully keyboard-accessible via native <button>. */
export function Accordion({ items, defaultOpenId, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? items[0]?.id ?? null);

  return (
    <div className={cn("divide-y divide-line border-t border-b border-line", className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `accordion-panel-${item.id}`;
        const buttonId = `accordion-trigger-${item.id}`;

        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-charcoal"
              >
                {item.title}
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={cn("shrink-0 text-charcoal-soft transition-transform", isOpen && "rotate-180")}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-4 text-sm leading-relaxed text-charcoal-soft"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
