import {
  getLocalizedPageMetadata,
  LocalizedTermsPage,
} from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("en", "terms");

export default function TermsPage() {
  return <LocalizedTermsPage locale="en" />;
}
