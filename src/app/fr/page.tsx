import { getLocalizedPageMetadata, LocalizedHomePage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("fr", "home");

export default function FrHomePage() {
  return <LocalizedHomePage locale="fr" />;
}
