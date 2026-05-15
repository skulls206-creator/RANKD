import { useState } from "react";

interface CoinLogoProps {
  imageUrl?: string | null;
  name: string;
  symbol: string;
  size?: "sm" | "lg";
}

export function CoinLogo({ imageUrl, name, symbol, size = "sm" }: CoinLogoProps) {
  const dim = size === "lg" ? "w-12 h-12 text-base" : "w-7 h-7 text-xs";
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return (
      <div className={`${dim} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
        <span className="font-bold text-muted-foreground">{symbol.slice(0, 2)}</span>
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={name}
      className={`${dim} rounded-full flex-shrink-0 object-cover`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
