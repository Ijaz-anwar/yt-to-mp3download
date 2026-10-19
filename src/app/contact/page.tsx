import {
  getLocalizedPageMetadata,
  LocalizedContactPage,
} from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("en", "contact");

export default function ContactPage() {
  return <LocalizedContactPage locale="en" />;
}
