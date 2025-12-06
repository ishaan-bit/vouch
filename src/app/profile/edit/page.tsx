import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";
import { EditProfileContent } from "@/components/profile/edit-profile-content";

export default async function EditProfilePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <AppShell>
      <EditProfileContent userId={session.user.id} />
    </AppShell>
  );
}
