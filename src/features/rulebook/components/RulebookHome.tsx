import { entryUrl, HOME_GROUPS } from "../lib/pages";

/**
 * The Szabálytár start page: RulePop's two button groups. Every button opens its rule as a
 * popup (RulebookViewer); plain links, so they also work before the page's script has loaded.
 */
export function RulebookHome() {
  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Szabálytár</h1>
        </div>
        <p className="lead">
          A Dice Throne szabályai magyarul. Kattints egy témára; a szabályon belül minden kiemelt szó egy másik szabályhoz visz.
          Minden szabálynak saját linkje van: a címére kattintva kimásolod.
        </p>
      </div>

      {HOME_GROUPS.map((g) => (
        <section key={g.title} className="rp-group">
          <h2>{g.title}</h2>
          <ul>
            {g.items.map(([label, id]) => (
              <li key={id}>
                <a href={entryUrl({ kind: "rule", id })}>{label}</a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="rp-home-foot">
        <ul>
          <li>
            <a href={entryUrl({ kind: "rule", id: "about" })}>Névjegy</a>
          </li>
          <li>
            <a href="https://dice-throne.rulepop.com/" target="_blank" rel="noopener noreferrer">
              Eredeti Rulepop
            </a>
          </li>
          <li>
            <a href="https://dicethrone.com" target="_blank" rel="noopener noreferrer">
              dicethrone.com
            </a>
          </li>
        </ul>
        <p className="muted text-sm">
          A Dice Throne Rulepop nem hivatalos magyar fordítása, a Dice Throne Hungary közösségtől. A Dice Throne a Roxley Games védjegye.
        </p>
      </footer>
    </div>
  );
}
