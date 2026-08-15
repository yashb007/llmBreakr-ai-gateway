export function AccessDenied({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-panel border border-border bg-panel px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(246,182,75,.13)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div className="mb-1 text-[15px] font-bold">You don&apos;t have access to {section}</div>
      <div className="text-[13px] text-txm">Ask an administrator to grant you the required permission.</div>
    </div>
  );
}
