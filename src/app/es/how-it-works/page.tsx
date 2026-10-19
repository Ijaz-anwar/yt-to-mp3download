import { getLocalizedPageMetadata, LocalizedHowItWorksPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("es", "how-it-works");

export default function EsHowItWorksPage() {
  return <LocalizedHowItWorksPage locale="es" />;
}
