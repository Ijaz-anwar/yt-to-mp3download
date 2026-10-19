import { getLocalizedPageMetadata, LocalizedHowItWorksPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("fr", "how-it-works");

export default function FrHowItWorksPage() {
  return <LocalizedHowItWorksPage locale="fr" />;
}
