// Content from reference/artifact (the prototype), unchanged unless noted.
// Summary of the Dice Throne Rulepop Hungarian fan translation, in our own words.

/** Link to another rule inside a rule's HTML. */
const RL = (id: string, txt: string) => `<a href="/szabalytar/${id}">${txt}</a>`;
export type RuleTab = [id: string, label: string];

export const RT_TABS: RuleTab[] = [
  ['gyors','Gyors segédlet'],['reszletes','Részletes szabályok'],['modok','Játékmódok'],
  ['hosok','Hősök'],['jelzok','Állapotjelzők'],['gyik','Szabály-GYIK'],['index','Tárgymutató']
];
export type Rule = { id: string; cat: string; t: string; en: string; b: string };

/** Each rule has its own page: /szabalytar/<id>. b is trusted HTML written by us. */
export const RULES: Rule[] = [
/* ---- gyors ---- */
{id:'elokeszites', cat:'gyors', t:'Előkészítés', en:'Setup', b:`
<ol>
<li>Mindenki választ egy hőst, és maga elé teszi a hőstábláját, a hőslapját (leaflet), az 5 kockáját és az állapotjelzőit.</li>
<li>Állítsd az életerő-tárcsát <b>50</b>-re (1v1). Más játékmódban lásd a ${RL('jatekmodok','Játékmódok')} oldalt.</li>
<li>Állítsd a CP-tárcsát <b>2</b>-re.</li>
<li>Keverd meg a paklidat, és húzz <b>4</b> lapot kezdő kézként.</li>
<li>Mindenki dob egy kockával, a legnagyobb dobás kezd. Döntetlennél újradobnak.</li>
<li>A kezdő játékos az első körében <b>kihagyja a ${RL('bevetel','Bevételi fázist')}</b>.</li>
</ol>`},
{id:'kor', cat:'gyors', t:'Egy kör menete', en:'Turn Overview', b:`
<p>A soron lévő játékos (aktív játékos) az alábbi fázisokon megy végig, mindig ebben a sorrendben:</p>
<ol>
<li>${RL('fenntartas','Fenntartási fázis')} – a „fenntartáskor” jelölt hatások lefutnak.</li>
<li>${RL('bevetel','Bevételi fázis')} – +1 CP és 1 lap húzása.</li>
<li>${RL('fofazis','Fő fázis 1')} – lapok eladása, kijátszása, fejlesztések.</li>
<li>${RL('tamado','Támadó dobási fázis')} – legfeljebb 3 dobási kísérlet, majd egy képesség aktiválása.</li>
<li>${RL('celzo','Célzó dobási fázis')} – csak ha több ellenfél közül kell választani.</li>
<li>${RL('vedekezo','Védekező dobási fázis')} – a megtámadott játékos védekezik.</li>
<li>${RL('fofazis','Fő fázis 2')} – ugyanaz, mint a Fő fázis 1.</li>
<li>${RL('eldobas','Eldobási fázis')} – kézlimit: 6 lap.</li>
</ol>`},
{id:'gyozelem', cat:'gyors', t:'Győzelem és vereség', en:'Winning', b:`
<p>Aki 0 életerőre esik, kiesik. Az nyer, aki utolsóként marad életben (csapatjátékban az a csapat, amelyiknek marad életereje).</p>
<p>Ha a megmaradt játékosok egyszerre érik el a 0 életerőt, a játék <b>döntetlen</b>. Mivel a sebzés a fázis végén egyszerre kerül levonásra, ez például akkor fordulhat elő, ha a védekező képesség visszasebez. Lásd: ${RL('eletero','Életerő')}.</p>`},
{id:'fogalmak', cat:'gyors', t:'Alapfogalmak', en:'Key Terms', b:`
<dl>
<dt>Komplexitási szint</dt><dd>1–6 közötti érték a hőslapon: azt mutatja, mennyire nehéz megtanulni és jól játszani a hőst. Nem az erejét méri.</dd>
<dt>Választott játékos</dt><dd>Bármelyik játékos, akit kiválasztasz: te magad, a csapattársad vagy egy ellenfél.</dd>
<dt>Választott ellenfél</dt><dd>Bármelyik játékos, aki nem te vagy, és nem a csapatodban van.</dd>
<dt>Halmozási limit</dt><dd>Egy állapotjelzőből egyszerre legfeljebb ennyi lehet egy játékosnál. Lásd: ${RL('allapotjelzok','Állapotjelzők')}.</dd>
<dt>CP (harci pont)</dt><dd>A kártyák kijátszásához használt erőforrás. Lásd: ${RL('cp','Harci pontok')}.</dd>
</dl>`},
/* ---- részletes ---- */
{id:'akciokartyak', cat:'reszletes', t:'Akciókártyák', en:'Action Cards', b:`
<p>A kártya bal felső sarkában lévő szám a CP-költsége. A kerete és ikonja mutatja, mikor játszható ki:</p>
<table class="rt-t"><thead><tr><th>Típus</th><th>Szín</th><th>Mikor?</th></tr></thead><tbody>
<tr><td>Azonnali akció</td><td><span class="cdot" style="background:#c8382f"></span>piros</td><td>Bármikor, bárki körében. A legtöbb dolgot megszakíthatja.</td></tr>
<tr><td>Dobási fázis akció</td><td><span class="cdot" style="background:#e08a2a"></span>narancs</td><td>Bármelyik játékos támadó, célzó vagy védekező dobási fázisában.</td></tr>
<tr><td>Fő fázis akció</td><td><span class="cdot" style="background:#3f7fd0"></span>kék</td><td>Csak a saját köröd Fő fázis 1 vagy 2 részében.</td></tr>
<tr><td>Hősfejlesztés</td><td>fehér / zöld / lila</td><td>Csak a saját Fő fázisodban. Lásd: ${RL('fejlesztesek','Hősfejlesztések')}.</td></tr>
</tbody></table>
<p>Bármelyik lapot eladhatod 1 CP-ért (${RL('cp','Harci pontok')}). Megszakításról lásd: ${RL('idozites','Időzítés')}.</p>`},
{id:'tamadasmodositok', cat:'reszletes', t:'Támadásmódosítók', en:'Attack Modifiers', b:`
<p>Olyan kártyák vagy állapotjelzők, amelyek sebzést adnak egy támadáshoz.</p>
<ul>
<li>Csak olyan támadásra használhatók, amely sebzést okoz egy ellenfélnek. Sebzés nélküli képességre nem.</li>
<li>A hozzáadott sebzés <b>ugyanolyan típusú</b>, mint az eredeti: kivédhetetlen támadáshoz adva kivédhetetlen marad.</li>
<li>Kijátszhatók az ellenfél védekező dobása előtt és után is, a védekező dobási fázis végéig.</li>
<li>Az ${RL('ultimate','Ultimate')} sebzése is növelhető velük. A ${RL('sebzestipusok','tiszta és járulékos sebzés')} viszont nem.</li>
</ul>`},
{id:'cp', cat:'reszletes', t:'Harci pontok (CP)', en:'Combat Points', b:`
<ul>
<li>Kezdéskor <b>2 CP</b>, a ${RL('bevetel','Bevételi fázisban')} <b>+1 CP</b>.</li>
<li>Egy lap eladása mindig <b>1 CP</b>-t ér, akármennyi is a költsége. Az eladott lap a dobópakliba kerül.</li>
<li>Legfeljebb <b>15 CP</b> lehet nálad, a felette szerzett CP elvész.</li>
<li>Ha egy hatás CP-t „lop”, legfeljebb annyit vihet el, amennyi az ellenfélnek van.</li>
</ul>`},
{id:'tarsak', cat:'reszletes', t:'Társak', en:'Companions', b:`
<p>Egyes hősök saját jelzőt, tárcsát vagy más elemet használnak (például segítőket, idézett lényeket). Ezek <b>nem állapotjelzők</b>, ezért az állapotjelzőkre vonatkozó lapok (eltávolítás, lopás) nem hatnak rájuk. A szabályaik a hős lapján vannak.</p>`},
{id:'sebzestipusok', cat:'reszletes', t:'Sebzéstípusok', en:'Damage Types', b:`
<div class="tw"><table class="rt-t"><thead><tr><th>Típus</th><th>Védhető?</th><th>Megelőzhető?</th><th>Módosítható?</th></tr></thead><tbody>
<tr><td><b>Normál</b></td><td>igen</td><td>igen</td><td>igen</td></tr>
<tr><td><b>Kivédhetetlen</b></td><td>nem</td><td>igen</td><td>igen</td></tr>
<tr><td><b>Tiszta</b></td><td>nem</td><td>igen</td><td>nem</td></tr>
<tr><td><b>Járulékos</b></td><td>nem</td><td>igen</td><td>nem</td></tr>
<tr><td><b>Ultimate</b></td><td>nem</td><td>nem</td><td>csak növelhető</td></tr>
</tbody></table></div>
<ul>
<li><b>Védhető</b>: a megtámadott játékos ${RL('vedekezo','védekező dobást')} tehet ellene.</li>
<li><b>Megelőzhető</b>: kártyákkal, állapotjelzőkkel csökkenthető vagy kivédhető.</li>
<li><b>Járulékos</b> sebzés: saját célzási szabályai vannak, és <b>nem számít támadásnak</b>. Csapatjátékban a közös életerőből annyi vonódik le, amennyi összesen ért.</li>
<li><b>Nem támadásból</b> eredő sebzés (állapotjelzőből, védekező képességből): nincs típusa, megelőzhető, de nem védhető és támadásmódosítóval nem növelhető.</li>
</ul>
<p>A végső összeg kiszámítását lásd: ${RL('vegso-sebzes','Végső sebzés')}.</p>`},
{id:'vedekezo', cat:'reszletes', t:'Védekező dobási fázis', en:'Defensive Roll Phase', b:`
<ol>
<li>Ha legalább 1 <b>védhető</b> sebzést okozó támadás ért, választasz <b>egy</b> védekező képességet a hőstábládról.</li>
<li>A képességen jelölt számú kockával <b>egyszer</b> dobsz.</li>
<li>Minden kidobott eredményt felhasználhatsz: a kockák nem „fogynak el”.</li>
<li>Lefutnak a nem sebző hatások, majd mindenki utoljára kijátszhat lapokat és elköltheti a jelzőit.</li>
<li>A fázis végén minden sebzés és megelőzés összesítve, egyszerre érvényesül.</li>
</ol>
<p>Ha a támadás nem okoz sebzést (csak más hatása van), nincs védekező dobás.</p>`},
{id:'eldobas', cat:'reszletes', t:'Eldobási fázis', en:'Discard Phase', b:`
<p>A köröd végén legfeljebb <b>6 lap</b> lehet a kezedben. A fölösleget eladod (lapként 1 CP). Ebben a fázisban más akciót nem végezhetsz.</p>
<p>A limit csak ekkor számít: más játékos körében lehet nálad több lap is.</p>`},
{id:'vegso-sebzes', cat:'reszletes', t:'Végső sebzés kiszámítása', en:'Final Damage Total', b:`
<ol>
<li>Kiindulás: a képesség alapsebzése.</li>
<li>Először minden <b>összeadás és kivonás</b> (támadásmódosítók, megelőzés).</li>
<li>Utána minden <b>szorzás és osztás</b> (például „felezd”).</li>
<li>Törtnél <b>felfelé kerekítünk</b>.</li>
</ol>
<div class="rt-ex"><b>Példa:</b> a Barbár 8 normál sebzéssel támad, és +2-es támadásmódosítót játszik ki. A Paladin védekezésből 3 sebzést előz meg, majd egy lappal felezi a maradékot.<br>(8 + 2 − 3) = 7 → 7 ÷ 2 = 3,5 → <b>4 sebzés</b>.</div>`},
{id:'eletero', cat:'reszletes', t:'Életerő', en:'Health', b:`
<ul>
<li>Kezdő életerő 1v1-ben <b>50</b>. Más módokban lásd: ${RL('jatekmodok','Játékmódok')}.</li>
<li>Gyógyulni legfeljebb <b>10-zel a kezdő érték fölé</b> lehet (1v1-ben 60-ig).</li>
<li>A gyógyulás azonnal érvényesül, a sebzés a fázis végén.</li>
<li>0 életerőnél kiesel. Ha mindenki egyszerre esik ki, döntetlen.</li>
</ul>`},
{id:'hostabla', cat:'reszletes', t:'Hőstábla', en:'Hero Board', b:`
<p>A játékostáblád. Rajta vannak a hősöd támadó- és védekező képességei, az ${RL('ultimate','Ultimate')}, valamint a fejlesztési helyek. A rád tett állapotjelzők a tábla közepére kerülnek.</p>
<p>Egy képesség akkor aktiválható, ha a kockáid pontosan kiadják a mellette jelölt szimbólumokat vagy sort.</p>`},
{id:'hoskartyak', cat:'reszletes', t:'Hőskártyák', en:'Hero Cards', b:`
<ul>
<li>Minden hősnek saját paklija van: általános és hősspecifikus lapokkal.</li>
<li>Kezdéskor 4 lap, majd minden ${RL('bevetel','Bevételi fázisban')} +1.</li>
<li>Ha elfogy a pakli, keverd meg a dobópaklit, és abból lesz az új húzópakli.</li>
<li>Kézlimit a kör végén: 6 lap (${RL('eldobas','Eldobási fázis')}).</li>
<li>Típusok és időzítés: ${RL('akciokartyak','Akciókártyák')}.</li>
</ul>`},
{id:'fejlesztesek', cat:'reszletes', t:'Hősfejlesztések', en:'Hero Upgrades', b:`
<ul>
<li>Csak a saját Fő fázisodban játszhatók ki, a CP-költség megfizetésével.</li>
<li>A hőstábla megfelelő képességére teszed, és véglegesen lecseréli azt. Kijátszás után nem adható el.</li>
<li>Keret: <b>fehér</b> = támadó, <b>zöld</b> = védekező, <b>lila</b> = passzív fejlesztés.</li>
<li>Szint átugorható: 1-ről 3-ra a 3. szint teljes árát fizeted. Ha már a 2. szint van fent, csak a különbözetet.</li>
<li>Nem minden fejlesztésnek van 3. szintje. Egyes fejlesztések új mellékképességet is adnak.</li>
</ul>`},
{id:'bevetel', cat:'reszletes', t:'Bevételi fázis', en:'Income Phase', b:`
<p>Kapsz <b>1 CP</b>-t, és húzol <b>1 lapot</b>. Ha a pakli üres, előbb megkevered a dobópaklit.</p>
<p>A kezdő játékos az első körében kihagyja ezt a fázist.</p>`},
{id:'fofazis', cat:'reszletes', t:'Fő fázis (1 és 2)', en:'Main Phase', b:`
<p>Tetszőleges sorrendben és gyakorisággal:</p>
<ul><li>lapot adhatsz el 1 CP-ért,</li><li>Fő fázis akciókártyát játszhatsz ki,</li><li>${RL('fejlesztesek','hősfejlesztést')} tehetsz a hőstábládra.</li></ul>
<p>A Fő fázis 2 ugyanígy működik, a támadásod után.</p>`},
{id:'tamado', cat:'reszletes', t:'Támadó dobási fázis', en:'Offensive Roll Phase', b:`
<ol>
<li>Legfeljebb <b>3 dobási kísérleted</b> van. Az első kísérletnél mind az 5 kockával dobsz.</li>
<li>Utána tetszőleges kockákat újradobhatsz. A korábban megtartott kockák nincsenek rögzítve, később azokat is újradobhatod.</li>
<li>Bármikor abbahagyhatod. Ha egy ellenfél ezután megváltoztatja a kockáidat, a megmaradt kísérleteidet még felhasználhatod.</li>
<li>Végül választasz <b>egy</b> támadó képességet, amelynek a feltétele teljesül, vagy egyet sem. Egyszerre csak egy képesség aktiválható.</li>
<li>Az ellenfelek az aktiválás előtt módosíthatják a kockáidat.</li>
</ol>
<p>Öt 6-os = ${RL('ultimate','Ultimate')}.</p>`},
{id:'szovegek', cat:'reszletes', t:'Szövegek értelmezése', en:'Resolving Text', b:`
<dl>
<dt>„Dobj [#]…”</dt><dd>Annyi kockával dobsz, amennyit a szöveg ír. Ez nem számít dobási kísérletnek.</dd>
<dt>„…minden egyes…”</dt><dd>A hatás annyiszor érvényesül, ahány megfelelő eredmény vagy elem van.</dd>
<dt>„Majd…”</dt><dd>A szöveg következő része az előző után fut le, sorrendben.</dd>
<dt>„vagy”</dt><dd>A felsorolt lehetőségek közül egyet választasz.</dd>
<dt>„Lopj…”</dt><dd>Elveszed az ellenféltől, és megkapod. Csak annyit lophatsz, amennyi neki van.</dd>
<dt>„Továbbá…”</dt><dd>Kiegészítő hatás, amely a fő hatás mellett érvényesül.</dd>
</dl>`},
{id:'allapotjelzok', cat:'reszletes', t:'Állapotjelzők – általános szabályok', en:'Status Effects', b:`
<ul>
<li><b>Megszerzés vagy kiosztás:</b> a jelzőt a saját hőslapodról a kapó játékos hőstáblájának közepére teszed.</li>
<li><b>Elkölthető</b> jelző: bármikor elköltheted, bárki körében, ha a jelző másképp nem írja. Elköltés után a hatása nem szakítható meg.</li>
<li><b>Tartós</b> jelző: addig marad, amíg egy lap, másik jelző vagy képesség el nem távolítja.</li>
<li><b>Halmozási limit:</b> egy fajtából egyszerre legfeljebb ennyi lehet egy játékosnál. Ha egy hatás megemeli, az csak arra a játékosra vonatkozik, a játék végéig.</li>
<li><b>Eltávolítás:</b> „távolíts el egy jelzőt” = pontosan egy darabot. „Távolíts el minden jelzőt” = a pozitívakat és a negatívakat is.</li>
<li><b>Egyedi</b> jelzők: saját szabályaik vannak, se nem pozitívak, se nem negatívak.</li>
<li>Ha egy jelzőt el akarnak lopni vagy távolítani tőled, előtte még elköltheted. Kivétel, ha a forrás Azonnali kártya vagy elkölthető jelző.</li>
<li>Kiesett játékos által kiosztott jelzők játékban maradnak.</li>
</ul>
<p>Az összes jelző listája: <a href="#sz-lista-jelzok">Állapotjelzők</a>.</p>`},
{id:'celzo', cat:'reszletes', t:'Célzó dobási fázis', en:'Targeting Roll Phase', b:`
<p>Csak akkor van, ha több ellenfél közül kell célpontot választani. A pontos szabály játékmódonként eltér, lásd: ${RL('jatekmodok','Játékmódok')}.</p>
<ul><li>King of the Hill: szabadon választasz célpontot, nincs dobás.</li><li>Csapatmódok: egy kockával dobsz, és a táblázat dönti el a célpontot.</li></ul>
<p>Ha Ultimate-et aktiváltál, a célzó dobásodat te módosíthatod kártyákkal, az ellenfeleid nem.</p>`},
{id:'idozites', cat:'reszletes', t:'Időzítés és megszakítás', en:'Timing', b:`
<ul>
<li>Az <b>Azonnali akció</b> (piros kártya vagy jelző elköltése) bármikor kijátszható, és a legtöbb dolgot megszakítja. Azonnal lefut, őt magát nem lehet megszakítani.</li>
<li>Fő fázis és Dobási fázis lapot megszakíthat egy Azonnali akció vagy jelzőköltés.</li>
<li>Ha többen akarnak egyszerre cselekedni, az <b>aktív játékosé az elsőbbség</b>.</li>
<li>A dobó játékos megszakítás nélkül végigviheti a dobását.</li>
</ul>`},
{id:'fenntartas', cat:'reszletes', t:'Fenntartási fázis', en:'Upkeep Phase', b:`
<p>Lefut minden hatás, amelyre a szöveg azt írja, hogy „fenntartási fázisban” (például egyes állapotjelzők, képességek, társak). A sorrendet az aktív játékos dönti el. A sebzés a fázis végén összesítve érvényesül.</p>`},
{id:'ultimate', cat:'reszletes', t:'Ultimate képesség', en:'Ultimate Ability', b:`
<ul>
<li>Minden hősnél <b>öt 6-os</b> kell hozzá, és csak a ${RL('tamado','Támadó dobási fázisban')} aktiválható.</li>
<li>Aktiválás után <b>semmi sem állíthatja meg</b>: nem előzhető meg, nem kerülhető el, nem lehet rá reagálni. Az ellenfelek a dobási fázis végéig nem cselekedhetnek.</li>
<li>Egyetlen ellenszer: a kockák megváltoztatása még az aktiválás <b>előtt</b>.</li>
<li>A sebzés támadásmódosítóval növelhető.</li>
</ul>`},
/* ---- módok ---- */
{id:'jatekmodok', cat:'modok', t:'Játékmódok áttekintése', en:'Game Modes', b:`
<div class="tw"><table class="rt-t"><thead><tr><th>Mód</th><th>Játékos</th><th>Életerő</th></tr></thead><tbody>
<tr><td>${RL('1v1','1v1')}</td><td>2</td><td>50</td></tr>
<tr><td>${RL('kingofthehill','King of the Hill')}</td><td>3 / 4 / 5</td><td>35 / 25 / 20</td></tr>
<tr><td>${RL('2v2','2v2')}</td><td>4</td><td>50, csapatonként közös</td></tr>
<tr><td>${RL('3v3','3v3')}</td><td>6</td><td>50, csapatonként közös</td></tr>
<tr><td>${RL('2v2v2','2v2v2')}</td><td>6</td><td>50, csapatonként közös</td></tr>
</tbody></table></div>
<p>Új játékosoknak érdemes 1v1 meccsekkel kezdeni, mielőtt 5–6 fős játékba vágnak.</p>`},
{id:'1v1', cat:'modok', t:'1v1', en:'Duel', b:`<p>Két játékos, 50 életerő, az alapszabályok szerint. Nincs ${RL('celzo','Célzó dobás')}.</p>`},
{id:'kingofthehill', cat:'modok', t:'King of the Hill', en:'Free-for-all', b:`
<ul>
<li>Életerő: 3 játékosnál 35, 4-nél 25, 5-nél 20.</li>
<li>Óramutató járása szerint haladtok, és bárkit megtámadhatsz.</li>
<li>A legtöbb életerővel rendelkező játékos a <b>Vezető</b>. Holtversenyben mindegyikük az.</li>
<li>Ha a Vezetőt támadod, a célpont kiválasztása után húzol egy bónuszlapot. Ha egyedül te vagy a Vezető, nincs bónusz.</li>
<li>A támadó dobást csak a dobási fázisban, a célpont kiválasztása előtt lehet módosítani.</li>
</ul>`},
{id:'2v2', cat:'modok', t:'2v2', en:'Teams', b:`
<ul><li>Csapatonként közös 50 életerő, de mindenkinek saját CP-tárcsája van.</li><li>A sorrend cikcakkban váltakozik a csapatok között.</li><li>Célzó dobás: <b>1–2</b> bal oldali ellenfél, <b>3–4</b> jobb oldali, <b>5</b> az ellenfelek döntenek, <b>6</b> te választasz.</li><li>„Minden ellenfelet sebez” hatásnál a közös életerőből összesen vonódik le (2 sebzés fejenként = 4).</li></ul>`},
{id:'3v3', cat:'modok', t:'3v3', en:'Teams', b:`<ul><li>Csapatonként közös 50 életerő, cikcakkos sorrend.</li><li>Célzó dobás: <b>1–2</b> bal, <b>3–4</b> középső, <b>5–6</b> jobb oldali ellenfél.</li></ul>`},
{id:'2v2v2', cat:'modok', t:'2v2v2', en:'Three Teams', b:`<ul><li>Három kétfős csapat, csapatonként közös 50 életerő.</li><li>Először minden csapat 1. játékosa jön, utána a 2. játékosok.</li><li>Célzó dobás: <b>1–4</b> a bal oldali legközelebbi ellenféltől óramutató szerint számolva, <b>5–6</b> te választasz.</li></ul>`}
];

/** Old list pages that are tabs now: /szabalytar/<id> redirects to the tab. */
export const RT_SPECIAL: Record<string, string> = {'lista-hosok':'hosok','lista-jelzok':'jelzok','gyik-szabaly':'gyik','targymutato':'index'};
