import {
  getLocalizedPageMetadata,
  LocalizedHowItWorksPage,
} from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("en", "how-it-works");

export default function HowItWorksPage() {
  return <LocalizedHowItWorksPage locale="en" />;
}
