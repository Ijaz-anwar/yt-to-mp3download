import {
  getLocalizedPageMetadata,
  LocalizedHomePage,
} from "@/components/pages/LocalizedPages";

export const metadata = getLocalizedPageMetadata("en", "home");

export default function HomePage() {
  return <LocalizedHomePage locale="en" />;
}
