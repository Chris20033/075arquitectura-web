"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { database } from "@/lib/db";
import { requireAdminOperation } from "@/lib/auth/access";
import {
  isSocialNetwork,
  normalizeSocialUsername,
  socialNetworkLabel,
} from "@/lib/social-networks";

import {
  AdminContentError,
  errorResult,
  successResult,
  type AdminActionState,
} from "./content-result";
import { createAdminContentService } from "./content-service";
import { permanentlyDeleteProjectWithImagesAction } from "./image-actions";
import {
  optionalText,
  parseExpectedDate,
  parseIdList,
  requiredText,
} from "./content-utils";

const content = createAdminContentService(database);

function refreshAdminAndPublic(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/proyectos/${slug}`);
}

async function authorizedAction<T>(operation: () => Promise<T>) {
  await requireAdminOperation();
  return operation();
}

function parseYear(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      { year: "El año debe estar entre 1000 y 9999." },
    );
  }
  return year;
}

function parseProjectInput(formData: FormData) {
  return {
    name: requiredText(formData.get("name"), "name", "El nombre", 180),
    description: optionalText(
      formData.get("description"),
      "description",
      "La descripción",
      10_000,
    ),
    year: parseYear(formData.get("year")),
    location: optionalText(
      formData.get("location"),
      "location",
      "La ubicación",
      180,
    ),
    categoryId: requiredText(
      formData.get("categoryId"),
      "categoryId",
      "La categoría",
      64,
    ),
  };
}

function parseProfileInput(formData: FormData) {
  const publicEmail = optionalText(
    formData.get("publicEmail"),
    "publicEmail",
    "El correo",
    320,
  )?.toLowerCase();
  if (publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail)) {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      {
        publicEmail: "Escribe un correo válido.",
      },
    );
  }

  const whatsappRaw = optionalText(
    formData.get("whatsappPhone"),
    "whatsappPhone",
    "WhatsApp",
    32,
  );
  const whatsappPhone = whatsappRaw?.replace(/\D/g, "") ?? null;
  if (
    whatsappPhone &&
    (whatsappPhone.length < 10 || whatsappPhone.length > 15)
  ) {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      {
        whatsappPhone: "WhatsApp debe contener entre 10 y 15 dígitos.",
      },
    );
  }

  return {
    professionalName:
      optionalText(
        formData.get("professionalName"),
        "professionalName",
        "El nombre profesional",
        160,
      ) ?? "",
    biography: optionalText(
      formData.get("biography"),
      "biography",
      "La biografía",
      10_000,
    ),
    whatsappPhone,
    publicEmail: publicEmail ?? null,
    publicPhone: optionalText(
      formData.get("publicPhone"),
      "publicPhone",
      "El teléfono",
      32,
    ),
  };
}

function parseSocialInput(formData: FormData) {
  const rawPlatform = requiredText(
    formData.get("platform"),
    "platform",
    "La red social",
    32,
  );
  if (!isSocialNetwork(rawPlatform)) {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      { platform: "Selecciona una red social válida." },
    );
  }
  const username = normalizeSocialUsername(
    optionalText(
      formData.get("username"),
      "username",
      "El nombre de usuario",
      80,
    ) ?? "",
  );
  const label =
    rawPlatform === "OTHER"
      ? requiredText(formData.get("label"), "label", "El nombre", 80)
      : socialNetworkLabel(rawPlatform);
  if (rawPlatform !== "OTHER" && !username) {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      { username: "Escribe el nombre de usuario de esta red." },
    );
  }
  const url = requiredText(formData.get("url"), "url", "La URL", 2_000);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error("protocol");
  } catch {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      {
        url: "Usa una URL HTTPS completa.",
      },
    );
  }
  return {
    platform: rawPlatform,
    username: rawPlatform === "OTHER" ? null : username,
    label,
    url,
    isVisible: formData.get("isVisible") === "on",
  };
}

export async function createCategoryAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      const name = requiredText(formData.get("name"), "name", "El nombre", 120);
      await content.createCategory(name);
      refreshAdminAndPublic();
      return successResult("Categoría creada.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateCategoryAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      const name = requiredText(formData.get("name"), "name", "El nombre", 120);
      await content.updateCategory(
        id,
        parseExpectedDate(formData.get("updatedAt")),
        name,
      );
      refreshAdminAndPublic();
      return successResult("Categoría actualizada.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteCategoryAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.deleteCategory(
        id,
        parseExpectedDate(formData.get("updatedAt")),
      );
      refreshAdminAndPublic();
      return successResult("Categoría eliminada.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function reorderCategoriesAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.reorderCategories(parseIdList(formData.get("ids")));
      revalidatePath("/admin/categorias");
      return successResult("Orden de categorías guardado.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function createProjectAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  let projectId: string | null = null;
  try {
    await authorizedAction(async () => {
      const project = await content.createProject(parseProjectInput(formData));
      projectId = project.id;
      revalidatePath("/admin/proyectos");
    });
  } catch (error) {
    return errorResult(error);
  }
  redirect(`/admin/proyectos/${projectId}?estado=creado`);
}

export async function updateProjectAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      const project = await content.updateProject(
        id,
        parseExpectedDate(formData.get("updatedAt")),
        parseProjectInput(formData),
      );
      refreshAdminAndPublic(project.slug);
      return successResult("Proyecto guardado.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function publishProjectAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      const project = await content.publishProject(
        id,
        parseExpectedDate(formData.get("updatedAt")),
      );
      refreshAdminAndPublic(project.slug);
      return successResult("Proyecto publicado.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function unpublishProjectAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.unpublishProject(
        id,
        parseExpectedDate(formData.get("updatedAt")),
      );
      refreshAdminAndPublic();
      return successResult("El proyecto volvió a borrador.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function trashProjectAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.trashProject(
        id,
        parseExpectedDate(formData.get("updatedAt")),
      );
      refreshAdminAndPublic();
      return successResult("Proyecto enviado a la papelera.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function reorderProjectsAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.reorderPublishedProjects(parseIdList(formData.get("ids")));
      refreshAdminAndPublic();
      return successResult("Orden público guardado.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function restoreProjectAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      const result = await content.restoreProject(
        id,
        parseExpectedDate(formData.get("updatedAt")),
      );
      refreshAdminAndPublic();
      return successResult(
        result.restoredAsDraft
          ? "Proyecto restaurado como borrador porque ya no cumple todos los requisitos."
          : "Proyecto restaurado y publicado nuevamente.",
      );
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function permanentlyDeleteProjectAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const confirmation = optionalText(
    formData.get("confirmation"),
    "confirmation",
    "La confirmación",
    180,
  );
  return permanentlyDeleteProjectWithImagesAction(id, confirmation ?? "");
}

export async function updateProfileAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.updateProfile(
        parseExpectedDate(formData.get("updatedAt")),
        parseProfileInput(formData),
      );
      refreshAdminAndPublic();
      return successResult("Perfil público actualizado.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function createSocialLinkAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.createSocialLink(parseSocialInput(formData));
      refreshAdminAndPublic();
      return successResult("Enlace añadido.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateSocialLinkAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.updateSocialLink(
        id,
        parseExpectedDate(formData.get("updatedAt")),
        parseSocialInput(formData),
      );
      refreshAdminAndPublic();
      return successResult("Enlace actualizado.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteSocialLinkAction(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.deleteSocialLink(
        id,
        parseExpectedDate(formData.get("updatedAt")),
      );
      refreshAdminAndPublic();
      return successResult("Enlace eliminado.");
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function reorderSocialLinksAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    return await authorizedAction(async () => {
      await content.reorderSocialLinks(parseIdList(formData.get("ids")));
      refreshAdminAndPublic();
      return successResult("Orden de redes guardado.");
    });
  } catch (error) {
    return errorResult(error);
  }
}
