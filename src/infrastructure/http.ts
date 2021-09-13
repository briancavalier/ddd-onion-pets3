import { Json, assert, json } from '../lib/decode'

export type RequestHeaders = Record<string, number | string | string[]>
export type ResponseHeaders = Record<string, string | string[] | undefined>

export type Request<A> = Get<A> | Post<A>
export type Get<A> = Req<A> & { method: 'GET' }
export type Post<A> = Req<A> & { method: 'POST', body: string }
export type Req<A> = { url: URL, headers?: RequestHeaders, _type?: A }

export type Response<A> = { statusCode?: number, headers: ResponseHeaders, _type?: A } & AsyncIterable<string>

export type Http = <A>(r: Request<A>) => Promise<Response<A>>

export const get = <A>(url: URL, headers: RequestHeaders = {}): Get<A> => ({ method: 'GET', url, headers })
export const post = <A>(url: URL, body: string, headers: RequestHeaders = {}): Post<A> => ({ method: 'POST', url, body, headers })

export const readResponseBody = async <A>(r: Response<A>): Promise<string> => {
  if (typeof r.statusCode !== 'number') {
    return Promise.reject(new Error(`HTTP Request failed: ${r}`))
  }

  let d = ''
  for await (const s of r) d += s
  return r.statusCode >= 300
    ? Promise.reject(new Error(`${r}: ${d}`))
    : d
}

export const jsonRequest = (http: Http, { headers, ...r }: Request<Json>): Promise<Json> =>
  http({
    ...r,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers
    }
  }).then(readResponseBody).then(assert(json))
