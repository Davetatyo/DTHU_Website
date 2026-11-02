import { InfoTip } from "@/components/InfoTip";
import { EVENT_KINDS, KIND_LABELS, TENTATIVE_LABEL, type EventKind } from "../lib/events";

export type EventFormValues = {
  title: string;
  kind: EventKind;
  tentative: boolean;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location: string;
  summary: string;
  link_url: string;
  card_only: boolean;
  pinned: boolean;
};

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: "",
  kind: "live",
  tentative: false,
  start_date: "",
  start_time: "",
  end_date: "",
  end_time: "",
  location: "",
  summary: "",
  link_url: "",
  card_only: false,
  pinned: false,
};

/** The event's basic fields, shared by "Új esemény" and the edit page. */
export function EventFormFields({ values, timeZone }: { values: EventFormValues; timeZone: string }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Cím
        </label>
        <input id="title" name="title" className="input" defaultValue={values.title} maxLength={120} required placeholder="Őszi Asztali Nap" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="kind">
            Fajta
            <InfoTip text="Az online bajnokság fordulói maguktól megjelennek a naptárban az Időpontfoglalóból; az „Online bajnokság” fajtát csak egyéb online eseményhez (pl. rájátszás, kupa) használd." />
          </label>
          <select id="kind" name="kind" className="input" defaultValue={values.kind}>
            {EVENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2">
          <input type="checkbox" name="tentative" defaultChecked={values.tentative} />
          <span>
            {TENTATIVE_LABEL}
            <InfoTip text="Még nem végleges esemény: szaggatott kerettel és „Ötlet / tervezett” címkével jelenik meg." />
          </span>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="label">
          Időpont
          <InfoTip text={`Az időpontokat a saját időzónádban (${timeZone}) adod meg. Ha nem adsz meg kezdési időt, egész napos esemény lesz.`} />
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="muted">Kezdés napja</span>
            <input type="date" name="start_date" className="input" defaultValue={values.start_date} required />
          </label>
          <label className="text-sm">
            <span className="muted">Kezdés ideje (nem kötelező)</span>
            <input type="time" name="start_time" className="input" defaultValue={values.start_time} />
          </label>
          <label className="text-sm">
            <span className="muted">Befejezés napja (nem kötelező)</span>
            <input type="date" name="end_date" className="input" defaultValue={values.end_date} />
          </label>
          <label className="text-sm">
            <span className="muted">Befejezés ideje (nem kötelező)</span>
            <input type="time" name="end_time" className="input" defaultValue={values.end_time} />
          </label>
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="location">
          Helyszín
        </label>
        <input id="location" name="location" className="input" defaultValue={values.location} maxLength={200} placeholder="Budapest, … / Online · Discord" />
      </div>

      <div>
        <label className="label" htmlFor="summary">
          Rövid leírás
          <InfoTip text="A kártyán és az esemény oldalának tetején jelenik meg. Egy-két mondat." />
        </label>
        <textarea id="summary" name="summary" className="input" rows={2} defaultValue={values.summary} maxLength={600} />
      </div>

      <div>
        <label className="label" htmlFor="link_url">
          Az esemény linkje (nem kötelező)
          <InfoTip text="Az esemény saját oldala vagy a nevezés. Az esemény oldalán gombként jelenik meg; „csak kártya” eseménynél a kártya ide visz." />
        </label>
        <input id="link_url" name="link_url" type="url" className="input" defaultValue={values.link_url} placeholder="https://…" />
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="card_only" defaultChecked={values.card_only} className="mt-1" />
          <span>
            Csak kártya, saját oldal nélkül
            <span className="muted block text-sm">A kártya egyenesen az esemény linkjére visz. Kikapcsolva az eseménynek saját oldala lesz a leírással.</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="pinned" defaultChecked={values.pinned} className="mt-1" />
          <span>
            Kiemelés
            <span className="muted block text-sm">A kiemelt események elöl jelennek meg a naptárban.</span>
          </span>
        </label>
      </div>
    </div>
  );
}
