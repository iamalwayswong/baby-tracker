# Nestling — Style Guide

The app deliberately funnels all UI through a small shared kit so a design change
happens in **one place**. Live gallery: run the app and visit **`/style-guide`**.

## Principles

- **Mobile-first, one-handed.** Big tap targets; the `tap` utility (in `globals.css`) removes the tap highlight and sets `touch-action: manipulation`.
- **One source of truth per pattern.** Don't hand-roll a button/input/sheet — use the kit. If the kit can't do it, extend the kit, don't fork it.
- **Semantic color, not raw palette.** Use `brand-*` for the accent, never `indigo-*` directly. Per-tracker colors live in `lib/events.ts` (`EVENT_DEFS[type].color`).
- **No native dialogs.** Never use `window.confirm`/`alert`. Use `ConfirmModal` for confirmations (destructive actions, discarding unsaved changes).

## Design tokens

| Token | Where | Notes |
|---|---|---|
| **Brand accent** | `tailwind.config.ts` → `theme.extend.colors.brand` (50–900) | Change these hex values to re-theme every button/link/chip/active state at once. Currently the indigo scale. |
| **App background / text** | `app/globals.css` (`--background`, `--foreground`) | Warm off-white page bg. |
| **Radius** | Tailwind defaults | `rounded-xl` for controls, `rounded-2xl` for cards, `rounded-t-3xl` for sheets. |
| **Phone frame** | `app/layout.tsx` | Everything is centered in `max-w-md`. Full-bleed views (grid) use `fixed inset-0`. |

## The UI kit — `app/components/ui/`

Import from the barrel: `import { Button, TextInput, ... } from "@/app/components/ui"`.

| Component | Purpose | Key props |
|---|---|---|
| `Button` | The only button | `variant` (`primary`\|`secondary`\|`ghost`\|`danger`\|`destructive`), `size` (`sm`\|`md`), `fullWidth`, `loading` |
| `IconButton` | Icon/emoji tap target (edit, delete, close) | `label` (required, a11y), `tone` (`default`\|`brand`\|`danger`) |
| `TextInput` | Text/date/number input | native input props; forwards `ref` |
| `Field` | Label above a control | `label` |
| `ChoiceChips` | Single-select toggle chips | `options` (`string[]` or `{value,label}[]`), `value`, `onChange` |
| `Stepper` | +/- number entry | `label`, `value`, `step`, `unit`, `onChange` |
| `Sheet` | Bottom-sheet scaffold (backdrop, drag-to-dismiss handle, ✕ close, title) | `onClose`, `title`, `showClose`. Backdrop tap / ✕ / drag-down all call `onClose` — the parent decides (e.g. confirm unsaved changes). |
| `Card` | Bordered white container | `subtle` (softer border for list rows) |
| `ConfirmModal` | Custom in-app confirm dialog (never `window.confirm`) | `title`, `message`, `confirmLabel`, `tone` (`primary`\|`danger`), `loading`, `onConfirm`, `onCancel` |

`cn(...)` in `lib/cn.ts` joins class names (drops falsy). Every kit component takes a
`className` that merges last, so callers can tweak spacing without forking.

## How to make common changes

- **Recolor the whole app:** edit the `brand` scale in `tailwind.config.ts`.
- **Restyle every button:** edit `app/components/ui/Button.tsx` (variants/sizes live in the `VARIANTS`/`SIZES` maps).
- **Change input look:** edit `TextInput.tsx`.
- **Add a tracker's detail fields:** edit `lib/detailFields.ts` (shared by the events grid and the edit sheet).
- **Add a new component:** create it in `app/components/ui/`, export it from `index.ts`, and add a demo to `app/style-guide/page.tsx`.

## Intentional exceptions

- **`NursingSheet`** is a bespoke full-screen timer (rose theme, big L/R targets) — not built from `Sheet`/`Button` on purpose.
- **`EventsGrid`** table cells use compact, dense inputs rather than `TextInput`/`Stepper` because it's a spreadsheet; its toolbar/header buttons do use `Button`.
