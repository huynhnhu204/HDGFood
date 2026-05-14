'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { categoryService } from '@/services/category.service'
import type { Category } from '@/types'

const CategorySkeleton = () => {
  return (
    <div className="flex md:grid md:grid-cols-6 gap-6 overflow-x-hidden">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-42 md:w-auto flex flex-col items-center bg-white p-4 md:p-6 rounded-3xl shadow-sm animate-pulse border border-gray-100">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 border-2 border-dashed border-gray-100 mb-4" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  )
}

const CategorySection = () => {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const data = await categoryService.getPublicCategories({ status: 'active' })
        setCategories(Array.isArray(data) ? data.slice(0, 6) : [])
      } catch (err) {
        setError('Không thể tải danh mục')
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  }

  if (loading) {
    return (
      <section className="py-10 md:py-14 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic mb-2">
              Menu nhanh
            </h2>
            <p className="text-sm font-semibold text-slate-400">
              Chọn nhanh theo danh mục — gọn, rõ, dễ click.
            </p>
          </div>
          <div className="rounded-[3rem] bg-slate-50 p-6 md:p-8 ring-1 ring-slate-100 shadow-[0_18px_80px_rgba(2,6,23,0.04)]">
            <CategorySkeleton />
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-500 font-medium italic">
        {error}
      </div>
    )
  }

  if (categories.length === 0) return null

  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic mb-2">
            Menu nhanh
          </h2>
          <p className="text-sm font-semibold text-slate-400">
            Khám phá thực đơn theo danh mục — phong cách tối giản, sang trọng.
          </p>
        </div>

        <div className="rounded-[3rem] bg-slate-50 p-6 md:p-8 ring-1 ring-slate-100 shadow-[0_18px_80px_rgba(2,6,23,0.04)]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="flex md:grid md:grid-cols-6 gap-6 md:gap-6 overflow-x-auto pb-3 md:pb-0 no-scrollbar snap-x touch-pan-x"
          >
            {categories.map((category) => (
              <motion.div
                key={category.id}
                variants={itemVariants}
                onClick={() => router.push(`/products?category=${category.id}`)}
                className="flex-shrink-0 w-44 md:w-auto snap-center group cursor-pointer"
              >
                <div className="flex flex-col items-center bg-white p-5 md:p-6 rounded-[2.25rem] shadow-sm border border-white/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden">
                  <div className="relative w-28 h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200 group-hover:border-[#ed2a2a]/60 transition-colors duration-300 p-2">
                      <div className="w-full h-full relative rounded-full overflow-hidden bg-slate-50">
                        <Image
                          src={category.image || '/images/default-food.png'}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 112px, 144px"
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-[13px] md:text-sm font-black text-slate-900 text-center tracking-tight group-hover:text-[#ed2a2a] transition-colors line-clamp-2">
                    {category.name}
                  </h3>
                  <div className="mt-2 h-px w-10 bg-slate-200 group-hover:bg-[#ed2a2a]/50 transition-colors" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}

export default CategorySection
