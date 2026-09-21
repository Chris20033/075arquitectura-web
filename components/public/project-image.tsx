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
  const cloudinaryLoader = ({ src, width }: ImageLoaderProps) =>
    src.replace("w_auto", `w_${Math.min(image.width, width)}`);

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
      loader={image.kind === "cloudinary" ? cloudinaryLoader : undefined}
    />
  );
}
