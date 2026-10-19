import { getLocalizedPageMetadata, LocalizedTermsPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("es", "terms");

export default function EsTermsPage() {
  return <LocalizedTermsPage locale="es" />;
}
