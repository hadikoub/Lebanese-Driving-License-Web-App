import { useEffect, useMemo, useState } from "react";

const SUPPORTED_EXTENSIONS = [".png", ".svg", ".jpg", ".jpeg", ".webp"];

function splitQueryAndHash(value: string): { path: string; suffix: string } {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");

  let splitIndex = -1;
  if (queryIndex >= 0 && hashIndex >= 0) splitIndex = Math.min(queryIndex, hashIndex);
  else splitIndex = Math.max(queryIndex, hashIndex);

  if (splitIndex < 0) return { path: value, suffix: "" };
  return {
    path: value.slice(0, splitIndex),
    suffix: value.slice(splitIndex)
  };
}

function buildCandidates(source: string): string[] {
  const { path, suffix } = splitQueryAndHash(source.trim());
  const extensionMatch = path.match(/\.(png|svg|jpg|jpeg|webp)$/i);

  if (!extensionMatch) {
    return SUPPORTED_EXTENSIONS.map((extension) => `${path}${extension}${suffix}`);
  }

  const actualExtension = extensionMatch[0].toLowerCase();
  const withoutExtension = path.slice(0, -actualExtension.length);
  const orderedExtensions = [
    actualExtension,
    ...SUPPORTED_EXTENSIONS.filter((candidate) => candidate !== actualExtension)
  ];

  return orderedExtensions.map((extension) => `${withoutExtension}${extension}${suffix}`);
}

interface SignImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  onExhausted?: () => void;
}

export function SignImage({
  src,
  alt,
  className,
  loading = "lazy",
  onExhausted
}: SignImageProps): JSX.Element {
  const candidates = useMemo(() => buildCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  return (
    <img
      src={candidates[candidateIndex]}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        setCandidateIndex((current) => {
          if (current >= candidates.length - 1) {
            onExhausted?.();
            return current;
          }
          return current + 1;
        });
      }}
    />
  );
}
