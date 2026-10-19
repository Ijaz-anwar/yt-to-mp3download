import { getLocalizedPageMetadata, LocalizedContactPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("es", "contact");

export default function EsContactPage() {
  return <LocalizedContactPage locale="es" />;
}
