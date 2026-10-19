import { getLocalizedPageMetadata, LocalizedTermsPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("de", "terms");

export default function DeTermsPage() {
  return <LocalizedTermsPage locale="de" />;
}
