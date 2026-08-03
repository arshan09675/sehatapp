import { Footer } from "@/components/landing/footer";
import { Topbar } from "@/components/landing/topbar";

/**
 * Chrome for the public pages that are not the landing.
 *
 * Same navy backdrop and light content sheet as the landing, minus the hero
 * and the 3D scene — the topbar is styled for a dark background, so keeping
 * the backdrop is what lets it be reused unchanged.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-ink-light relative flex-1 overflow-x-clip bg-[radial-gradient(1200px_800px_at_75%_0%,rgba(59,130,246,.16)_0%,transparent_55%),radial-gradient(900px_600px_at_10%_92%,rgba(99,102,241,.18)_0%,transparent_60%),linear-gradient(160deg,#080B16_0%,#0B1022_45%,#070A14_100%)] bg-fixed">
      <Topbar />
      <div className="bg-surface-dim text-ink relative z-[2] mt-8 min-h-[70vh] rounded-t-[34px] pt-10 pb-[52px] shadow-[0_-30px_60px_rgba(0,0,0,.35)]">
        {children}
      </div>
      <Footer />
    </div>
  );
}
