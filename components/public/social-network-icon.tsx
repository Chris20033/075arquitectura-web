import type { SocialNetwork } from "@/lib/social-networks";

type SocialNetworkIconProps = {
  platform: SocialNetwork;
  className?: string;
};

export function SocialNetworkIcon({
  platform,
  className,
}: SocialNetworkIconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
    focusable: false,
  } as const;

  if (platform === "INSTAGRAM") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.3" cy="6.7" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (platform === "FACEBOOK") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M13.6 21v-8h2.7l.4-3.1h-3.1V7.92c0-.9.25-1.51 1.56-1.51H16.8V3.63a22 22 0 0 0-2.42-.13c-2.4 0-4.05 1.47-4.05 4.17V9.9H7.6V13h2.73v8h3.27Z" />
      </svg>
    );
  }
  if (platform === "LINKEDIN") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M5.2 8.2A1.9 1.9 0 1 0 5.2 4.4a1.9 1.9 0 0 0 0 3.8ZM3.6 9.7h3.2V20H3.6V9.7ZM8.8 9.7h3.05v1.4h.05c.42-.8 1.46-1.66 3-1.66 3.2 0 3.8 2.1 3.8 4.84V20h-3.18v-5.07c0-1.2-.02-2.75-1.68-2.75-1.68 0-1.94 1.31-1.94 2.66V20H8.8V9.7Z" />
      </svg>
    );
  }
  if (platform === "PINTEREST") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M12 3.25a8.75 8.75 0 0 0-3.2 16.9c-.08-1.44-.02-3.17.35-4.75l1.05-4.44s-.26-.52-.26-1.3c0-1.22.7-2.13 1.58-2.13.74 0 1.1.56 1.1 1.22 0 .75-.47 1.86-.72 2.9-.2.87.44 1.58 1.3 1.58 1.57 0 2.62-2.02 2.62-4.41 0-1.82-1.23-3.18-3.47-3.18-2.53 0-4.1 1.89-4.1 4 0 .73.22 1.24.56 1.64.15.18.17.25.11.46l-.18.72c-.06.23-.24.31-.44.22-1.22-.5-1.79-1.85-1.79-3.36 0-2.5 2.1-5.5 6.26-5.5 3.35 0 5.56 2.42 5.56 5.02 0 3.44-1.92 6.02-4.75 6.02-.95 0-1.84-.51-2.14-1.08l-.58 2.23c-.41 1.59-1.23 3.17-1.98 4.38.91.27 1.87.42 2.87.42A8.75 8.75 0 0 0 12 3.25Z" />
      </svg>
    );
  }
  if (platform === "TIKTOK") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M15.4 3.4c.3 2.16 1.52 3.45 3.6 3.59v3.04a8.1 8.1 0 0 1-3.55-1.05v6.2c0 3.92-4.27 6.27-7.55 4.16-2.11-1.36-2.86-4.3-1.64-6.56 1.14-2.12 3.95-3.16 6.1-2.16v3.2c-.36-.12-.74-.18-1.13-.16-1.13.08-1.94 1.1-1.74 2.22.25 1.45 2.02 1.92 2.94.83.24-.29.37-.66.37-1.04V3.4h2.6Z" />
      </svg>
    );
  }
  if (platform === "BEHANCE") {
    return (
      <svg {...common} fill="currentColor">
        <path
          d="M4 5h5.5c3.37 0 4.87 1.8 4.87 3.78 0 1.7-.95 2.72-2.1 3.16 1.55.44 2.63 1.54 2.63 3.55C14.9 18.1 13.02 20 9.36 20H4V5Zm3.32 2.62v3h1.91c1.2 0 1.86-.5 1.86-1.5 0-1-.65-1.5-1.86-1.5H7.32Zm0 5.56v4.16H9.5c1.42 0 2.1-.7 2.1-2.08 0-1.37-.7-2.08-2.1-2.08H7.32ZM16.3 8.12h3.48v1.35H16.3V8.12Zm-.64 2.7h4.5c2.74 0 4.34 1.9 4.34 4.6 0 .3-.02.75-.07 1.05h-5.62c.18 1.12.91 1.7 2.03 1.7.86 0 1.49-.35 1.77-1.03h1.94c-.53 1.85-2.15 2.98-4.15 2.98-2.72 0-4.73-1.97-4.73-4.69 0-2.74 1.9-4.61 4.48-4.61 2.94 0 4.4 2.1 4.4 4.81v.54h-6.3c.15 1.2.94 1.88 2.09 1.88.77 0 1.35-.33 1.66-.93h-2.33v-1.3h3.84c-.3-1.1-1.04-1.7-2.13-1.7-1.35 0-2.2.94-2.2 2.46v.03h-2.12v-.08c0-2.69 1.77-4.6 4.37-4.6h.03v-1.5h-4.5v-1.35Z"
          transform="translate(-.4 0) scale(.9)"
        />
      </svg>
    );
  }
  if (platform === "HOUZZ") {
    return (
      <svg {...common} fill="currentColor">
        <path d="m5 4 7 4.05L19 4v5.05l-7 4.05-7-4.05V4Zm0 7 7 4.05 7-4.05V16l-7 4-7-4v-5Z" />
      </svg>
    );
  }
  if (platform === "YOUTUBE") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M21.58 7.19a2.8 2.8 0 0 0-1.97-1.98C17.87 4.75 12 4.75 12 4.75s-5.87 0-7.61.46A2.8 2.8 0 0 0 2.42 7.2C1.96 8.94 1.96 12 1.96 12s0 3.06.46 4.81a2.8 2.8 0 0 0 1.97 1.98c1.74.46 7.61.46 7.61.46s5.87 0 7.61-.46a2.8 2.8 0 0 0 1.97-1.98c.46-1.75.46-4.81.46-4.81s0-3.06-.46-4.81ZM10.1 15.04V8.96L15.4 12l-5.3 3.04Z" />
      </svg>
    );
  }
  if (platform === "X") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M18.9 3h2.84l-6.2 7.08L22.83 21h-5.7l-4.46-6.43L7.05 21H4.2l6.63-7.58L3.84 3h5.85l4.03 5.86L18.9 3Zm-1 16.2h1.58L8.83 4.72H7.14L17.9 19.2Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        d="M7.5 12h9M12 7.5v9M5 5h14v14H5z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
