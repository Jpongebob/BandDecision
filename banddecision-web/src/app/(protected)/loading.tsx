export default function Loading() {
  return <section role="status" aria-live="polite" aria-busy="true" className="space-y-5">
    <p className="text-sm font-semibold text-slate-600">화면을 불러오는 중…</p>
    <div aria-hidden="true" className="motion-safe:animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(item => <div key={item} className="h-28 rounded-2xl border bg-white" />)}</div>
      <div className="h-48 rounded-2xl border bg-white" />
    </div>
  </section>;
}
