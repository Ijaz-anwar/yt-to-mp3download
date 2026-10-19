import { getLocalizedPageMetadata, LocalizedHomePage } from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("de", "home");

export default function DeHomePage() {
  return <LocalizedHomePage locale="de" />;
}
