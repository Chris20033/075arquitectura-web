import { AdminNav } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

type AdminShellProps = {
  email: string;
  children: React.ReactNode;
};

export function AdminShell({ email, children }: AdminShellProps) {
  return (
    <div className="admin-shell">
      <aside className="admin-shell__rail">
        <div className="admin-shell__rail-head">
          <div className="admin-shell__brand" aria-label="075arquitectura">
            075
          </div>
          <div className="admin-shell__meta">Panel editorial</div>
        </div>
        <AdminNav />
        <div className="admin-shell__account">
          <p className="admin-shell__email" title={email}>
            {email}
          </p>
          <SignOutButton />
        </div>
      </aside>
      <main className="admin-shell__main">{children}</main>
    </div>
  );
}
