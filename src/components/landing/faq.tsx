import { FaqItem } from "./faq-item";
import { Reveal } from "./reveal";
import { container } from "./styles";

/**
 * TODO: placeholder copy — swap for the approved FAQ list.
 *
 * Every answer below is checked against what the product actually does today
 * (free booking, pay-at-clinic, admin PMC verification, cancel-until-start),
 * so nothing here promises a feature that isn't built. Deliberately absent:
 * SMS/WhatsApp confirmations, which are Phase 5.
 */
const faqs: { question: string; answer: React.ReactNode }[] = [
  {
    question: "Is booking free?",
    answer:
      "Yes. Booking on SehatBook costs nothing and you don't need a card to reserve a slot. The only thing you pay is the doctor's consultation fee, at the clinic.",
  },
  {
    question: "How do I pay the doctor?",
    answer:
      "At the clinic, when you go in. There's no online payment — and the fee shown on a doctor's profile is the fee you pay, with no booking charges added on top.",
  },
  {
    question: "Are the doctors verified?",
    answer:
      "Every doctor is checked against their Pakistan Medical Commission (PMC) registration before they appear on SehatBook. If you can see a doctor here, an administrator has verified that registration.",
  },
  {
    question: "Can I cancel my appointment?",
    answer:
      "Yes, and it's free. You can cancel any upcoming appointment from your dashboard any time before it starts — the slot goes straight back to the doctor's schedule.",
  },
  {
    question: "Do I need an account to book?",
    answer:
      "Yes. Signing up takes about a minute, and it's what lets you see all your appointments in one place and cancel one if your plans change.",
  },
  {
    question: "What if it's an emergency?",
    answer:
      "Don't book online. Call 1122 or go to your nearest emergency room right away. SehatBook is for planned visits, not emergencies.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-[74px] py-[52px]">
      <div className={container}>
        <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-ink text-[clamp(24px,3.2vw,34px)] font-semibold tracking-[-0.01em]">
            Frequently asked questions
          </h2>
        </Reveal>

        <Reveal>
          <div className="bg-surface shadow-card rounded-2xl px-6 py-1 max-[860px]:px-5">
            {faqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question}>
                {faq.answer}
              </FaqItem>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
