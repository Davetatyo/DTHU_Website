import { Art, type ArtSpec } from "@/components/Art";
import type { LinkRow } from "../lib/links";
import { linkImageUrl } from "../lib/links-data";

/** Tile background for links without a picture. */
const NO_PICTURE: ArtSpec = { c1: "#d4ab52", c2: "#15131c", g: "link", plain: true };

/** One link as a tile on the Linkek page (opens in a new tab). */
export function LinkTile({ link }: { link: LinkRow }) {
  const image = linkImageUrl(link.image_path);
  return (
    <a className="tile" href={link.url} target="_blank" rel="noopener noreferrer">
      <Art spec={image ? { img: image } : NO_PICTURE} />
      <div className="in">
        <h3>{link.title} ↗</h3>
        {link.description && <span className="sub">{link.description}</span>}
      </div>
    </a>
  );
}
