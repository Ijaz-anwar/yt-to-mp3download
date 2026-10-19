import { getLocalizedPageMetadata, LocalizedFaqPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("fr", "faq");

export default function FrFaqPage() {
  return <LocalizedFaqPage locale="fr" />;
}
