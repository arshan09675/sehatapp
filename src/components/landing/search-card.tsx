import { cn } from "@/lib/utils";
import { specialties } from "./data";
import { SearchIcon } from "./icons";
import { btn, btnPrimary } from "./styles";

/**
 * The landing's search entry point.
 *
 * A plain GET form pointed at /doctors: the browser builds the query string
 * itself, so this needs no client JavaScript and works before hydration.
 * The richer filtering (area, free text) lives on /doctors itself.
 */
export function SearchCard({ cities }: { cities: string[] }) {
  return (
    <form
      action="/doctors"
      method="get"
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
          name="city"
          className="text-ink cursor-pointer appearance-none border-none bg-transparent py-0.5 font-sans text-base font-medium outline-none"
        >
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
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
          name="specialty"
          className="text-ink cursor-pointer appearance-none border-none bg-transparent py-0.5 font-sans text-base font-medium outline-none"
        >
          <option value="">Any specialty</option>
          {specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
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
