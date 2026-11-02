import { parseInline } from "@/lib/inline-format";

/** Text with **bold**, *italic* and [links](https://…), as React elements (never HTML). */
export function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((s, i) => {
        switch (s.t) {
          case "b":
            return <strong key={i}>{s.text}</strong>;
          case "i":
            return <em key={i}>{s.text}</em>;
          case "a":
            return (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="link">
                {s.text}
              </a>
            );
          default:
            return s.text;
        }
      })}
    </>
  );
}
