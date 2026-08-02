import { AreaShell } from "@/components/layout/area-shell";
import { requireRole } from "@/lib/auth/dal";

export default async function DoctorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("doctor");
  return (
    <AreaShell profile={profile} areaLabel="Doctor Panel">
      {children}
    </AreaShell>
  );
}
