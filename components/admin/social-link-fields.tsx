"use client";

import { useId, useState } from "react";

import { SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/social-networks";

type SocialLinkFieldsProps = {
  platform?: SocialNetwork;
  username?: string | null;
  label?: string;
  idPrefix: string;
};

export function SocialLinkFields({
  platform = "OTHER",
  username = null,
  label = "",
  idPrefix,
}: SocialLinkFieldsProps) {
  const [selectedPlatform, setSelectedPlatform] = useState(platform);
  const labelId = useId();
  const usernameId = useId();

  return (
    <>
      <label className="admin-field">
        <span>Red social</span>
        <select
          name="platform"
          defaultValue={platform}
          onChange={(event) =>
            setSelectedPlatform(event.target.value as SocialNetwork)
          }
          aria-describedby={`${idPrefix}-network-help`}
        >
          {SOCIAL_NETWORKS.map((network) => (
            <option key={network.value} value={network.value}>
              {network.label}
            </option>
          ))}
        </select>
        <small id={`${idPrefix}-network-help`}>
          Elegimos el icono correcto por ti.
        </small>
      </label>

      {selectedPlatform === "OTHER" ? (
        <label className="admin-field" htmlFor={labelId}>
          <span>Nombre para mostrar</span>
          <input
            id={labelId}
            name="label"
            maxLength={80}
            defaultValue={label}
            placeholder="Ej. Revista o sitio personal"
            required
          />
        </label>
      ) : (
        <label className="admin-field" htmlFor={usernameId}>
          <span>Nombre de usuario</span>
          <input
            id={usernameId}
            name="username"
            maxLength={80}
            defaultValue={username ?? ""}
            placeholder="Ej. 075arquitectura"
            autoCapitalize="none"
            required
          />
          <small>Se mostrará como @usuario.</small>
        </label>
      )}
    </>
  );
}
