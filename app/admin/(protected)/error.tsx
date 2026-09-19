"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <article className="admin-page admin-module">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Algo no respondió.</h1>
        <span className="admin-status">Error temporal</span>
      </header>
      <div className="admin-module__body">
        <p>
          No fue posible preparar el panel. Comprueba la conexión e inténtalo de
          nuevo; ningún contenido fue modificado.
        </p>
        <button className="admin-primary-action" type="button" onClick={reset}>
          <span>Volver a intentar</span>
          <span className="admin-primary-action__mark" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
