import { InfoTip } from "@/components/InfoTip";
import { FORMAT_LABELS, PLAYABLE_FORMATS } from "@/features/championships/lib/rules";
import type { ChampionshipFormat } from "@/features/championships/lib/types";

const ENGINE_FORMATS: ChampionshipFormat[] = ["swiss", "round_robin", "single_elimination", "double_elimination", "groups_playoffs"];

/** Format and match-length fields of the create form. Formats the web can't pair yet are disabled. */
export function FormatPicker() {
  return (
    <div className="flex flex-wrap gap-3">
      <div>
        <label className="label" htmlFor="format">
          Formátum
          <InfoTip text="Svájci rendszer: minden fordulóban hasonló pontszámú játékosok játszanak egymással, ismétlés nélkül. A többi formátum hamarosan jön." />
        </label>
        <select id="format" name="format" className="input" defaultValue="swiss">
          {ENGINE_FORMATS.map((f) => (
            <option key={f} value={f} disabled={!PLAYABLE_FORMATS.includes(f)}>
              {FORMAT_LABELS[f]}
              {PLAYABLE_FORMATS.includes(f) ? "" : " (hamarosan)"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="best_of">Meccs hossza</label>
        <select id="best_of" name="best_of" className="input" defaultValue="1">
          <option value="1">1 játszma</option>
          <option value="3" disabled>
            Bo3 (hamarosan)
          </option>
          <option value="5" disabled>
            Bo5 (hamarosan)
          </option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="settings_rounds">
          Fordulók száma
          <InfoTip text="Üresen hagyva a jelentkezők számából számolja: 8 játékosnál 3, 16-nál 4 forduló." />
        </label>
        <input id="settings_rounds" name="settings_rounds" type="number" className="input w-32" min={1} max={20} placeholder="automatikus" />
      </div>
      <div>
        <label className="label" htmlFor="round_days">
          Forduló hossza (nap)
          <InfoTip text="Automatikus párosításnál ennyi nap múlva jár le a forduló határideje." />
        </label>
        <input id="round_days" name="round_days" type="number" className="input w-32" min={1} max={60} defaultValue={7} />
      </div>
      <fieldset className="w-full">
        <legend className="label">
          Pontozás
          <InfoTip text="Ennyi pontot ér egy győzelem, döntetlen, vereség és Bye. 0 és 10 között, fél pontos lépésekben. A verseny indulása után nem módosítható. Holtversenynél előbb a Buchholz (az összes ellenfél pontjainak összege), aztán az életerő-különbség dönt." />
        </legend>
        <div className="flex flex-wrap gap-3">
          {POINT_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="label" htmlFor={f.name}>
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type="text"
                inputMode="decimal"
                className={f.placeholder ? "input w-40" : "input w-24"}
                defaultValue={f.value}
                placeholder={f.placeholder}
                required={f.name !== "points_bye"}
              />
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

const POINT_FIELDS = [
  { name: "points_win", label: "Győzelem", value: "1", placeholder: undefined },
  { name: "points_draw", label: "Döntetlen", value: "0,5", placeholder: undefined },
  { name: "points_loss", label: "Vereség", value: "0", placeholder: undefined },
  { name: "points_bye", label: "Bye", value: "", placeholder: "mint a győzelem" },
] as const;
