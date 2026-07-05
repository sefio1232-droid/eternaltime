export function Container({ children, className = "" }: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={`mx-auto w-full max-w-[var(--container)] px-5 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
