"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { X, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder: string;
  max?: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_MB = 8;

/**
 * Uploads directly to the `products` Supabase Storage bucket from the
 * browser using the signed-in admin's own session — authorized by the
 * `catalog_images_manager_write` storage policy (migration 013), never
 * a service-role key. Resulting public URLs are appended to the
 * product's `images` array by the parent form.
 */
export function ImageUploader({ images, onChange, folder, max = 12 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = max - images.length;
    if (remaining <= 0) {
      setError(`You can add up to ${max} images.`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const supabase = createClient();
    const uploaded: string[] = [];

    for (const file of toUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Only JPEG, PNG, WebP, or AVIF images are allowed.");
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Images must be under ${MAX_SIZE_MB}MB.`);
        continue;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("products").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        setError("One or more images failed to upload. Please try again.");
        continue;
      }

      const { data } = supabase.storage.from("products").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }

    if (uploaded.length > 0) onChange([...images, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(url: string) {
    onChange(images.filter((img) => img !== url));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((url) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-lg border border-line bg-cream">
            <Image src={url} alt="" fill sizes="96px" className="object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal/80 text-soft-white"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-charcoal-soft hover:bg-cream disabled:opacity-50"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span className="text-xs">{uploading ? "Uploading…" : "Add image"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-xs text-blush-deep">{error}</p>}
    </div>
  );
}

export function ImageUrlFallbackButton({ onAdd }: { onAdd: (url: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Or paste an image URL"
        className="h-9 flex-1 rounded-lg border border-line bg-soft-white px-3 text-sm"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (!value.trim()) return;
          onAdd(value.trim());
          setValue("");
        }}
      >
        Add
      </Button>
    </div>
  );
}
