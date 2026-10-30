// Content from reference/artifact (the prototype), unchanged unless noted. SAMPLE items.
import type { ArtSpec } from "@/components/Art";

export type ShopItem = { t: string; d: string; p: number };

export const SHOP: ShopItem[] = [
  {t:'Discord rang: „Trónörökös”', d:'Egyedi színű rang a közösségi szerveren egy szezonra.', p:5},
  {t:'Profilkeret a ranglistán', d:'Arany kocka-keret a neved körül a táblázatokban.', p:3},
  {t:'Sorsolási jegy: promó kártya', d:'Részvétel a havi promókártya-sorsoláson.', p:2},
  {t:'Nevezési kedvezmény', d:'50% kedvezmény a következő élő verseny nevezési díjából.', p:10},
  {t:'DTHU kockakészlet', d:'Hat egyedi gravírozott kocka közösségi logóval.', p:25},
  {t:'Hősválasztási elsőbbség', d:'Élő eseményen te választasz először a kölcsönhősök közül.', p:8}
];

/** Tile art per item (same order as SHOP). */
export const SHOPART: ArtSpec[] = [
  {c1:'#8b55d6',c2:'#d4ab52',g:'gem',prompt:'glowing royal crest emblem badge, purple and gold, game UI icon'},
  {c1:'#d4ab52',c2:'#6b1d12',g:'die',prompt:'ornate golden picture frame around a hero portrait, fantasy UI'},
  {c1:'#3fb39a',c2:'#d4ab52',g:'ticket',prompt:'raffle ticket and a shiny promo card, sparkles'},
  {c1:'#c8452f',c2:'#d4ab52',g:'chest',prompt:'discount coupon nailed to a tavern door, fantasy'},
  {img:'/images/die.webp'},
  {c1:'#4f8fe0',c2:'#d4ab52',g:'swords',prompt:'row of hero figurines on a shelf, first pick crown above one'}
];
