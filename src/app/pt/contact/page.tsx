import { getLocalizedPageMetadata, LocalizedContactPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("pt", "contact");

export default function PtContactPage() {
  return <LocalizedContactPage locale="pt" />;
}
