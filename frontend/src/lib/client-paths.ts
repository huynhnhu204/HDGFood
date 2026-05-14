/** Public site paths — keep in sync with Next.js app routes and menu/API conventions. */

export const BLOG_UNCATEGORIZED_SLUG = 'uncategorized'

export function blogTopicListingPath(topicSlug: string): string {
  return `/blog/${topicSlug}`
}

/** Post detail: /blog/{topic}/{slug} */
export function blogPostPublicPath(post: {
  slug: string
  topic?: { slug?: string | null } | null
  topic_slug?: string | null
}): string {
  const t =
    post.topic?.slug?.trim() ||
    post.topic_slug?.trim() ||
    BLOG_UNCATEGORIZED_SLUG
  return `/blog/${t}/${post.slug}`
}

export function blogPostPathFromSlugs(postSlug: string, topicSlug?: string | null): string {
  const t = topicSlug?.trim() || BLOG_UNCATEGORIZED_SLUG
  return `/blog/${t}/${postSlug}`
}

export function categoryPublicPath(slug: string): string {
  return `/categories/${slug}`
}

export function productPublicPath(slug: string): string {
  return `/products/${slug}`
}
