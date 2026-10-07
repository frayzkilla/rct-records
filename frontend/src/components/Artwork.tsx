import { useState } from "react";

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
      <div className="artwork-type" aria-hidden="true">
        <span className="artwork-echo artwork-echo-top">{title}</span>
        <span className="artwork-name">{title}</span>
        <span className="artwork-echo artwork-echo-bottom">{title}</span>
      </div>
    </div>
  );
}
