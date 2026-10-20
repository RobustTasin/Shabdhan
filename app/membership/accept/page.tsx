import { redirect } from "next/navigation";

export default function LegacyMembershipAcceptPage() {
  redirect("/account/create");
}
