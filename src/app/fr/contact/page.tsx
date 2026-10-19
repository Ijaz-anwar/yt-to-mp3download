import { getLocalizedPageMetadata, LocalizedContactPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("fr", "contact");

export default function FrContactPage() {
  return <LocalizedContactPage locale="fr" />;
}
