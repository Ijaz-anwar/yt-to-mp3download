import { getLocalizedPageMetadata, LocalizedFaqPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("de", "faq");

export default function DeFaqPage() {
  return <LocalizedFaqPage locale="de" />;
}
