export const SOCIAL_NETWORKS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "PINTEREST", label: "Pinterest" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "BEHANCE", label: "Behance" },
  { value: "HOUZZ", label: "Houzz" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "X", label: "X" },
  { value: "OTHER", label: "Otro enlace" },
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]["value"];

export const SOCIAL_NETWORK_VALUES = SOCIAL_NETWORKS.map(
  (network) => network.value,
) as SocialNetwork[];

export function isSocialNetwork(value: string): value is SocialNetwork {
  return SOCIAL_NETWORK_VALUES.includes(value as SocialNetwork);
}

export function socialNetworkLabel(platform: SocialNetwork) {
  return (
    SOCIAL_NETWORKS.find((network) => network.value === platform)?.label ??
    "Otro enlace"
  );
}

export function normalizeSocialUsername(value: string) {
  return value.trim().replace(/^@+/, "");
}

export function socialLinkDisplayName(input: {
  platform: SocialNetwork;
  username: string | null;
  label: string;
}) {
  if (input.platform === "OTHER") return input.label;

  const username = input.username?.trim();
  return username ? `@${username}` : socialNetworkLabel(input.platform);
}
