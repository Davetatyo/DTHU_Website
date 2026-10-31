// Content from reference/artifact (the prototype), unchanged unless noted. SAMPLE news.
import type { ArtSpec } from "@/components/Art";

export type NewsItem = { d: string; t: string; p: string; i: "die" | "swords" | "ticket" | "cal" };

export const NEWS: NewsItem[] = [
  {d:'2026.10.30', t:'Elkészült az új közösségi oldal prototípusa', p:'Időpontfoglaló, menetrend, ranglista és versenynaptár egy helyen. Hamarosan jön a jegyrendszer és a bolt. Minden visszajelzést szívesen fogadunk.', i:'die'},
  {d:'2026.10.26', t:'Elindult az októberi bajnokság 1. fordulója', p:'22 játékos, 11 meccs és egy pihenő. A határidő hétfő (11.02.) 12:25. Lépj be Discorddal, és egyeztess időpontot az ellenfeleddel.', i:'swords'},
  {d:'2026.10.20', t:'Jön a jegyrendszer', p:'Minden lejátszott meccs, győzelem és élő esemény jegyet ér. A jegyeket később a boltban költheted el rangokra, kedvezményekre és nyereményekre.', i:'ticket'},
  {d:'2026.10.12', t:'Feliratkozható versenynaptár', p:'A megerősített meccsek automatikusan bekerülnek a Google, Apple vagy Outlook naptáradba.', i:'cal'}
];

/** Card image per news category. */
export const NEWSART: Record<NewsItem["i"], ArtSpec> = {die:{img:'/images/die.webp'}, swords:{img:'/images/feature.webp',pos:'center 40%'}, ticket:{c1:'#e0b24a',c2:'#7a2fb0',g:'ticket',prompt:'golden fantasy tickets and coins spilling from a treasure chest, glowing, comic-book style'}, cal:{c1:'#4f8fe0',c2:'#d4ab52',g:'cal',prompt:'ancient parchment calendar on a tavern table with dice and candles, fantasy illustration'}};
export const NEWSLBL: Record<NewsItem["i"], string> = {die:'Közösség', swords:'Bajnokság', ticket:'Jegyek', cal:'Naptár'};
export const NEWSLINK: Record<NewsItem["i"], string> = {die:'/', swords:'/meccsszervezo', ticket:'/jegyek', cal:'/versenynaptar'};
