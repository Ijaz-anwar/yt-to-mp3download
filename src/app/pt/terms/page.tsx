import { getLocalizedPageMetadata, LocalizedTermsPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("pt", "terms");

export default function PtTermsPage() {
  return <LocalizedTermsPage locale="pt" />;
}
