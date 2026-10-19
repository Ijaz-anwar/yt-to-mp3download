import { getLocalizedPageMetadata, LocalizedHowItWorksPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("pt", "how-it-works");

export default function PtHowItWorksPage() {
  return <LocalizedHowItWorksPage locale="pt" />;
}
