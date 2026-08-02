# Auth — Phase 1 (email/password)

Email/password auth via Supabase, with the phone number still collected and
stored (E.164, `+92…`) during the complete-your-profile step — Phase 5 SMS
notifications depend on it. Phone OTP login is deliberately not implemented
yet, but the layer is shaped so it can be added without restructuring (see
[Adding phone OTP later](#adding-phone-otp-later)).

## How it fits together

| Piece            | File                                   | Job                                                                                                       |
| ---------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Validators       | `src/lib/validators/auth.ts`           | Zod schemas; `normalizePakPhone()` turns `0300…`/`92300…`/`3…` into `+92300…`                             |
| Server actions   | `src/actions/auth.ts`                  | `signUp`, `signIn`, `completeProfile`, `signOut` — the only code that touches Supabase auth mutations     |
| Routing rules    | `src/lib/auth/routes.ts`               | Pure role→route mapping shared by proxy and server code                                                   |
| DAL              | `src/lib/auth/dal.ts`                  | `getUser` / `getProfile` (request-cached), `requireRole` — the authoritative guards                       |
| Proxy            | `src/proxy.ts`                         | Session cookie refresh on every request (this is what makes sessions persist) + optimistic role redirects |
| Confirm callback | `src/app/(auth)/auth/confirm/route.ts` | Handles the email-confirmation link (`token_hash` and PKCE `code` styles)                                 |

Role routing: `patient → /dashboard`, `doctor → /doctor`, `admin → /admin`.
A logged-in user without a phone on their profile is always routed to
`/complete-profile` first. The proxy's redirects are optimistic only — every
area layout/page re-checks with `requireRole()`, and RLS is the backstop.

## Supabase dashboard setup (one-time)

1. **Auth → URL Configuration**
   - Site URL: your deployment URL (use `http://localhost:3000` for dev).
   - Redirect URLs: add `http://localhost:3000/auth/confirm` (and the
     production equivalent).
2. **Auth → Email Templates → Confirm signup** (recommended): point the link
   at our callback so confirmation works server-side in every browser:

   ```html
   <a
     href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/complete-profile"
   >
     Confirm your email
   </a>
   ```

   The default `{{ .ConfirmationURL }}` template also works (the callback
   handles the `?code=` redirect), but only in the browser that signed up.

3. If you want signup without email confirmation during development:
   Auth → Providers → Email → disable "Confirm email". The code handles both
   modes.

## Promote a user to admin (manual SQL)

Run in the Supabase SQL editor (service role — bypasses RLS). The user must
have signed up first:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

Verify:

```sql
select p.role, p.full_name, u.email
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'admin@example.com';
```

Takes effect on the user's next request — the role is read from `profiles`
per request, never cached in the JWT. The same pattern promotes doctors in
Phase 2 (though doctor accounts will normally be created from `/admin`).

## Adding phone OTP later

Nothing needs restructuring; OTP is additive:

1. Enable an SMS provider under Auth → Providers → Phone in Supabase.
2. Add two actions to `src/actions/auth.ts` with the same `AuthFormState`
   contract:
   - `requestOtp`: validate with the existing `pakPhoneSchema`, then
     `supabase.auth.signInWithOtp({ phone })`.
   - `verifyOtp`: `supabase.auth.verifyOtp({ phone, token, type: "sms" })`,
     then `redirect(postAuthPath(profile, next))` — identical tail to
     `signIn`.
3. Add a "Login with SMS code" tab to the login page reusing `FormField`.

Why nothing else changes: OTP produces the same Supabase session cookie via
`@supabase/ssr`, so the proxy, DAL, RLS, and role routing are untouched, and
profile phones are already stored E.164-normalized so they match Supabase's
phone identity format directly.
