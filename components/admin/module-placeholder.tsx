type ModulePlaceholderProps = {
  title: string;
  description: string;
  sprint: string;
};

export function ModulePlaceholder({
  title,
  description,
  sprint,
}: ModulePlaceholderProps) {
  return (
    <article className="admin-page admin-module">
      <header className="admin-page__header">
        <h1 className="admin-page__title">{title}</h1>
        <span className="admin-status">Estructura preparada</span>
      </header>
      <div className="admin-module__body">
        <p>{description}</p>
        <p className="admin-module__sprint">Disponible en {sprint}</p>
      </div>
    </article>
  );
}
