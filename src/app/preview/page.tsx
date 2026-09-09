import { redirect } from "next/navigation";

// The preview page existed to sample the paywalled product. The briefing is
// publicly readable during the beta, so old links land on the briefing.
export default function PreviewPage() {
  redirect("/");
}
