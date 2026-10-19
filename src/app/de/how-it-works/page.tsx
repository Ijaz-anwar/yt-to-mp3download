import { getLocalizedPageMetadata, LocalizedHowItWorksPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("de", "how-it-works");

export default function DeHowItWorksPage() {
  return <LocalizedHowItWorksPage locale="de" />;
}
