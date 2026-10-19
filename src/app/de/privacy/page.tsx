import { getLocalizedPageMetadata, LocalizedPrivacyPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("de", "privacy");

export default function DePrivacyPage() {
  return <LocalizedPrivacyPage locale="de" />;
}
