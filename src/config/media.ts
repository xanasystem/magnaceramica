/**
 * Media configuration
 * -------------------------------------------------------------
 * Heavy files (videos) are served from Cloudflare R2, NOT bundled
 * in the repo. To swap the bucket or add a custom domain later,
 * only change R2_BASE.
 *
 * Upload the matching files to the bucket with these exact names.
 */
export const R2_BASE = "https://pub-b7e9a4dc61384ccaa77d47ef1c1910cb.r2.dev/";

export const media = {
  /** Hero background video — uploaded ✓ */
  headerVideo: `${R2_BASE}magna-video-slide.mp4`,
  /** Experience band video — pending upload to R2 (same bucket) */
  experienceVideo: `${R2_BASE}magna-video-experiencia.mp4`,
} as const;
