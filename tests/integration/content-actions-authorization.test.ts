import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminOperation } = vi.hoisted(() => ({
  requireAdminOperation: vi.fn<() => Promise<never>>(),
}));

vi.mock("@/lib/auth/access", () => ({ requireAdminOperation }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import * as actions from "@/lib/admin/content-actions";
import type { AdminActionState } from "@/lib/admin/content-result";

const initialState: AdminActionState = {
  ok: false,
  code: "IDLE",
  message: "",
};

const formData = new FormData();

const guardedActions: Array<[string, () => Promise<AdminActionState>]> = [
  [
    "createCategoryAction",
    () => actions.createCategoryAction(initialState, formData),
  ],
  [
    "updateCategoryAction",
    () => actions.updateCategoryAction("id", initialState, formData),
  ],
  [
    "deleteCategoryAction",
    () => actions.deleteCategoryAction("id", initialState, formData),
  ],
  [
    "reorderCategoriesAction",
    () => actions.reorderCategoriesAction(initialState, formData),
  ],
  [
    "createProjectAction",
    () => actions.createProjectAction(initialState, formData),
  ],
  [
    "updateProjectAction",
    () => actions.updateProjectAction("id", initialState, formData),
  ],
  [
    "publishProjectAction",
    () => actions.publishProjectAction("id", initialState, formData),
  ],
  [
    "unpublishProjectAction",
    () => actions.unpublishProjectAction("id", initialState, formData),
  ],
  [
    "trashProjectAction",
    () => actions.trashProjectAction("id", initialState, formData),
  ],
  [
    "reorderProjectsAction",
    () => actions.reorderProjectsAction(initialState, formData),
  ],
  [
    "restoreProjectAction",
    () => actions.restoreProjectAction("id", initialState, formData),
  ],
  [
    "permanentlyDeleteProjectAction",
    () => actions.permanentlyDeleteProjectAction("id", initialState, formData),
  ],
  [
    "updateProfileAction",
    () => actions.updateProfileAction(initialState, formData),
  ],
  [
    "createSocialLinkAction",
    () => actions.createSocialLinkAction(initialState, formData),
  ],
  [
    "updateSocialLinkAction",
    () => actions.updateSocialLinkAction("id", initialState, formData),
  ],
  [
    "deleteSocialLinkAction",
    () => actions.deleteSocialLinkAction("id", initialState, formData),
  ],
  [
    "reorderSocialLinksAction",
    () => actions.reorderSocialLinksAction(initialState, formData),
  ],
];

describe("authorization for administrative content actions", () => {
  beforeEach(() => {
    requireAdminOperation.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    requireAdminOperation.mockRejectedValue(
      new Error("UNAUTHORIZED_ADMIN_OPERATION"),
    );
  });

  it.each(guardedActions)(
    "protects %s before handling input",
    async (_name, action) => {
      const result = await action();

      expect(requireAdminOperation).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ ok: false, code: "DATABASE_ERROR" });
    },
  );
});
