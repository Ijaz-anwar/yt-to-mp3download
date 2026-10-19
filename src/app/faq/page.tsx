import {
  getLocalizedPageMetadata,
  LocalizedFaqPage,
} from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("en", "faq");

export default function FaqPage() {
  return <LocalizedFaqPage locale="en" />;
}
