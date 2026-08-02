import { AreaShell } from "@/components/layout/area-shell";
import { requireRole } from "@/lib/auth/dal";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("admin");
  return (
    <AreaShell profile={profile} areaLabel="Admin">
      {children}
    </AreaShell>
  );
}
