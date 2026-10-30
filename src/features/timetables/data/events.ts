// Content from reference/artifact (the prototype), unchanged unless noted.
import type { ArtSpec } from "@/components/Art";

// Sample season plan; online rounds will come from the Meccsszervező's rounds later.

export type EventItem = { s: string; e: string; k: "online" | "live" | "idea"; d: string; t: string; where: string; desc: string; tags: [string, string][]; past?: boolean };

export const EVENTS: EventItem[] = [
  {s:'2026-10-26',e:'2026-11-02',k:'online',d:'2026.10.26 – 11.02', t:'Októberi Online Bajnokság · 1. forduló', where:'Online · Discord', desc:'Svájci rendszerű párosítás, egy hét a lejátszásra. 22 játékos, 11 meccs és 1 pihenő.', tags:[['ok','Folyamatban'],['info','+1 jegy / meccs']], past:false},
  {s:'2026-11-02',e:'2026-11-09',k:'online',d:'2026.11.02 – 11.09', t:'Októberi Online Bajnokság · 2. forduló', where:'Online · Discord', desc:'Indul, amint az 1. forduló minden meccse lement – akár a határidő előtt is.', tags:[['mut','Tervezett']]},
  {s:'2026-11-09',e:'2026-11-16',k:'online',d:'2026.11.09 – 11.16', t:'Októberi Online Bajnokság · 3. forduló', where:'Online · Discord', desc:'Utolsó svájci forduló. Utána a legjobb 8 jut a rájátszásba.', tags:[['mut','Tervezett']]},
  {s:'2026-11-21',e:'2026-11-21',k:'live',d:'2026.11.21 (szo) 10:00', t:'Őszi Asztali Nap', where:'Budapest · helyszín egyeztetés alatt', desc:'Élő verseny és kötetlen játék. Hozd a saját hőseidet, kölcsönhősök is lesznek.', tags:[['warn','Nevezés hamarosan'],['info','+2 jegy részvételért']]},
  {s:'2026-11-23',e:'2026-11-29',k:'online',d:'2026.11.23 – 11.29', t:'Rájátszás · legjobb 8', where:'Online · Discord', desc:'Egyenes kiesés, best-of-3 meccsek.', tags:[['mut','Tervezett'],['info','Dobogó: +5/+3/+2 jegy']]},
  {s:'2026-12-12',e:'2026-12-12',k:'idea',d:'2026.12.12 (szo)', t:'Mikulás Kupa', where:'Hibrid · online és Budapest', desc:'Ünnepi kupa, csak Santa és Krampus nélkül választható hősökkel.', tags:[['mut','Ötlet']]}
];

/** The season plan shown as a timeline on every page. h: where a click goes. */
export const PHASES: { t: string; a: string; b: string; h: string }[] = [
  { t: "1. forduló", a: "2026-10-26", b: "2026-11-02", h: "/meccsszervezo" },
  { t: "2. forduló", a: "2026-11-02", b: "2026-11-09", h: "/versenynaptar" },
  { t: "3. forduló", a: "2026-11-09", b: "2026-11-16", h: "/versenynaptar" },
  { t: "Őszi Asztali Nap", a: "2026-11-21", b: "2026-11-21", h: "/versenynaptar" },
  { t: "Rájátszás · Top 8", a: "2026-11-23", b: "2026-11-29", h: "/versenynaptar" },
  { t: "Mikulás Kupa", a: "2026-12-12", b: "2026-12-12", h: "/versenynaptar" },
];

/** Tile art per event (same order as EVENTS). */
export const EVART: ArtSpec[] = [
  {img:'/images/feature.webp',pos:'center 35%'}, {c1:'#4f8fe0',c2:'#8b55d6',g:'swords',prompt:'two fantasy heroes clashing, moon elf vs shadow thief, dynamic comic style, blue and purple'},
  {c1:'#c8452f',c2:'#d4ab52',g:'swords',prompt:'barbarian and samurai duel in an arena, sparks, epic comic style'},
  {c1:'#d4ab52',c2:'#5eae4a',g:'die',prompt:'cozy board game café, players around a table with colorful dice, warm light, illustrated'},
  {c1:'#d23a4a',c2:'#d4ab52',g:'trophy',prompt:'golden tournament trophy on a pedestal, fantasy dice around it, spotlight'},
  {c1:'#e04848',c2:'#5eae4a',g:'die',prompt:'Santa and Krampus facing each other over a dice table, snowy night, comic style'}
];
