export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function unslugify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
