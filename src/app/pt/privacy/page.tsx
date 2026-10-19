import { getLocalizedPageMetadata, LocalizedPrivacyPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("pt", "privacy");

export default function PtPrivacyPage() {
  return <LocalizedPrivacyPage locale="pt" />;
}
