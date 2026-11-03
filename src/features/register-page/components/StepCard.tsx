import { Icon, type IconId } from "@/components/Icon";

export function StepCard({
  number,
  title,
  description,
  detail,
  iconId,
}: {
  number: number;
  title: string;
  description: string;
  detail: string;
  iconId: IconId;
}) {
  return (
    <div className="reg-step">
      <span className="step-num">{number}</span>
      <Icon id={iconId} className="step-icon" />
      <h3>{title}</h3>
      <p>{description}</p>
      <p className="step-detail">{detail}</p>
    </div>
  );
}
