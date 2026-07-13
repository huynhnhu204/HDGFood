'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[500px] text-center space-y-8 bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100"
      >
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-red-50 text-[#ed2a2a] rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
             <ShieldAlert className="w-12 h-12" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -inset-4 border-2 border-red-500/20 rounded-full -z-10"
          ></motion.div>
        </div>

        <div className="space-y-4">
           <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">Rất tiếc, <br/> <span className="text-[#ed2a2a]">bạn không có quyền truy cập</span></h1>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Bạn không có quyền truy cập vào khu vực bí mật này. <br/> Vui lòng quay lại nơi thuộc về bạn.
           </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
           <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 bg-[#ed2a2a] text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-red-700 hover:scale-[1.05] transition-all shadow-lg active:scale-95">
              <Home className="w-4 h-4" /> Về Trang chủ
           </Link>
           <button 
             onClick={() => window.history.back()}
             className="inline-flex items-center gap-2 px-8 py-4 bg-slate-50 text-slate-500 border border-slate-100 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
           >
              <ArrowLeft className="w-4 h-4" /> Quay lại
           </button>
        </div>

        <div className="pt-6">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Error Code: 403 Forbidden Access</p>
        </div>
      </motion.div>
    </div>
  )
}
