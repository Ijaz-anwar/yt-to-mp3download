import { getLocalizedPageMetadata, LocalizedTermsPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("fr", "terms");

export default function FrTermsPage() {
  return <LocalizedTermsPage locale="fr" />;
}
