"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

type DirtyContextValue = {
  setDirty: (id: string, dirty: boolean) => void;
};

const DirtyContext = createContext<DirtyContextValue | null>(null);

export function AdminDirtyStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const forms = useRef(new Map<string, boolean>());

  const hasUnsavedChanges = useCallback(
    () => [...forms.current.values()].some(Boolean),
    [],
  );

  const setDirty = useCallback((id: string, dirty: boolean) => {
    forms.current.set(id, dirty);
  }, []);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
    }

    function beforeNavigation(event: MouseEvent) {
      if (!hasUnsavedChanges() || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank" || link.href === window.location.href)
        return;
      if (
        !window.confirm(
          "Hay cambios sin guardar. ¿Quieres salir de esta pantalla?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigation, true);
    };
  }, [hasUnsavedChanges]);

  const value = useMemo(() => ({ setDirty }), [setDirty]);
  return (
    <DirtyContext.Provider value={value}>{children}</DirtyContext.Provider>
  );
}

export function useAdminDirtyState() {
  return useContext(DirtyContext);
}
