"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * "Kitiltás" with a second confirmation: the first click only opens a warning box, the ban
 * happens on its own red button. Mégse closes the box again.
 */
export function BanButton({ profileId, name, action }: { profileId: string; name: string; action: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
        Kitiltás
      </button>
    );
  }

  return (
    <div className="alert-error space-y-3" role="alertdialog" aria-label="Kitiltás megerősítése">
      <p>
        <strong>Biztosan kitiltod: {name}?</strong>
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>A Discord fiókjával többé nem tud belépni, és azonnal kilép az oldalról.</li>
        <li>A profilképe törlődik. A meccsei és a Karnyx neve megmaradnak.</li>
        <li>A tiltást később itt fel tudod oldani.</li>
      </ul>
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="profile_id" value={profileId} />
        <SubmitButton className="btn btn-danger">Igen, kitiltom</SubmitButton>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
          Mégse
        </button>
      </form>
    </div>
  );
}
