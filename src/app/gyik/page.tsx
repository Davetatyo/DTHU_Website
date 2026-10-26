import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "GYIK · DTHUN Meccsszervező" };

type Item = { q: string; a: React.ReactNode };
type Section = { title: string; items: Item[] };

// Keep these answers in line with how the app actually behaves when features change.
const SECTIONS: Section[] = [
  {
    title: "Belépés és profil",
    items: [
      {
        q: "Miért Discorddal kell belépni?",
        a: "Így nem kell külön jelszó, és az oldal megtudja a Discord nevedet. Ebből látja az ellenfeled, hogy kit keressen, és ezért tud a bot megjelölni (pingelni) a versenycsatornában.",
      },
      {
        q: "Mit adjak meg a profilomban?",
        a: "Válaszd ki a Karnyx nevedet a listából, és add meg a Facebook nevedet, hogy a csoportban is megtaláljanak. Az időzóna alapból Budapest; csak akkor állítsd át, ha máshol vagy, mert minden időpontot ebben látsz.",
      },
      {
        q: "Nem találom a Karnyx nevemet a listában.",
        a: "A lista az admin által beillesztett párosításokból készül, ezért akkor jelenik meg, ha már szerepelsz egy fordulóban. Ha a neved mégsem szerepel, valószínűleg más foglalta le tévedésből: szólj egy adminnak, aki felszabadítja.",
      },
      {
        q: "Nem játszom, csak szervező vagy néző vagyok. Mit válasszak?",
        a: "A profilodban a Karnyx név listájából válaszd a „Nem játszom ebben a versenyben” lehetőséget, és add meg a Facebook nevedet. Így senki Karnyx nevét nem foglalod le, és ugyanúgy látod a meccseket és a menetrendet. Ha később játszol, csak válaszd ki a nevedet.",
      },
      {
        q: "Hogyan lesz valaki admin?",
        a: "Előbb lépjen be egyszer az oldalra Discorddal. Utána egy admin az Admin felületen, a „Felhasználók és adminok” részben a Discord vagy Karnyx neve alapján adminná teheti. Adminnak nem kell játszania a versenyben.",
      },
      {
        q: "Ki látja a Facebook és Discord nevemet?",
        a: "Csak a bejelentkezett felhasználók. A közelgő meccsek listája és a naptár nyilvános, de ott csak a Karnyx nevek szerepelnek.",
      },
    ],
  },
  {
    title: "Ellenfél és időpont egyeztetés",
    items: [
      {
        q: "Hol látom, ki az ellenfelem?",
        a: (
          <>
            A <Link href="/" className="link">Főoldalon</Link>, a „Következő meccsem” kártyán. Rákattintva a meccs oldalára jutsz,
            ahol az ellenfeled Facebook és Discord neve is látszik.
          </>
        ),
      },
      {
        q: "Hogyan javasoljak időpontot?",
        a: "A meccs oldalán válassz egy napot, írd be az időt, és add hozzá. Legfeljebb 3 időpontot küldhetsz egyszerre, a forduló határidejéig. Az ellenfeled kiválaszt egyet, vagy újakat javasol.",
      },
      {
        q: "Az ellenfelem javasolt időpontokat. Mit csináljak?",
        a: "A meccs oldalán az „Elfogadom” gombbal választhatsz egyet, és a meccs megerősítetté válik. Ha egyik sem jó, javasolj te újakat; ilyenkor az ő javaslatai érvényüket vesztik.",
      },
      {
        q: "Elfogadhatom a saját javaslatomat?",
        a: "Nem. Mindig a másik fél dönt, így biztos, hogy mindketten egyetértetek az időpontban.",
      },
      {
        q: "Mégsem jó a megbeszélt időpont. Mit tegyek?",
        a: "Javasolj új időpontokat a meccs oldalán. A korábbi egyeztetés ekkor törlődik, és újra az ellenfeled választ.",
      },
      {
        q: "Az ellenfelem még nem regisztrált az oldalon.",
        a: "Ilyenkor nem kap Discord értesítést. Az „Üzenet másolása Facebookra” gombbal kimásolhatsz egy kész üzenetet a meccs linkjével, és elküldheted neki a csoportban.",
      },
      {
        q: "Mi a határidő?",
        a: "Minden forduló legfeljebb egy hétig tart, a határidő a meccs oldalán látszik. Időpontot csak eddig lehet javasolni. Ha mindenki hamarabb végez, a következő forduló korábban indulhat.",
      },
      {
        q: "Mit jelent a Bye?",
        a: "Ha valaki nem kap ellenfelet egy fordulóban, az Bye-t kap, vagyis pihen. Ilyenkor nincs mit egyeztetnie. A forduló indításakor a Discord üzenet végén a „Pihen:” sorban szerepel.",
      },
    ],
  },
  {
    title: "Lejátszás és eredmény",
    items: [
      {
        q: "Hol játsszuk a meccset?",
        a: "Discordon, a megbeszélt időpontban.",
      },
      {
        q: "Mire való a „Lejátszottuk” gomb?",
        a: "Ezzel jelzitek, hogy a meccs megvolt. Bármelyik játékos megnyomhatja. Ha egy forduló minden meccse lejátszva, az admin elindíthatja a következőt.",
      },
      {
        q: "Hová írjuk be az eredményt?",
        a: "Továbbra is a Karnyxba. Ez az oldal csak az ellenfél megtalálásában és az időpont egyeztetésében segít, az eredményeket és a tabellát a Karnyx vezeti.",
      },
    ],
  },
  {
    title: "Értesítések és naptár",
    items: [
      {
        q: "Milyen Discord értesítéseket kapok?",
        a: "A versenycsatornában a bot megjelöl, amikor indul egy forduló, amikor az ellenfeled időpontot javasol neked, és ha 48 órával a határidő előtt még nincs megbeszélt időpontotok. Az admin kézzel is küldhet emlékeztetőt. A megerősített időpontok is megjelennek, de jelölés nélkül.",
      },
      {
        q: "Nem kapok jelölést Discordon.",
        a: "A jelöléshez legalább egyszer be kell lépned az oldalra Discorddal, és tagja kell legyél a közösség Discord szerverének.",
      },
      {
        q: "Hogyan teszem a meccset a naptáramba?",
        a: "Megerősítés után a meccs oldalán a „Google Naptár” vagy az „Apple / Outlook” gombbal. Ha minden meccset látni szeretnél, a Közelgő meccsek oldalon feliratkozhatsz a teljes verseny naptárára, vagy csak egy játékoséra.",
      },
      {
        q: "Miért nem frissül azonnal a Google Naptár?",
        a: "A Google a feliratkozott naptárakat csak néhány óránként frissíti. Az Apple és az Outlook gyakrabban, de egy-egy változás ott is késhet egy kicsit.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gyakran ismételt kérdések</h1>
        <p className="muted mt-1">
          Nem találod a választ? Írj egy adminnak a Facebook csoportban vagy Discordon.
        </p>
      </div>
      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-lg font-bold">{section.title}</h2>
          {section.items.map((item) => (
            <details key={item.q} className="card group py-3">
              <summary className="cursor-pointer list-none font-semibold">
                <span className="muted mr-2 inline-block transition-transform group-open:rotate-90">›</span>
                {item.q}
              </summary>
              <div className="muted mt-2 pl-4 text-sm leading-relaxed">{item.a}</div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
