"use client";
import { useState } from "react";
import { Button, IconButton, TextInput, Field, ChoiceChips, Stepper, Sheet, Card } from "@/app/components/ui";

// Living style guide — a gallery of the UI kit. Visit /style-guide.
// Use this to eyeball design changes: tweak a component in app/components/ui
// and every usage (and this page) updates.
export default function StyleGuidePage() {
  const [chip, setChip] = useState("wet");
  const [ml, setMl] = useState(60);
  const [text, setText] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-8 px-5 py-8">
      <header>
        <h1 className="text-2xl font-bold text-brand-600">🐣 Nestling — Style Guide</h1>
        <p className="text-sm text-gray-500">The shared UI kit. Change a primitive once → it updates everywhere.</p>
      </header>

      <Section title="Brand color scale">
        <div className="flex gap-1">
          {[
            ["50", "bg-brand-50"],
            ["100", "bg-brand-100"],
            ["200", "bg-brand-200"],
            ["300", "bg-brand-300"],
            ["400", "bg-brand-400"],
            ["500", "bg-brand-500"],
            ["600", "bg-brand-600"],
            ["700", "bg-brand-700"],
            ["800", "bg-brand-800"],
            ["900", "bg-brand-900"],
          ].map(([label, cls]) => (
            <div key={label} className="flex-1 text-center">
              <div className={`h-10 rounded ${cls}`} />
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">Defined in tailwind.config.ts → theme.extend.colors.brand.</p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="sm" variant="secondary">Small</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <Button fullWidth className="mt-3">Full width</Button>
      </Section>

      <Section title="Icon buttons">
        <div className="flex gap-2">
          <IconButton label="Edit" tone="brand">✏️</IconButton>
          <IconButton label="Delete" tone="danger">🗑️</IconButton>
          <IconButton label="Close">✕</IconButton>
        </div>
      </Section>

      <Section title="Text input & field">
        <Field label="Baby's name">
          <TextInput placeholder="e.g. Baby Test" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      </Section>

      <Section title="Choice chips">
        <ChoiceChips options={["wet", "dirty", "mixed"]} value={chip} onChange={setChip} />
        <p className="mt-1 text-xs text-gray-400">Selected: {chip}</p>
      </Section>

      <Section title="Stepper">
        <Stepper label="Amount" value={ml} step={10} unit="ml" onChange={setMl} />
      </Section>

      <Section title="Card">
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-xl">👶</span>
          <div>
            <p className="font-semibold">Card title</p>
            <p className="text-sm text-gray-500">Subtitle text</p>
          </div>
        </Card>
        <Card subtle className="mt-2">Subtle card (list row)</Card>
      </Section>

      <Section title="Sheet (bottom sheet)">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open sheet</Button>
        {sheetOpen && (
          <Sheet onClose={() => setSheetOpen(false)} title="Example sheet">
            <p className="text-sm text-gray-500">Any content goes here.</p>
            <Button fullWidth className="mt-4" onClick={() => setSheetOpen(false)}>Done</Button>
          </Sheet>
        )}
      </Section>

      <Section title="Type scale">
        <p className="text-2xl font-bold">Heading — text-2xl bold</p>
        <p className="text-base font-bold">Emphasis — text-base bold</p>
        <p className="text-sm">Body — text-sm</p>
        <p className="text-xs text-gray-400">Muted caption — text-xs gray-400</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
      {children}
    </section>
  );
}
