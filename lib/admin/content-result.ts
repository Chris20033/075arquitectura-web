export const adminActionCodes = [
  "IDLE",
  "SUCCESS",
  "VALIDATION_ERROR",
  "CONTENT_STALE",
  "CATEGORY_IN_USE",
  "PUBLICATION_BLOCKED",
  "PROJECT_HAS_IMAGES",
  "CONFIRMATION_MISMATCH",
  "NOT_FOUND",
  "INVALID_ORDER",
  "DATABASE_ERROR",
] as const;

export type AdminActionCode = (typeof adminActionCodes)[number];

export type AdminActionState<T = undefined> = {
  ok: boolean;
  code: AdminActionCode;
  message: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

export const initialAdminActionState: AdminActionState = {
  ok: false,
  code: "IDLE",
  message: "",
};

export class AdminContentError extends Error {
  constructor(
    public readonly code: Exclude<AdminActionCode, "IDLE" | "SUCCESS">,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AdminContentError";
  }
}

export function successResult<T>(message: string, data?: T) {
  return {
    ok: true,
    code: "SUCCESS",
    message,
    data,
  } satisfies AdminActionState<T>;
}

export function errorResult(error: unknown): AdminActionState {
  if (error instanceof AdminContentError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  console.error("[admin-content] operation failed");
  return {
    ok: false,
    code: "DATABASE_ERROR",
    message: "No pudimos completar la operación. Inténtalo nuevamente.",
  };
}
