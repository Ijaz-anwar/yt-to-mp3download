import { getLocalizedPageMetadata, LocalizedContactPage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("de", "contact");

export default function DeContactPage() {
  return <LocalizedContactPage locale="de" />;
}
