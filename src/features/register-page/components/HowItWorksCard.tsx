import { Icon, type IconId } from "@/components/Icon";

export function HowItWorksCard({
  title,
  description,
  iconId,
}: {
  title: string;
  description: string;
  iconId: IconId;
}) {
  return (
    <div className="hiw-card">
      <Icon id={iconId} className="hiw-icon" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
