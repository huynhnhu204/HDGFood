import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import ProfilePageContent from './ProfilePageContent'

function ProfileLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-[#ed2a2a] animate-spin mb-4" />
      <span className="font-bold text-slate-500 uppercase tracking-widest text-sm">Đang tải...</span>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfilePageContent />
    </Suspense>
  )
}