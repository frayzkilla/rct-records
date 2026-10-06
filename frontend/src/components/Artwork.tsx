import { useState } from "react";
import Crown from "./Crown";

export default function Artwork({
  src,
  title,
  className = "",
}: {
  src?: string;
  title: string;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  return src && failedSource !== src ? (
    <img
      className={`artwork ${className}`}
      src={src}
      alt={title}
      loading="lazy"
      onError={() => setFailedSource(src)}
    />
  ) : (
    <div
      className={`artwork artwork-fallback ${className}`}
      role="img"
      aria-label={title}
    >
      <Crown />
      <span>RAW / SOUND</span>
    </div>
  );
}
