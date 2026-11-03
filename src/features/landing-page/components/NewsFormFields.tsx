import { InfoTip } from "@/components/InfoTip";
import { CATEGORY_LABELS, OFFERED_CATEGORIES, type NewsCategory } from "../lib/news";
import type { NewsAuthor } from "../lib/news-data";

export type NewsFormValues = { title: string; category: NewsCategory; lead: string; author_id: string; pinned: boolean };

/** The article's basic fields, shared by "Új hír" and the edit page. */
export function NewsFormFields({ values, authors }: { values: NewsFormValues; authors: NewsAuthor[] }) {
  const categories = OFFERED_CATEGORIES.includes(values.category) ? OFFERED_CATEGORIES : [...OFFERED_CATEGORIES, values.category];
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Cím
        </label>
        <input id="title" name="title" className="input" defaultValue={values.title} maxLength={140} required placeholder="Elindult a 2. forduló" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Rovat
          </label>
          <select id="category" name="category" className="input" defaultValue={values.category}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="author_id">
            Szerző
            <InfoTip text="A hír tetején a szerző neve és profilképe jelenik meg." />
          </label>
          <select id="author_id" name="author_id" className="input" defaultValue={values.author_id}>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="lead">
          Bevezető
          <InfoTip text="1–2 mondat. A kártyán és a hír tetején, kiemelve jelenik meg, és ez látszik, ha valaki megosztja a linket." />
        </label>
        <textarea id="lead" name="lead" className="input" rows={2} defaultValue={values.lead} maxLength={400} />
      </div>
      <label className="flex items-start gap-2">
        <input type="checkbox" name="pinned" defaultChecked={values.pinned} className="mt-1" />
        <span>
          Kiemelés
          <span className="muted block text-sm">A kiemelt hír elöl marad, amíg egy admin ki nem veszi a kiemelést.</span>
        </span>
      </label>
    </div>
  );
}
