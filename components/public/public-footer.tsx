import Link from "next/link";

type PublicFooterProps = {
  actionLink?: {
    href: string;
    label: string;
  };
};

export function PublicFooter({
  actionLink = { href: "#inicio", label: "Volver arriba" },
}: PublicFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="public-footer__identity">
        <span>075arquitectura</span>
        <span className="public-footer__separator" aria-hidden="true">
          ·
        </span>
        <span className="public-footer__year">© {year}</span>
      </div>

      <nav className="public-footer__legal" aria-label="Información legal">
        <Link href="/privacidad">Privacidad</Link>
        <span className="public-footer__separator" aria-hidden="true">
          ·
        </span>
        <Link href="/terminos">Términos</Link>
      </nav>

      <div className="public-footer__action">
        <Link href={actionLink.href}>{actionLink.label}</Link>
      </div>
    </footer>
  );
}
