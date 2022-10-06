import { pathJoin } from '../utils'

export default function addfixMiddleware(ctx, next) {
  if (!ctx) return next()
  let { req: { options = {}, url } = {} } = ctx
  const { prefix, suffix } = options

  if (prefix) {
    url = pathJoin(prefix, url)
  }
  if (suffix) {
    url = pathJoin(url, suffix)
  }

  ctx.req.url = url
  ctx.req.options.url = url

  return next()
}
