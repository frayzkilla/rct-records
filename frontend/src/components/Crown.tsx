import crowns from "../assets/crowns.svg";
import mobileCrowns from "../assets/crowns-mobile.svg";
import { useId } from "react";

export default function Crown({
  className = "",
  variant = 0,
}: {
  className?: string;
  variant?: number;
}) {
  const views = [
    "235 690 840 710",
    "4148 475 714 949",
    "1168 564 874 880",
    "2170 865 850 510",
    "3178 813 876 548",
  ];
  const clipId = useId().replace(/:/g, "");
  const view = views[variant % views.length];
  const [x, y, width, height] = view.split(" ").map(Number);
  return (
    <svg className={`crown ${className}`} viewBox={view} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      <image
        className="crown-desktop-image"
        href={crowns}
        width="5000"
        height="2000"
        clipPath={`url(#${clipId})`}
      />
      <image
        className="crown-mobile-image"
        href={mobileCrowns}
        width="5000"
        height="2000"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
