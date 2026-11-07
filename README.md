# Student Support Tracker

A student support tracker for Special Needs Assistants (SNAs) and teachers, from
[Autism & Me](https://autismandme.ie).

**Change the environment, not the child.**

It keeps one student's day in one place: their schedule, what helps, what gets in
the way, the activities they took part in, messages home, and their support plan.

## Running it

```bash
npm install
npm run dev      # http://localhost:5000
npm run build    # typechecks, then builds
npm run lint
```

The app stores data through the Spark key-value service, provided by the hosting
environment. Running outside that environment, key-value reads return 401 and the
app sits on the sign-in screen.

## Brand

This app follows the Autism & Me brand kit (edition 1.1):

- **Ground** is cream `#F8F5EF`, **text** is teal `#074151` (10.2:1), and there is
  at most one orange `#F2863D` action per screen. Orange and dusty blue never
  carry white text.
- **Type** is Poppins for headings, labels and buttons, Atkinson Hyperlegible for
  body, at 18px with 1.6 line height.
- **Colour tokens** live in `src/index.css` and drive every shadcn component, so
  components should use the tokens rather than hard-coded colours.
- **The logo** is in `src/assets/brand/` and is used through
  `src/components/brand/Logo.tsx`, which encodes the placement rules: which file
  on which ground, clear space, minimum size. The logo is never redrawn,
  regenerated, recoloured, or placed on dusty blue.
- **Access**: 44px tap targets, a visible focus ring, `prefers-reduced-motion`
  support, no autoplay or flashing, and every text pair at WCAG 2.2 AA.

Irish sector terms are used throughout and acronyms are spelled out on first use.
Class and year groups run Junior Infants to 6th Year and live in
`src/lib/schoolTerms.ts`.

## Licence

The Spark template files and resources from GitHub are licensed under the terms of
the MIT licence, Copyright GitHub, Inc.
