"use client";

import Image, { type ImageLoaderProps } from "next/image";

import type { PublicProjectImage } from "@/lib/public/project-images";

type ProjectImageProps = {
  image: PublicProjectImage;
  className?: string;
  sizes: string;
  priority?: boolean;
  fill?: boolean;
};

export function ProjectImage({
  image,
  className,
  sizes,
  priority = false,
  fill = false,
}: ProjectImageProps) {
  const managedLoader = ({ src, width }: ImageLoaderProps) => {
    const variant =
      image.variants.find((candidate) => candidate.width >= width) ??
      image.variants.at(-1);
    return variant ? src.replace("__variant__", variant.name) : src;
  };

  return (
    <Image
      className={className}
      src={image.src}
      alt={image.alt}
      width={fill ? undefined : image.width}
      height={fill ? undefined : image.height}
      fill={fill}
      sizes={sizes}
      priority={priority}
      loader={image.kind === "managed" ? managedLoader : undefined}
    />
  );
}
