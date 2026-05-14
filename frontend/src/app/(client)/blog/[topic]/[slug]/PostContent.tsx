'use client'

import { motion } from 'framer-motion'

export default function PostContent({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="blog-content"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
