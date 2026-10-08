"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Loader2, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { submitReview } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import type { ReviewEligibility } from "@/lib/supabase/queries";

const SIZE_FEEDBACK_OPTIONS = ["Runs small", "True to size", "Runs large"];
const MAX_PHOTOS = 4;

export function ReviewForm({
  productId,
  productSlug,
  eligibility,
}: {
  productId: string;
  productSlug: string;
  eligibility: ReviewEligibility;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [sizeFeedback, setSizeFeedback] = useState("");
  const [photos, setPhotos] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  if (!eligibility.isSignedIn) {
    return (
      <p className="rounded-[var(--radius-card)] bg-cream/60 p-4 text-sm text-charcoal-soft">
        <Link href="/account" className="font-medium text-charcoal underline underline-offset-2">
          Sign in
        </Link>{" "}
        to write a review.
      </p>
    );
  }

  if (eligibility.hasReviewed || result === "success") {
    return (
      <p className="rounded-[var(--radius-card)] bg-cream/60 p-4 text-sm text-charcoal-soft">
        Thanks — your review has been submitted and is awaiting approval.
      </p>
    );
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      for (const file of files) {
        const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("reviews").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) continue;
        const { data: publicUrl } = supabase.storage.from("reviews").getPublicUrl(path);
        setPhotos((prev) => [...prev, { url: publicUrl.publicUrl, path }]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removePhoto(path: string) {
    setPhotos((prev) => prev.filter((p) => p.path !== path));
    const supabase = createClient();
    await supabase.storage.from("reviews").remove([path]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // duplicate-click prevention
    if (rating === 0) {
      setResult("error");
      setErrorMessage("Please choose a star rating.");
      return;
    }

    setSubmitting(true);
    setResult(null);
    const res = await submitReview({
      productId,
      productSlug,
      rating,
      body,
      sizeFeedback,
      photoUrls: photos.map((p) => p.url),
    });
    setSubmitting(false);

    if (res.status === "success") {
      setResult("success");
    } else if (res.status === "duplicate") {
      setResult("error");
      setErrorMessage("You've already reviewed this product.");
    } else if (res.status === "unauthenticated") {
      setResult("error");
      setErrorMessage("Please sign in to submit a review.");
    } else {
      setResult("error");
      setErrorMessage(res.status === "error" ? res.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[var(--radius-card)] bg-cream/60 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Your rating</p>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                size={24}
                className={cn(
                  (hoverRating || rating) >= star ? "fill-gold text-gold" : "fill-transparent text-line"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-body" className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">
          Your review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-2 w-full rounded-[var(--radius-card)] border border-line bg-soft-white p-3 text-sm text-charcoal outline-none focus-visible:border-gold"
          placeholder="What did you think of the fit, comfort and quality?"
        />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Fit</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SIZE_FEEDBACK_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSizeFeedback(option === sizeFeedback ? "" : option)}
              className={cn(
                "rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs",
                sizeFeedback === option ? "border-charcoal bg-charcoal text-soft-white" : "border-line text-charcoal-soft"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Photos (optional)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.path} className="relative h-16 w-16 overflow-hidden rounded-[var(--radius-card)]">
              <Image src={photo.url} alt="" fill sizes="64px" className="object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(photo.path)}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/80 text-soft-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line text-charcoal-soft">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handlePhotoChange}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      {result === "error" && (
        <p role="alert" className="text-sm text-blush-deep">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={submitting || uploading}>
        {submitting ? <Loader2 size={16} className="animate-spin" /> : "Submit Review"}
      </Button>
    </form>
  );
}
