import { pathJoin } from '../utils'

export default function addfixMiddleware(ctx, next) {
  if (!ctx) return next()
  const { req: { options = {} } = {} } = ctx
  const { prefix, suffix } = options

  let url = options.url
  if (prefix) {
    const RE = /^https{0,1}\:\/\//
    const protocol = prefix.match(RE)?.[0] || ''
    const sub = prefix.replace(RE, '')
    url = protocol + pathJoin(sub, url)
  }
  if (suffix) {
    url = pathJoin(url, suffix)
  }

  ctx.req.url = ctx.req.options.url = url

  return next()
}
