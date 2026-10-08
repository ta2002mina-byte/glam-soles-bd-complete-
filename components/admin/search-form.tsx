import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function AdminSearchForm({
  defaultValue,
  placeholder,
  extraParams,
}: {
  defaultValue?: string;
  placeholder: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <form className="relative max-w-sm flex-1" method="get">
      {Object.entries(extraParams ?? {}).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null
      )}
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-soft" aria-hidden="true" />
      <Input type="search" name="q" defaultValue={defaultValue} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </form>
  );
}
