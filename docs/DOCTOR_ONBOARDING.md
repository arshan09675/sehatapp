# Doctor onboarding — how a new doctor gets their account and first login

## Who creates doctor accounts

Only admins, from **/admin/doctors/new**. The server action
(`createDoctor` in `src/actions/doctors.ts`) verifies the caller is an
admin (`requireRole("admin")`) before touching the Supabase service-role
(admin) client. There is no public doctor signup.

What the action does, in order:

1. Creates the auth user via `auth.admin.createUser` with a **generated
   temporary password** and `email_confirm: true` (no confirmation email is
   needed — the admin vouches for the address).
2. The `on_auth_user_created` DB trigger inserts a `profiles` row; the action
   promotes it to `role = 'doctor'` and stores the E.164 phone number.
3. Uploads the photo (if any) to the public `doctor-photos` Storage bucket
   (JPEG/PNG/WebP, ≤ 2 MB) — writes to that bucket only ever happen through
   the service-role client; there are no client-side storage write policies.
4. Inserts the `doctors` row (PMC number, specialty, qualifications, bio,
   experience, photo URL) and the `doctor_clinics` assignments with the
   per-clinic fee.
5. On any failure mid-way, the auth user (and via cascade the profile /
   doctor rows) and any uploaded photo are rolled back, so a retry starts
   clean.

## First login flow (temporary password)

We use a **temporary-password handover**, not an email invite link:

1. After saving, the admin sees the doctor's email and the generated
   temporary password **exactly once**, with copy buttons.
2. The admin shares those credentials with the doctor out-of-band
   (WhatsApp/SMS/phone — most Pakistani doctors onboard via a phone call).
3. The doctor opens **/login**, signs in with email + temporary password,
   and the role-based proxy routes them straight to **/doctor**. Their phone
   number was already set by the admin, so the complete-profile step is
   skipped.
4. The doctor should change the password from their profile settings once
   the Phase 3 doctor dashboard ships. Until then, if a password is lost,
   any admin can issue a fresh temporary password from the doctor's detail
   page (**Reset password** — shown once, same handover flow).

### Why not an email invite link?

`auth.admin.inviteUserByEmail` would email a magic link instead, which is a
fine upgrade later. It requires production SMTP to be configured on the
Supabase project and doctors who actually read email — neither is a given
at this stage. The temporary-password flow works over the channel doctors
already use (WhatsApp) and needs no email deliverability. Switching later
only means replacing the `createUser` password with `inviteUserByEmail` in
`createDoctor`; nothing downstream changes.

## Verification

A new doctor is **unverified** and invisible to all public queries (RLS:
`doctors_public_read` requires `is_verified`). The booking RPC also refuses
unverified doctors (`DOCTOR_NOT_VERIFIED`).

To verify: **/admin/verification** lists the queue, oldest first. For each
doctor, the admin looks up the PMC number on the
[PMDC public register](https://www.pmdc.pk/practitioners), confirms name and
specialty match, then clicks **Mark as verified** (with a confirm prompt).
The `verifyDoctor` server action — again admin-gated, service-role client —
stamps `is_verified`, `verified_at`, and `verified_by` (the acting admin's
profile id).
