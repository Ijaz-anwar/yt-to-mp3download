import { getLocalizedPageMetadata, LocalizedFaqPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("es", "faq");

export default function EsFaqPage() {
  return <LocalizedFaqPage locale="es" />;
}
