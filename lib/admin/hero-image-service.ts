import "server-only";

import { MediaStorageKind } from "@/generated/prisma/enums";
import type { DatabaseClient } from "@/lib/db/client";
import { stageStoredMediaForDeletion } from "@/lib/media/storage";

import { AdminContentError } from "./content-result";

export function createAdminHeroImageService(database: DatabaseClient) {
  return {
    async updateAltText(altText: string) {
      const normalized = altText.trim();
      if (!normalized)
        throw new AdminContentError(
          "VALIDATION_ERROR",
          "Describe brevemente lo que aparece en la portada.",
          { altText: "La descripción es obligatoria." },
        );
      const hero = await database.siteHeroImage.findFirst();
      if (!hero)
        throw new AdminContentError(
          "NOT_FOUND",
          "Todavía no existe una portada.",
        );
      await database.siteHeroImage.update({
        where: { id: hero.id },
        data: { altText: normalized },
      });
    },
    async deleteHero() {
      const hero = await database.siteHeroImage.findFirst();
      if (!hero) return;
      const staged =
        hero.storageKind === MediaStorageKind.LOCAL
          ? await stageStoredMediaForDeletion(hero.storageKey)
          : null;
      try {
        await database.siteHeroImage.delete({ where: { id: hero.id } });
      } catch (error) {
        await staged?.rollback();
        throw error;
      }
      await staged?.commit();
    },
  };
}
