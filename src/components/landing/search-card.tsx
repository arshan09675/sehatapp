"use client";

import { cn } from "@/lib/utils";
import { searchSpecialties } from "./data";
import { SearchIcon } from "./icons";
import { btn, btnPrimary } from "./styles";

// TODO(Phase 4): make this a real search — route to /doctors with city, area,
// and specialty filters instead of scrolling to the static card grid.
export function SearchCard() {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        document
          .getElementById("doctors")
          ?.scrollIntoView({ behavior: "smooth" });
      }}
      className="bg-surface shadow-lift relative z-[3] mx-auto -mt-[52px] grid max-w-[820px] grid-cols-[1.05fr_1.3fr_auto] gap-2.5 rounded-2xl p-3 max-[860px]:grid-cols-1"
    >
      <div className="bg-surface-dim flex flex-col gap-0.5 rounded-[11px] px-[15px] py-[9px]">
        <label
          htmlFor="f-city"
          className="text-ink-muted text-[11.5px] font-semibold tracking-[.05em] uppercase"
        >
          City
        </label>
        <select
          id="f-city"
          className="text-ink cursor-pointer appearance-none border-none bg-transparent py-0.5 font-sans text-base font-medium"
        >
          <option>Lahore</option>
        </select>
      </div>
      <div className="bg-surface-dim flex flex-col gap-0.5 rounded-[11px] px-[15px] py-[9px]">
        <label
          htmlFor="f-spec"
          className="text-ink-muted text-[11.5px] font-semibold tracking-[.05em] uppercase"
        >
          Specialty or concern
        </label>
        <select
          id="f-spec"
          className="text-ink cursor-pointer appearance-none border-none bg-transparent py-0.5 font-sans text-base font-medium"
        >
          {searchSpecialties.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className={cn(
          btn,
          btnPrimary,
          "min-h-[58px] px-[30px] text-base max-[860px]:min-h-[52px]",
        )}
      >
        <SearchIcon className="size-[17px] flex-none" />
        Search
      </button>
    </form>
  );
}
