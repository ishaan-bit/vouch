import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";
import { CreateGroupForm } from "@/components/groups/create-group-form";

export default async function CreateGroupPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <AppShell showNav={false}>
      <CreateGroupForm userId={session.user.id} />
    </AppShell>
  );
}
