import { getLocalizedPageMetadata, LocalizedPrivacyPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("fr", "privacy");

export default function FrPrivacyPage() {
  return <LocalizedPrivacyPage locale="fr" />;
}
