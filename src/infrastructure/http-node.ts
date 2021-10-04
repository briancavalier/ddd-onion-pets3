import { request as requestHttp } from 'http'
import { request as requestHttps } from 'https'

import { Request, Response } from './http'

export const http = <A>({ url, ...options }: Request<A>): Promise<Response<A>> =>
  new Promise(resolve => {
    const c = url.protocol === 'https:'
      ? requestHttps(url.toString(), options, resolve)
      : requestHttp(url.toString(), options, resolve)

    return c.end(options.method === 'POST' && options.body)
  })
