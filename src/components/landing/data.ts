// TODO(Phase 4): replace everything in this file with real Supabase queries —
// verified doctors (with next-available indicator) and live slot generation
// from schedules minus exceptions minus booked appointments. This static data
// exists only so the landing page can ship ahead of the booking backend.

export type LandingDoctor = {
  initials: string;
  name: string;
  meta: string;
  clinic: string;
  fee: string;
  availableToday: boolean;
  nextSlot?: string;
};

export const doctors: LandingDoctor[] = [
  {
    initials: "AS",
    name: "Dr. Ayesha Siddiqui",
    meta: "Dermatologist · MBBS, FCPS · 8 yrs experience",
    clinic: "Hameed Latif Hospital, Garden Town",
    fee: "Rs. 1,500",
    availableToday: true,
  },
  {
    initials: "BA",
    name: "Dr. Bilal Ahmed",
    meta: "Cardiologist · MBBS, FCPS (Cardiology) · 12 yrs",
    clinic: "Doctors Hospital, Johar Town",
    fee: "Rs. 2,500",
    availableToday: true,
  },
  {
    initials: "ST",
    name: "Dr. Sana Tariq",
    meta: "Gynecologist · MBBS, MCPS · 10 yrs experience",
    clinic: "Surgimed Hospital, Gulberg",
    fee: "Rs. 2,000",
    availableToday: false,
    nextSlot: "Tomorrow 10:00 AM",
  },
  {
    initials: "HF",
    name: "Dr. Hamza Farooq",
    meta: "General Physician · MBBS · 6 yrs experience",
    clinic: "Farooq Clinic, Wapda Town",
    fee: "Rs. 1,000",
    availableToday: true,
  },
];

export const specialties = [
  "All",
  "General Physician",
  "Dermatology",
  "Cardiology",
  "Pediatrics",
  "Dentistry",
  "Gynecology",
];

export const searchSpecialties = [
  "Dermatologist",
  "Cardiologist",
  "Gynecologist",
  "General Physician",
  "Pediatrician",
  "Dentist",
];

export type SlotDay = {
  key: string;
  tabLine1: string;
  tabLine2: string;
  /** How the day reads inside the book CTA, e.g. "Book for today · 3:00 PM". */
  bookLabel: string;
  slots: { t: string; booked?: boolean }[];
};

export const slotDays: SlotDay[] = [
  {
    key: "today",
    tabLine1: "Today",
    tabLine2: "Mon 3 Aug",
    bookLabel: "today",
    slots: [
      { t: "3:00 PM" },
      { t: "3:15 PM", booked: true },
      { t: "3:30 PM" },
      { t: "3:45 PM" },
      { t: "4:00 PM", booked: true },
      { t: "4:15 PM" },
      { t: "4:30 PM" },
      { t: "4:45 PM", booked: true },
      { t: "5:00 PM" },
      { t: "5:15 PM" },
      { t: "5:30 PM" },
      { t: "5:45 PM" },
    ],
  },
  {
    key: "tomorrow",
    tabLine1: "Tomorrow",
    tabLine2: "Tue 4 Aug",
    bookLabel: "Tue 4 Aug",
    slots: [
      { t: "12:00 PM" },
      { t: "12:15 PM" },
      { t: "12:30 PM", booked: true },
      { t: "12:45 PM" },
      { t: "1:00 PM" },
      { t: "1:15 PM" },
      { t: "3:00 PM" },
      { t: "3:15 PM" },
      { t: "3:30 PM", booked: true },
      { t: "3:45 PM" },
      { t: "4:00 PM" },
      { t: "4:15 PM" },
    ],
  },
  {
    key: "wed",
    tabLine1: "Wed",
    tabLine2: "5 Aug",
    bookLabel: "Wed 5 Aug",
    slots: [
      { t: "12:00 PM" },
      { t: "12:15 PM" },
      { t: "12:30 PM" },
      { t: "12:45 PM" },
      { t: "1:00 PM" },
      { t: "1:15 PM" },
      { t: "1:30 PM" },
      { t: "1:45 PM" },
    ],
  },
];
