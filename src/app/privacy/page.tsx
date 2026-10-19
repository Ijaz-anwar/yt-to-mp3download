import {
  getLocalizedPageMetadata,
  LocalizedPrivacyPage,
} from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("en", "privacy");

export default function PrivacyPage() {
  return <LocalizedPrivacyPage locale="en" />;
}
