export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(oklch(0.92 0.012 78) 1px, transparent 1px), linear-gradient(90deg, oklch(0.92 0.012 78) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      {/* Glow behind form */}
      <div className="absolute size-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm px-4">
        {children}
      </div>
    </div>
  )
}
