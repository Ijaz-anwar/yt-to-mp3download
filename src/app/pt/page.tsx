import { getLocalizedPageMetadata, LocalizedHomePage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("pt", "home");

export default function PtHomePage() {
  return <LocalizedHomePage locale="pt" />;
}
