function userInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-muted/40 border border-border text-muted-foreground">
      <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
        {userInitials(name)}
      </span>
      {name}
    </span>
  );
}
