declare const __BUILD_HASH__: string;
declare const __BUILD_DATE__: string;

export function BuildInfo() {
  const hash = typeof __BUILD_HASH__ !== "undefined" ? __BUILD_HASH__ : "dev";
  const date = typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : new Date().toISOString();

  // Only show a short compact form on the homepage footer
  const shortDate = date.split(" ")[0] ?? date.slice(0, 10);

  return (
    <p className="text-[10px] text-muted-foreground/40 font-mono">
      build <span className="text-muted-foreground/60">{hash}</span>
      {" · "}
      <time dateTime={date}>{shortDate}</time>
    </p>
  );
}
