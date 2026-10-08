"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Subfolder inside the shared `banners` storage bucket (e.g. "hero", "testimonials"). */
  folder: string;
}

/**
 * Uploads directly to Supabase Storage using the signed-in admin's own
 * session — no service-role key involved. The `banners` bucket's storage
 * policy (migrations/007) already restricts writes to staff+, so this is
 * safe even though the upload happens client-side.
 */
export function ImageUploadField({ label, value, onChange, folder }: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("banners").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      setError("Upload failed. You can paste an image URL instead.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-charcoal">{label}</label>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-cream">
            <Image src={value} alt="" fill sizes="80px" className="object-cover" />
          </div>
        )}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or upload"
          className="flex-1"
        />
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} /> {isUploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-blush-deep">{error}</p>}
    </div>
  );
}
