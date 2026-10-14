import { CookieBanner } from "@/components/public/cookie-banner";
import "./public.css";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-root">
      {children}
      <CookieBanner />
    </div>
  );
}
