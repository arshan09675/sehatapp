import { Reveal } from "./reveal";

const steps = [
  {
    title: "Find a doctor",
    body: "Search by specialty or concern. Only PMC-verified doctors appear, each with real fees shown upfront.",
  },
  {
    title: "Pick a slot",
    body: "Choose from the doctor's real available timings. Booking is completely free — no card needed.",
  },
  {
    title: "Visit the clinic",
    body: "Get an instant SMS confirmation. Pay the consultation fee at the clinic — no hidden charges.",
  },
];

export function HowItWorks() {
  return (
    <div className="grid grid-cols-3 gap-4 max-[860px]:grid-cols-1">
      {steps.map((step, i) => (
        <Reveal key={step.title} delay={(i % 4) * 70}>
          <div className="bg-surface shadow-card h-full rounded-2xl p-[26px]">
            <div className="bg-brand-soft font-heading text-brand-strong mb-3.5 flex size-[38px] items-center justify-center rounded-[11px] font-bold">
              {i + 1}
            </div>
            <h3 className="font-heading text-ink mb-1.5 text-lg font-semibold tracking-[-0.01em]">
              {step.title}
            </h3>
            <p className="text-ink-muted text-[14.5px] leading-[1.6]">
              {step.body}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
