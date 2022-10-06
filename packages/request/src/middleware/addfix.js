import { pathJoin } from '../utils'

export default function addfixMiddleware(ctx, next) {
  if (!ctx) return next()
  const { req: { options = {} } = {} } = ctx
  const { prefix, suffix } = options

  let url = options.url
  if (prefix) {
    url = pathJoin(prefix, url)
  }
  if (suffix) {
    url = pathJoin(url, suffix)
  }

  ctx.req.url = ctx.req.options.url = url

  return next()
}
