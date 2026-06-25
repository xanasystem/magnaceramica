export interface Brand {
  id: string;
  name: string;
  description: string;
  url: string;
  main: string;
  carousel: string[];
  /** Side the terracotta info panel sits on, to alternate layout */
  panel: "left" | "right";
}

export const brands: Brand[] = [
  {
    id: "baldocer",
    name: "Baldocer",
    description:
      "Baldocer is a leading Spanish ceramic tile manufacturer with more than 30 years of experience, present in over 150 countries. Its collections combine design, technical performance, and a broad product range for residential and commercial projects.",
    url: "https://www.baldocer.com",
    panel: "right",
    main: "/img/brands/baldocer/main/MagnaCeramica_Royale_Baldocer.jpg",
    carousel: [
      "/img/brands/baldocer/carousel/MagnaCeramica_Amalfi_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Blanco_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Brera_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Core_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Covent_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Diamonds_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Ginza_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Landart_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Nomad_Baldocer.jpg",
      "/img/brands/baldocer/carousel/MagnaCeramica_Quartier_Baldocer.jpg",
    ],
  },
  {
    id: "alaplana",
    name: "Alaplana",
    description:
      "Alaplana is a Spanish ceramic tile manufacturer focused on contemporary design, innovation, and versatile ceramic solutions for architecture and interior design. Its collections combine natural-inspired finishes, textures, and formats designed to adapt to residential, commercial, and outdoor projects.",
    url: "https://www.alaplana.com",
    panel: "left",
    main: "/img/brands/alaplana/main/MagnaCeramica_Campaspero_Alaplana.jpg",
    carousel: [
      "/img/brands/alaplana/carousel/MagnaCeramica_Amalfi_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_Balance_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_Blade_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_Clays_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_Gravina_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_Halton_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_Kingston_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_Lomma_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_Portland_Alaplana.jpg",
      "/img/brands/alaplana/carousel/MagnaCeramica_SantaMonica_Alaplana.jpg",
    ],
  },
];
