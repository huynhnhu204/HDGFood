export default function ClientLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4 py-20">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#ed2a2a]" />
      <p className="text-sm font-semibold text-slate-500">Đang tải...</p>
    </div>
  )
}
