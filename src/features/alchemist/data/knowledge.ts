// Content from reference/artifact (the prototype), unchanged unless noted.

import { RT_HEROES } from "@/features/rulebook/data/heroes";

/** Short answers to rule pages: rule id → [answer HTML, extra keywords]. */
export const AQ: Record<string, [string, string]> = {
  // rövid válaszok a szabálylapokhoz + extra kulcsszavak
  elokeszites:['Kezdéskor <b>50 életerő</b> (1v1), <b>2 CP</b> és <b>4 lap</b>. Egy kockadobás dönti el, ki kezd, és a kezdő kihagyja az első Bevételi fázisát.','kezdes kezdo kezdeskor start setup elokeszit ki kezd elso jatekos hany lappal kezdunk kezdo kez'],
  kor:['Egy kör sorrendje: <b>Fenntartás → Bevétel → Fő fázis 1 → Támadó dobás → (Célzó dobás) → Védekező dobás → Fő fázis 2 → Eldobás</b>.','kor menete fazis fazisok sorrend turn mi jon'],
  gyozelem:['Aki 0 életerőre esik, kiesik, és az utolsó talpon maradó nyer. Ha a megmaradt játékosok egyszerre esnek ki, <b>döntetlen</b>.','nyer nyeres gyozelem vereseg vesztes kieses meghal nulla dontetlen'],
  fogalmak:['<b>Komplexitási szint</b>: mennyire nehéz a hőst jól játszani (1–6), nem az ereje. <b>Választott játékos</b>: bárki, akár te is. <b>Választott ellenfél</b>: aki nem te vagy, és nem a csapattársad.','komplexitas nehezseg valasztott jatekos valasztott ellenfel fogalom jelent'],
  akciokartyak:['<b>Piros</b> = Azonnali akció (bármikor), <b>narancs</b> = Dobási fázis lap (bárki dobási fázisában), <b>kék</b> = Fő fázis lap (csak a saját Fő fázisodban). A bal felső szám a CP-ár.','akciokartya piros narancs kek szin kartya tipus mikor jatszhato kijatsz azonnali'],
  tamadasmodositok:['A támadásmódosító sebzést ad a támadásodhoz, <b>ugyanolyan típusút</b>, mint az eredeti. Csak sebző támadásra használható, és az ellenfél védekező dobása előtt és után is kijátszható.','tamadasmodosito modosito bonusz plusz sebzes noveles hozzaad'],
  cp:['Kezdéskor <b>2 CP</b>, minden Bevételi fázisban <b>+1</b>, egy lap eladása <b>1 CP</b>. Legfeljebb <b>15 CP</b> lehet nálad.','cp harci pont penz mennyi maximum max eladas elad lopas'],
  tarsak:['A társak <b>nem állapotjelzők</b>, ezért a jelzőkre ható lapok nem érintik őket. A szabályuk a hős lapján van.','tars tarsak companion segito idezett leny'],
  sebzestipusok:['<b>Normál</b>: védhető. <b>Kivédhetetlen</b>: nem védhető, de megelőzhető. <b>Tiszta</b>: nem védhető és nem módosítható. <b>Járulékos</b>: nem számít támadásnak. <b>Ultimate</b>: semmi sem állítja meg, csak növelhető.','sebzes tipus normal kivedhetetlen tiszta jarulekos fajta'],
  vedekezo:['Ha legalább 1 <b>védhető</b> sebzés ér, választasz egy védekező képességet, és <b>egyszer</b> dobsz vele. Minden kidobott eredmény felhasználható.','vedekezo dobas vedekezes vedes vedekez defense'],
  eldobas:['A köröd végén legfeljebb <b>6 lap</b> lehet a kezedben, a többit 1-1 CP-ért eladod. Más játékos körében lehet nálad több is.','kezlimit kez limit hat lap eldobas eldobasi tobb lap max lap kor vegen nalam kezemben kezben'],
  'vegso-sebzes':['Először minden <b>összeadás és kivonás</b>, utána a <b>szorzás és osztás</b>, végül <b>felfelé kerekítünk</b>.','vegso sebzes szamol kiszamol kerekit felez szorzas osztas'],
  eletero:['1v1-ben <b>50</b> életerővel kezdesz, és legfeljebb <b>10-zel gyógyulhatsz fölé</b>, vagyis 60-ig.','eletero elet hp gyogyul gyogyulas maximum heal'],
  hostabla:['A hőstáblán vannak a képességeid, az Ultimate és a fejlesztési helyek. A rád tett jelzők a közepére kerülnek.','hostabla tabla board kepesseg'],
  hoskartyak:['<b>4 lappal</b> kezdesz, és minden Bevételi fázisban húzol egyet. Ha elfogy a pakli, a dobópaklit megkevered, és az lesz az új pakli.','pakli elfogy huzo huzas kever dobopakli lapok'],
  fejlesztesek:['Fejlesztést csak a saját Fő fázisodban rakhatsz fel. <b>1-ről 3-ra is ugorhatsz</b> a 3. szint teljes áráért, 2-ről 3-ra csak a különbözetet fizeted. Felrakás után nem adható el.','fejlesztes fejleszt upgrade szint harmadik ugr'],
  bevetel:['Bevételi fázisban <b>+1 CP</b> és <b>1 lap</b>. A kezdő játékos az első körében kihagyja.','bevetel income huz'],
  fofazis:['Fő fázisban lapot adhatsz el, Fő fázis lapot és fejlesztést játszhatsz ki, tetszőleges sorrendben.','fo fazis main'],
  tamado:['<b>3 dobási kísérleted</b> van, bármelyik kockát újradobhatod, a korábban megtartottakat is. Utána <b>egy</b> képességet aktiválsz, vagy egyet sem.','tamado dobas tamadas tamad ujradob dobasi kiserlet harom tobb kepesseg aktival egyszerre'],
  szovegek:['„Dobj [#]” nem dobási kísérlet. A „minden egyes” annyiszor hat, ahány elem van. A „vagy” választást jelent, a „Lopj” elvesz az ellenféltől.','szoveg ertelmez jelent kartya szoveg lopj'],
  allapotjelzok:['Az <b>elkölthető</b> jelzőt bármikor elköltheted, a <b>tartós</b> addig marad, amíg el nem távolítják. Egy fajtából a halmozási limitig gyűjthetsz.','allapotjelzo jelzo token status halmozas limit eltavolit elkolt'],
  celzo:['Célzó dobás csak több ellenfélnél van. King of the Hillben szabadon célzol, csapatmódban kockadobás dönt.','celzo celzas celpont target'],
  idozites:['Az <b>Azonnali akció</b> bármikor jöhet, és megszakít, de őt magát nem lehet megszakítani. Egyidejű cselekvésnél az <b>aktív játékosé az elsőbbség</b>.','idozites megszakit megszakitas mikor elsobbseg sorrend instant'],
  fenntartas:['Fenntartási fázisban lefutnak a „fenntartáskor” hatások, például az égés vagy a méreg. A sebzés a fázis végén jön.','fenntartas upkeep eges mereg'],
  ultimate:['Öt 6-os kell hozzá. Aktiválás után <b>semmi sem állíthatja meg</b>, csak előtte, a kockák megváltoztatásával. A sebzése támadásmódosítóval növelhető.','ultimate ult ulti megallit vedheto hat hatos ot'],
  jatekmodok:['1v1: 50 életerő. King of the Hill: 35 / 25 / 20 (3 / 4 / 5 fő). 2v2, 3v3, 2v2v2: csapatonként közös 50.','jatekmod mod hany fo tobb jatekos'],
  '1v1':['1v1: két játékos, 50–50 életerő, nincs célzó dobás.','1v1 parbaj ketto ket jatekos'],
  kingofthehill:['King of the Hill: bárkit támadhatsz. Ha a <b>Vezetőt</b> (legtöbb életerő) támadod, kapsz egy bónuszlapot.','king hill koth kiraly vezeto mindenki mindenki ellen bonusz'],
  '2v2':['2v2: közös 50 életerő, saját CP. Célzás: 1–2 bal, 3–4 jobb, 5 az ellenfelek döntenek, 6 te választasz.','2v2 csapat ketto ketto'],
  '3v3':['3v3: közös 50 életerő. Célzás: 1–2 bal, 3–4 középső, 5–6 jobb oldali ellenfél.','3v3 harom harom'],
  '2v2v2':['2v2v2: három kétfős csapat, közös 50 életerő. Célzás: 1–4 óramutató szerint, 5–6 te választasz.','2v2v2 harom csapat']
};
export type SiteIntent = { id: string; q: string; a: string; link?: [string, string] };

/** Questions about the site and small talk. Links use routes (converted from the prototype's #hash links). */
export const SITE_INTENTS: SiteIntent[] = [
  {id:'s-ki', q:'ki vagy te kicsoda neved alkimista mi vagy', a:'Az <b>Alkimista</b> vagyok, a DTHU szabályfőzetmestere! Kérdezz a szabályokról, a versenyről vagy a jegyekről. Mesterséges intelligencia nincs bennem, csak egy jól felcímkézett polcnyi előre megírt válasz.'},
  {id:'s-jegy', q:'jegy jegyek hogyan kapok szerzek gyujt ticket', a:'Jegyet kapsz minden lejátszott online meccsért (+1), győzelemért (+1), teljes bajnokságért (+3), élő eseményért (+2), dobogóért (+5/+3/+2) és szervezési segítségért (+2).', link:['/jegyek','Jegyek oldal']},
  {id:'s-bolt', q:'bolt shop vasarol bevalt mire koltheto jutalom mikor nyilik', a:'A bolt még nem nyílt meg. Ha megnyit, rangokra, profilkeretre, sorsolásra, nevezési kedvezményre és kockakészletre válthatod a jegyeidet. Addig jelöld meg, mi érdekel!', link:['/bolt','Bolt']},
  {id:'s-idopont', q:'idopont idopontfoglalo egyeztet meccs mikor jatszunk javasol ellenfel megbeszel', a:'Az Időpontfoglalóban nyisd meg a meccsedet, és javasolj legfeljebb 3 időpontot. Az ellenfeled az „Elfogadom” gombbal erősíti meg.', link:['/meccsszervezo','Időpontfoglaló']},
  {id:'s-eredmeny', q:'eredmeny rogzit karnyx tabella beir hova irom', a:'Az eredményt a <b>Karnyxban</b> rögzítsd, ott vezetik a hivatalos tabellát. Itt csak a „Lejátszottuk” gombot nyomod meg.', link:['https://karnyx.app/','Karnyx megnyitása']},
  {id:'s-hatarido', q:'hatarido meddig lejar fordulo vege mennyi ido', a:`Az aktuális forduló határideje: <b>hétfő (11.02.) 12:25</b>. Egy forduló legfeljebb egy hétig tart.`, link:['/meccsszervezo','Időpontfoglaló']},
  {id:'s-bye', q:'bye pihen pihenes nincs ellenfel paratlan', a:'Ha páratlan a létszám, valaki pihen (bye): abban a fordulóban nincs ellenfele.'},
  {id:'s-rang', q:'ranglista tabella helyezes pontszam ki vezet elso', a:'A Ranglistán szezononként látod a helyezéseket, a pontokat és mindenki kedvenc hősét.', link:['/ranglista','Ranglista']},
  {id:'s-naptar', q:'naptar feliratkoz google apple outlook esemeny verseny mikor lesz', a:'A Versenynaptárban látod a következő fordulókat és élő eseményeket, a meccseket pedig a Google, Apple vagy Outlook naptáradba is felveheted.', link:['/versenynaptar','Versenynaptár']},
  {id:'s-discord', q:'discord belep belepes regisztral fiok', a:'Discorddal lépsz be, külön jelszó nincs. Így az ellenfeled megtalál, és a bot is meg tud jelölni.', link:['https://discord.gg/Y5mJ6Sewy','Csatlakozz a Discord szerverhez']},
  {id:'s-titok', q:'titok titkos easter egg rejtett szin tema lila zold', a:'Psszt… vidd az egeret a téma gomb fölé, és tartsd ott egy másodpercig. Hihi!'},
  {id:'s-hosok', q:'hos hosok hany hos lista melyik hos karakter', a:`Jelenleg <b>${RT_HEROES.length} hőst</b> ismerek. A teljes listát a Szabálytárban találod.`, link:['/szabalytar?tab=hosok','Hősök listája']},
  {id:'s-szin', q:'kedvenc szin szined szinem', a:'Lila, természetesen! Mint a kabátom, a kesztyűm és a legtöbb robbanásom.'},
  {id:'s-vicc', q:'vicc mesélj viccet nevess unatkoz', a:'Miért nem játszik a Ninja King of the Hillt? Mert sosem találják meg, hogy ki legyen a Vezető! Ha-haa… jó, a főzeteim jobbak.'},
  {id:'s-koszi', q:'koszi koszonom kosz thanks szuper kiraly orulok', a:'Szívesen! Ha újabb kérdés bugyog fel benned, itt leszek a lombikjaim között.'},
  {id:'s-szia', q:'szia hello hali udv jo napot hey csa szevasz', a:'Ha-haa, üdv a laboromban! Mit kérdeznél a Dice Throne-ról?'}
];
