import { getLocalizedPageMetadata, LocalizedFaqPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("pt", "faq");

export default function PtFaqPage() {
  return <LocalizedFaqPage locale="pt" />;
}
