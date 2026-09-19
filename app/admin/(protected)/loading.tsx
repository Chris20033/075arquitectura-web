export default function AdminLoading() {
  return (
    <div className="admin-page" role="status" aria-live="polite">
      <p className="admin-label">Preparando el panel…</p>
      <div className="admin-loading-line" aria-hidden="true" />
    </div>
  );
}
