import type { LinkFields } from "../lib/links";

/** Name, address and short description of a link (new and edit pages). */
export function LinkFormFields({ values, showVisible }: { values: Partial<LinkFields>; showVisible: boolean }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Név
        </label>
        <input id="title" name="title" className="input" defaultValue={values.title ?? ""} maxLength={80} required placeholder="Discord szerver" />
      </div>
      <div>
        <label className="label" htmlFor="url">
          Cím
        </label>
        <input id="url" name="url" type="url" className="input" defaultValue={values.url ?? ""} required placeholder="https://…" />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Rövid leírás (nem kötelező)
        </label>
        <input id="description" name="description" className="input" defaultValue={values.description ?? ""} maxLength={160} placeholder="Itt egyeztetünk és beszélgetünk" />
      </div>
      {showVisible && (
        <label className="flex items-start gap-2">
          <input type="checkbox" name="visible" defaultChecked={values.visible ?? true} className="mt-1" />
          <span>
            Látható a Linkek oldalon
            <span className="muted block text-sm">Kikapcsolva a link elrejtődik, de megmarad későbbre.</span>
          </span>
        </label>
      )}
    </div>
  );
}
