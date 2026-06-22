export function timeAgo(dateString: string | Date | null | undefined): string | null {
  if (!dateString) return null
  const date = dateString instanceof Date ? dateString : new Date(dateString)
  if (isNaN(date.getTime())) return null

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'

  let interval = seconds / 31536000
  if (interval >= 1) return `${Math.floor(interval)} year${Math.floor(interval) > 1 ? 's' : ''} ago`
  interval = seconds / 2592000
  if (interval >= 1) return `${Math.floor(interval)} month${Math.floor(interval) > 1 ? 's' : ''} ago`
  interval = seconds / 86400
  if (interval >= 1) return `${Math.floor(interval)} day${Math.floor(interval) > 1 ? 's' : ''} ago`
  interval = seconds / 3600
  if (interval >= 1) return `${Math.floor(interval)} hour${Math.floor(interval) > 1 ? 's' : ''} ago`
  interval = seconds / 60
  return `${Math.floor(interval)} minute${Math.floor(interval) > 1 ? 's' : ''} ago`
}
