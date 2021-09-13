export type Decode<I, O, E> = (i: I) => DecodeResult<O, E>

export type DecodeResult<O, E> = Ok<O> | Fail<E>
export type Ok<O> = { ok: true, value: O }
export type Fail<E> = { ok: false, error: E }

export type OutputOf<D extends Decode<unknown, unknown, unknown>> = D extends Decode<any, infer O, any> ? O : never
export type ErrorOf<D extends Decode<unknown, unknown, unknown>> = D extends Decode<any, any, infer E> ? E : never

export const ok = <O>(value: O): Ok<O> => ({ ok: true, value })
export const fail = <E>(error: E): Fail<E> => ({ ok: false, error })

export const decode = <I, O, E>(d: Decode<I, O, E>, i: I): DecodeResult<O, E> =>
  d(i)

class DecodeAssertError<D> extends Error {
  constructor(public readonly detail: D, message: string) {
    super(message)
  }
}

export const assert = <I, O>(d: Decode<I, O, unknown>) => (i: I): O => {
  const r = decode(d, i)
  if (r.ok) return r.value
  throw new DecodeAssertError(r, 'decoding assertion failed')
}

export const pipe = <I, X, O, E1, E2>(d1: Decode<I, X, E1>, d2: Decode<X, O, E2>): Decode<I, O, E1 | E2> =>
  i => {
    const x = decode(d1, i)
    return x.ok ? decode(d2, x.value) : x
  }

export const mapOutput = <I, O, R, E>(d: Decode<I, O, E>, f: (o: O) => R): Decode<I, R, E> =>
  i => {
    const o = decode(d, i)
    return o.ok ? ok(f(o.value)) : fail(o.error)
  }

export const or = <I1, I2, O1, O2, E1, E2>(d1: Decode<I1, O1, E1>, d2: Decode<I2, O2, E2>): Decode<I1 & I2, O1 | O2, [E1, E2]> =>
  i => {
    const r1 = d1(i)
    if (r1.ok) return r1

    const r2 = d2(i)
    if (r2.ok) return r2

    return fail([r1.error, r2.error])
  }

export const nullable = <I, O, E>(d: Decode<I, O, E>) =>
  or(d, exactly(null))

export type UnexpectedInput<I> = { type: 'UnexpectedInput', input: I }

export const exactly = <A>(a: A): Decode<unknown, A, UnexpectedInput<unknown>> =>
  input => input === a ? ok(input as A) : fail({ type: 'UnexpectedInput', input })

export const is = <A extends I, I = unknown>(p: (input: I) => input is A): Decode<I, A, UnexpectedInput<I>> =>
  input => p(input)
    ? ok(input as A)
    : fail({ type: 'UnexpectedInput', input })

export const number = is((x: unknown): x is number => typeof x === 'number')
export const string = is((x: unknown): x is string => typeof x === 'string')
export const boolean = is((x: unknown): x is boolean => typeof x === 'boolean')

export const list = is((x: unknown): x is readonly unknown[] => Array.isArray(x))

export type AtKey<K, E> = { type: 'AtKey', key: K, error: E }

export const listOf = <I, O, E>(d: Decode<I, O, E>): Decode<readonly I[], readonly O[], AtKey<number, E>> =>
  ai => {
    const r: unknown[] = []
    for (let k = 0; k < ai.length; k++) {
      const ir = decode(d, ai[k])
      if (!ir.ok) return fail({ type: 'AtKey', key: k, error: ir.error })
      r.push(ir.value)
    }
    return ok(r) as Ok<readonly O[]>
  }

export const record = is((x: unknown): x is Record<PropertyKey, unknown> => Object.prototype.toString.call(x) === '[object Object]')

type DecodeRecordResult<R extends Record<PropertyKey, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R]: OutputOf<R[K]>
}

type DecodeRecordError<R extends Record<PropertyKey, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R]: ErrorOf<R[K]>
}

type MissingKey<K> = { type: 'MissingKey', key: K }

export const properties = <R extends Record<PropertyKey, Decode<unknown, unknown, unknown>>>(r: R): Decode<Record<PropertyKey, unknown>, DecodeRecordResult<R>, MissingKey<keyof R> | AtKey<keyof R, DecodeRecordError<R>[keyof R]>> =>
  ri => {
    const ro: Record<PropertyKey, unknown> = {}
    const rk = (Object.keys(r) as (keyof typeof r)[])
    for (const k of rk) {
      if (!ri.hasOwnProperty(k)) return fail({ type: 'MissingKey', key: k })

      const ir = decode(r[k], ri[k])
      if (!ir.ok) return fail({ type: 'AtKey', key: k, error: ir.error } as AtKey<typeof k, DecodeRecordError<R>[typeof k]>)
      ro[k] = ir.value
    }

    return ok(ro as DecodeRecordResult<R>)
  }

export type InvalidUrlString = { type: 'InvalidUrlString', error: unknown }

export const url = (s: string): DecodeResult<URL, InvalidUrlString> => {
  try {
    return ok(new URL(s))
  } catch (e) {
    return fail({ type: 'InvalidUrlString', error: e })
  }
}

export type Json = number | string | boolean | readonly Json[] | JsonObject

export interface JsonObject extends Record<string, Json> { }

export type JsonParseError = { type: 'JsonParseError', error: unknown }

export const json = (s: string): DecodeResult<Json, unknown> => {
  try {
    return ok(JSON.parse(s))
  } catch (e) {
    return fail({ type: 'JsonParseError', error: e })
  }
}
