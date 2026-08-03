# DESIGN.md — SehatBook visual identity & UI rules

Claude Code: read this before writing ANY user-facing UI (doctor dashboard,
public pages, patient dashboard). Admin pages may stay on plain shadcn defaults.
Every color/type/spacing decision comes from here, not from generic Tailwind
instinct. When something isn't covered, extend in the same spirit and add a
note here.

## Who this is for

Pakistani patients (many on mid-range Android phones, often first-time users of
any health app, mixed English/Urdu comfort) and busy doctors checking a phone
between patients. The design job: feel **trustworthy like a good hospital, warm
like a family doctor** — never like a startup landing page, never like a
government portal.

## Design direction

Confident clinical trust. Light, airy product surfaces built on one royal
blue, soft depth, generous tap targets; the public landing adds a dark navy
"night sky" hero with indigo/violet accents and a 3D scene. The product
should feel like it was designed in Lahore for Lahore — not a translated
Silicon Valley template.

> **Canonical reference:** `design-reference/sehatbook-complete.html` is the
> source of truth for the public landing (tokens, spacing, copy, animations)
> and supersedes older revisions of this document where they conflict. Its
> `#fordoc` dashboard mockup was intentionally NOT ported — the real doctor
> dashboard (Phase 3) lives at `/doctor`.

## Color tokens (define as CSS vars in globals.css, wire into Tailwind theme)

| Token            | Hex       | Use                                                                                                                                 |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--brand`        | `#2B59E0` | Primary — royal blue. Buttons, active nav, links, PMC badge, focus rings.                                                           |
| `--brand-strong` | `#1E40C4` | Hover/pressed states, high-emphasis text on light bg.                                                                               |
| `--brand-soft`   | `#EEF2FF` | Tinted backgrounds: selected slot, active filter chip, avatars, info banners.                                                       |
| `--indigo`       | `#6366F1` | Landing gradients / 3D scene accents only.                                                                                          |
| `--violet`       | `#8B5CF6` | Landing gradients / 3D scene accents only.                                                                                          |
| `--amber`        | `#F59E0B` | Sparingly: "Available today" chips, ratings stars, urgency-medium. Never for buttons. (`--amber-soft` `#FEF3E2` for its tinted bg.) |
| `--ink`          | `#0F172A` | Primary text on light surfaces. Slate near-black.                                                                                   |
| `--ink-muted`    | `#64748B` | Secondary text, captions, timestamps.                                                                                               |
| `--surface`      | `#FFFFFF` | Cards, sheets.                                                                                                                      |
| `--surface-dim`  | `#F6F7FB` | Page background. Cards sit on this with soft shadow, no borders-everywhere look.                                                    |
| `--line`         | `#E7E9F0` | Hairline borders/dividers on light surfaces.                                                                                        |
| `--navy`         | `#080B16` | Dark hero/footer background (public landing only).                                                                                  |
| `--ink-light`    | `#EAF0FF` | Primary text on dark backgrounds. (`--muted-dark` `#93A0BD` for secondary; `--glass`/`--glass-line` for translucent chips.)         |
| `--danger`       | `#E5484D` | Errors, emergency triage state, cancel actions. (`--danger-soft` `#FDEBEC`.)                                                        |
| `--success`      | `#12B76A` | Confirmations ("Appointment booked"). (`--success-soft` `#E7F6EF`.)                                                                 |

Rules: one brand blue for actions everywhere. Gradients (blue→indigo→violet)
and the amber accent belong to the public landing and marketing surfaces;
product screens (dashboards, forms, booking flow) stay flat single-blue.
Emergency/urgent states get `--danger` treatment with weight, not blinking or
animation. All tokens are defined in `src/app/globals.css` and exposed as
Tailwind color utilities (`bg-brand`, `text-ink-muted`, …); shadcn's
`--primary`/`--ring`/`--destructive` map onto them.

## Typography

- **Display/headings:** `Fraunces` (Google Fonts, via next/font — weights
  600/700, normal + italic, `opsz` axis) — a warm serif with character. Used
  for page titles, doctor names, the landing hero (italic for the hero's
  emphasized phrase). This is the signature: a serif in a category full of
  cold geometric sans clones is what makes SehatBook recognizable. Exposed as
  `font-heading`.
- **Body/UI:** `Inter` — 400/500/600. All controls, labels, tables, forms.
- **Urdu:** `Noto Nastaliq Urdu` for Urdu strings, `dir="rtl"` on those nodes,
  line-height 1.9+ (Nastaliq clips at normal line heights). Never render Urdu
  in Inter.
- Scale: 30/24/20/16/14/12. Body is 16 minimum on mobile — patients skew older,
  never shrink body text below 16 to fit a layout.

## Layout & components

- Max content width 1120px; mobile-first — every screen designed at 390px wide
  first, desktop is the adaptation.
- Cards: `rounded-2xl`, shadow `0 1px 3px rgb(0 0 0 / 0.06)`, no visible border
  on `--surface-dim`. Hover: shadow deepens slightly. No lift/scale transforms.
- Buttons: `rounded-xl`, min height 44px (thumb-friendly), primary = `--brand`
  filled, secondary = `--brand-soft` bg + `--brand-strong` text. One primary
  action per screen.
- Slot picker (the most important component in the app): slots as a wrap grid
  of pill buttons, min 44px tall, `--brand-soft` when selected with a check;
  taken slots greyed with strikethrough time, not hidden — seeing a busy
  doctor's day builds trust.
- Doctor cards: photo (56px rounded-full), name in Fraunces 600, specialty +
  experience in `--ink-muted`, fee right-aligned in tabular figures, amber
  "Available today" chip when true. PMC-verified badge: small shield icon +
  "PMC Verified" in `--brand` — this badge is a core trust element, show it
  on every doctor surface.
- Forms: labels above inputs, 16px input text (prevents iOS zoom), errors in
  `--danger` below the field in plain language ("Ye phone number theek nahi
  lag raha — 03XX XXXXXXX format use karein").

## Motion

Product surfaces (dashboards, forms, booking flow): almost none, and only
functional — 150ms ease on hover/focus states, one gentle fade+rise (250ms)
when the slot grid loads. No page transitions, no skeleton shimmer faster
than 1.2s, no confetti.

The public landing is the exception and follows the reference: the 3D hero
scene (client-only, never blocks render), scroll reveals (700ms fade+rise,
once per element, 70ms stagger), card hover lifts, and the stat count-up.

Everything, landing included, respects `prefers-reduced-motion` (static hero
frame, reveals shown immediately).

## Voice & copy

- Bilingual by default where it matters to patients: primary label English,
  Urdu inline or beneath on key actions ("Book Appointment · اپائنٹمنٹ بک کریں").
- Buttons say what happens: "Book for Tue 3:30 PM", not "Submit".
- Empty states direct action: "No appointments yet — find a doctor to book
  your first visit" + button. Errors say what to do next, never just "Something
  went wrong".
- Never use: "Oops", "Uh oh", exclamation marks in errors, medical jargon in
  patient-facing copy.

## Trust details (non-negotiable on public pages)

1. PMC-verified badge on every doctor card, profile, and confirmation screen.
2. Real fee shown before booking — no "contact for price".
3. Confirmation screen shows: doctor, clinic + full address, date/time in
   words ("Tuesday, 12 Aug — 3:30 PM"), fee, and "pay at clinic" note.
4. Footer on public pages: real contact info, privacy policy, terms — present
   from day one even while short.

## Landing page (Phase 4) — one-line brief

Hero is a thesis, not a stock photo: Fraunces headline "Healthcare, one click
away." over the 3D navy scene, then a light sheet with a search bar (city +
specialty), 3–4 doctor cards as social proof, an interactive slot-picker demo,
how-it-works, and the trust stat band — exactly as in
`sehatbook-complete.html`. Built in `src/components/landing/` on static
placeholder data until the Phase 4 backend lands. No fake testimonials.
