import { Metadata } from 'next'
import api from '@/services/api'
import ProductDetailContentImproved from './ProductDetailContentImproved'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string) {
  try {
    const res = await api.get(`/products/${slug}`)
    return res.data?.data || res.data
  } catch (error) {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) return { title: 'Sản phẩm không tồn tại - HDG Food' }

  const galleryImages = [
    ...(Array.isArray(product.images) ? product.images.map((img: any) => img?.url).filter(Boolean) : []),
    ...(Array.isArray(product.extra_images) ? product.extra_images.filter(Boolean) : []),
  ]
  const ogImages = Array.from(new Set([product.image, ...galleryImages].filter(Boolean)))

  return {
    title: `${product.name} - Giá tốt nhất tại HDG Food`,
    description: product.description || `Mua ngay ${product.name} tại HDG Food với giá ưu đãi. Giao hàng nhanh mướt mượt!`,
    openGraph: {
      title: `${product.name} - HDG Food`,
      description: product.description,
      images: ogImages,
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) notFound()

  // SEO Schema Markup
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    sku: `HDG-${product.id}`,
    brand: {
      '@type': 'Brand',
      name: 'HDG Food',
    },
    offers: {
      '@type': 'Offer',
      url: `https://HDGfood.vn/products/${product.slug}`,
      priceCurrency: 'VND',
      price: product.final_price || product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggrHDGteRating: product.reviews_count > 0 ? {
      '@type': 'AggrHDGteRating',
      ratingValue: product.rating_avg || 5,
      reviewCount: product.reviews_count || 1,
    } : undefined,
  }

  return (
    <main className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContentImproved product={product} />
      </Suspense>
    </main>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 animate-pulse">
       <div className="flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-1/2 aspect-square bg-slate-100 rounded-[2.5rem]" />
          <div className="w-full lg:w-1/2 space-y-6">
             <div className="h-4 w-24 bg-slate-100 rounded" />
             <div className="h-10 w-3/4 bg-slate-100 rounded" />
             <div className="h-8 w-1/3 bg-slate-100 rounded" />
             <div className="space-y-4 pt-8">
                <div className="h-20 w-full bg-slate-100 rounded-2xl" />
                <div className="h-20 w-full bg-slate-100 rounded-2xl" />
             </div>
          </div>
       </div>
    </div>
  )
}
