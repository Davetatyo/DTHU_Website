import type { CSSProperties } from "react";
import { heroColors, heroImage } from "@/lib/heroes";
import { Icon, type IconId } from "./Icon";

/**
 * Background of a picture tile. With `img` it shows the image; otherwise a gradient placeholder
 * in two colours with a big icon, and an "AI-kép helye" tag whose tooltip is the prompt for the
 * image that should replace it (as in the prototype).
 */
export type ArtSpec = {
  img?: string;
  pos?: string;
  c1?: string;
  c2?: string;
  g?: IconId;
  prompt?: string;
  x?: string;
  y?: string;
};

export function Art({ spec }: { spec: ArtSpec }) {
  if (spec.img) {
    return <div className="img" style={{ backgroundImage: `url(${spec.img})`, backgroundPosition: spec.pos }} />;
  }
  const style = {
    "--c1": spec.c1 ?? "#d4ab52",
    "--c2": spec.c2 ?? "#a8322b",
    "--x": spec.x ?? "70%",
    "--y": spec.y ?? "30%",
  } as CSSProperties;
  return (
    <>
      <div className="img ph" style={style}>
        <Icon id={spec.g ?? "die"} className="glyph" />
      </div>
      <span className="phtag" title={`Prompt: ${spec.prompt ?? ""}`}>
        AI-kép helye
      </span>
    </>
  );
}

/** A hero's artwork, or a placeholder in the hero's colours. */
export function heroArt(hero: string | null | undefined, prompt?: string): ArtSpec {
  const img = heroImage(hero);
  if (img) return { img, pos: "center 20%" };
  const [c1, c2] = heroColors(hero);
  return {
    c1,
    c2,
    g: "die",
    prompt: prompt ?? `${hero} hero from Dice Throne style, epic comic-book fantasy illustration, dramatic rim light, dark stone background`,
  };
}
