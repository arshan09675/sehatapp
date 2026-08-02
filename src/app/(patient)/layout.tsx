import { AreaShell } from "@/components/layout/area-shell";
import { requireRole } from "@/lib/auth/dal";

export default async function PatientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("patient");
  return (
    <AreaShell profile={profile} areaLabel="My Health">
      {children}
    </AreaShell>
  );
}
