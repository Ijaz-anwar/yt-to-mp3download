import { getLocalizedPageMetadata, LocalizedHomePage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("es", "home");

export default function EsHomePage() {
  return <LocalizedHomePage locale="es" />;
}
