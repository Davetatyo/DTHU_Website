/** Phase 1: tells admins they are looking at the hidden full site (the public sees only the Meccsszervező). */
export function DevPreviewBanner() {
  return (
    <div className="proto">
      FEJLESZTŐI ELŐNÉZET · a teljes oldalt most csak adminok látják, a nyilvánosság csak az Időpontfoglalót ·
      a ranglista, jegyek, hírek és bolt adatai példák · a mintás képek AI-képek helyőrzői
    </div>
  );
}
