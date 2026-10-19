import { getLocalizedPageMetadata, LocalizedPrivacyPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("es", "privacy");

export default function EsPrivacyPage() {
  return <LocalizedPrivacyPage locale="es" />;
}
