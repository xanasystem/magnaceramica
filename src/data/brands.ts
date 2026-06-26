import type { ImageMetadata } from "astro";

export interface Brand {
  id: string;
  name: string;
  description: string;
  url: string;
  main: ImageMetadata;
  carousel: ImageMetadata[];
  /** Side the terracotta info panel sits on, to alternate layout */
  panel: "left" | "right";
}

// Eagerly import every brand image so they can be optimized by `astro:assets`.
// Keep the data below path-based (single source of truth) and resolve each
// path to its imported `ImageMetadata` via `img()`.
const brandImages = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/brands/**/*.webp",
  { eager: true },
);

function img(path: string): ImageMetadata {
  const mod = brandImages[`../assets/brands/${path}`];
  if (!mod) throw new Error(`Brand image not found: ../assets/brands/${path}`);
  return mod.default;
}

export const brands: Brand[] = [
  {
    id: "baldocer",
    name: "Baldocer",
    description:
      "Baldocer is a leading Spanish ceramic tile manufacturer with more than 30 years of experience, present in over 150 countries. Its collections combine design, technical performance, and a broad product range for residential and commercial projects.",
    url: "https://www.baldocer.com",
    panel: "right",
    main: img("baldocer/main/MagnaCeramica_Royale_Baldocer.webp"),
    carousel: [
      img("baldocer/carousel/MagnaCeramica_Amalfi_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Blanco_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Brera_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Core_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Covent_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Diamonds_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Ginza_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Landart_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Nomad_Baldocer.webp"),
      img("baldocer/carousel/MagnaCeramica_Quartier_Baldocer.webp"),
    ],
  },
  {
    id: "alaplana",
    name: "Alaplana",
    description:
      "Alaplana is a Spanish ceramic tile manufacturer focused on contemporary design, innovation, and versatile ceramic solutions for architecture and interior design. Its collections combine natural-inspired finishes, textures, and formats designed to adapt to residential, commercial, and outdoor projects.",
    url: "https://nuevaalaplana.es",
    panel: "left",
    main: img("alaplana/main/MagnaCeramica_Campaspero_Alaplana.webp"),
    carousel: [
      img("alaplana/carousel/MagnaCeramica_Amalfi_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_Balance_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_Blade_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_Clays_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_Gravina_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_Halton_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_Kingston_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_Lomma_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_Portland_Alaplana.webp"),
      img("alaplana/carousel/MagnaCeramica_SantaMonica_Alaplana.webp"),
    ],
  },
];
