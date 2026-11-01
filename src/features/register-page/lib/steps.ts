export type RegistrationStep = {
  number: number;
  title: string;
  description: string;
  detail: string;
  iconId: "link" | "die" | "swords" | "trophy" | "scroll" | "cal";
};

export const REGISTRATION_STEPS: RegistrationStep[] = [
  {
    number: 1,
    title: "Discord fiók",
    description: "Készíts egy Discord fiókot, ha még nincs.",
    detail:
      "A DTHU közössége Discordon szerveződik. A belépéshez Discord fiók szükséges — ez ingyenes és pár perc alatt elkészül. Ha már van fiókod, egyből léphetsz a következő lépésre.",
    iconId: "link",
  },
  {
    number: 2,
    title: "Belépés az oldalra",
    description: "Kattints a „Belépés Discorddal” gombra.",
    detail:
      "Az oldal tetején (vagy lent ezen az oldalon) találod a belépés gombot. A Discord fiókoddal azonosítod magad — a rendszer nem kér jelszót, sem e-mailt. A Discord neved alapján az ellenfeled megtalál a Discord csatornán.",
    iconId: "die",
  },
  {
    number: 3,
    title: "Profil kitöltése",
    description: "Add meg a Karnyx és a Facebook neved.",
    detail:
      "Belépés után a profilodon válaszd ki a Karnyx nevedet (a bajnoksági feliratkozásnál kapott neved). Ha nincs ilyen, válaszd az „Egyedi” opciót és írd be. Add meg a Facebook nevedet is, hogy az ellenfeled megtaláljon a csoportban.",
    iconId: "scroll",
  },
  {
    number: 4,
    title: "Időpont egyeztetés",
    description: "Egyeztess meccset az ellenfeleddel!",
    detail:
      "Az Áttekintés oldalon látod a párosításodat és az ellenfeled nevét. Kattints a meccsre, javasolj 1–3 időpontot, és várd meg, hogy az ellenfeled elfogadja. A megerősített időpont bekerül a naptáradba is, ha feliratkozol.",
    iconId: "cal",
  },
];

export type HowItWorksItem = {
  title: string;
  description: string;
  iconId: "die" | "swords" | "cal" | "trophy";
};

export const HOW_IT_WORKS: HowItWorksItem[] = [
  {
    title: "Párosítások",
    description:
      "A verseny adminisztrátor a Karnyx rendszerből importálja a fordulók párosításait. Az aktuális fordulóban mindenki kap egy ellenfelet (vagy pihenőt).",
    iconId: "swords",
  },
  {
    title: "Időpontjavaslat",
    description:
      "A meccsoldaladon javasolhatsz 1–3 időpontot. Az ellenfeled értesítést kap Discordon, és elfogadhatja valamelyiket. Te is elfogadhatod az ő javaslatait.",
    iconId: "cal",
  },
  {
    title: "Lejátszás és eredmény",
    description:
      "A megerősített időpontban játszátok le a meccset. Utána bármelyikőtök megnyomhatja a „Lejátszottuk” gombot. Az eredmény megjelenik a ranglistán.",
    iconId: "trophy",
  },
];
