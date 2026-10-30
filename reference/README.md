# Design reference

`artifact/` is the original single-file prototype of the DTHU website (published as the
Claude artifact "DTHU Közösségi Oldal", https://claude.ai/artifact/7NDvZ1iMQ1X7LHUEE51iVT).
It is the design source for the new site: layout, colours, components and the content of the
features that are not built yet (news, rankings, calendar, tickets, shop, rulebook, FAQ,
links, the Alchemist help chat).

It is **not** part of the app and is not built or deployed. Open `artifact/index.html` in a
browser to see it (all data in it is sample data). When you port a feature from it, take the
content and design, not the code: the prototype is plain JS with inline handlers.

The artifact grew in three layers (V1 → V2 → V3) in one file; later layers override earlier
ones. What is current: V3 for Hírek, Meccsszervező, Közelgő meccsek and Ranglista; V2 tiles
for Versenynaptár, Jegyek, Bolt and Linkek; V1 + V2 for Szabálytár; V1 for GYIK.
