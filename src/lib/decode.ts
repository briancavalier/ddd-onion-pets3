import { Json } from './json'

export type Decode<I, O, E> = (i: I) => DecodeResult<O, E>

export type DecodeResult<O, E> = Ok<O> | Fail<E>
export type Ok<O> = { ok: true, value: O }
export type Fail<E> = { ok: false, error: E }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InputOf<D extends Decode<any, unknown, unknown>> = D extends Decode<infer I, unknown, unknown> ? I : never
export type OutputOf<D extends Decode<unknown, unknown, unknown>> = D extends Decode<unknown, infer O, unknown> ? O : never
export type ErrorOf<D extends Decode<unknown, unknown, unknown>> = D extends Decode<unknown, unknown, infer E> ? E : never

export const ok = <O>(value: O): Ok<O> => ({ ok: true, value })
export const fail = <E>(error: E): Fail<E> => ({ ok: false, error })

export const decode = <I, O, E>(d: Decode<I, O, E>) => (i: I): DecodeResult<O, E> =>
  runDecode(d, i)

const runDecode = <I, O, E>(d: Decode<I, O, E>, i: I): DecodeResult<O, E> =>
  d(i)

class DecodeAssertError extends Error {}

export const assert = <I, O, E>(d: Decode<I, O, E>) => (i: I): O => {
  const r = runDecode(d, i)
  if (r.ok) return r.value
  throw new DecodeAssertError(renderFail(r as unknown as Fail<Stringifiable>))
}

export const pipe = <I, X, O, E1, E2>(d1: Decode<I, X, E1>, d2: Decode<X, O, E2>): Decode<I, O, E1 | E2> =>
  i => {
    const x = runDecode(d1, i)
    return x.ok ? runDecode(d2, x.value) : x
  }

export const mapInput = <I, H, O, E> (f: (i: I) => H, d: Decode<H, O, E>): Decode<I, O, E> =>
  i => runDecode(d, f(i))

export const mapOutput = <I, O, R, E>(d: Decode<I, O, E>, f: (o: O) => R): Decode<I, R, E> =>
  i => {
    const o = runDecode(d, i)
    return o.ok ? ok(f(o.value)) : fail(o.error)
  }

export const mapError = <I, O, R, E>(d: Decode<I, O, E>, f: (e: E) => R): Decode<I, O, R> =>
  i => {
    const o = runDecode(d, i)
    return o.ok ? o : fail(f(o.error))
  }

export type Label<L, A> = { type: 'Label', label: L, value: A }

export const label = <L>(label: L) => <A>(value: A): Label<L, A> =>
  ({ type: 'Label', label, value })

export const context = <Context, I, O, E>(context: Context, d: Decode<I, O, E>): Decode<I, O, Label<Context, E>> =>
  mapError(d, label(context))

export const or = <I1, I2, O1, O2, E1, E2>(d1: Decode<I1, O1, E1>, d2: Decode<I2, O2, E2>): Decode<I1 & I2, O1 | O2, [E1, E2]> =>
  i => {
    const r1 = d1(i)
    if (r1.ok) return r1

    const r2 = d2(i)
    if (r2.ok) return r2

    return fail([r1.error, r2.error])
  }

export const nullable = <I, O, E>(d: Decode<I, O, E>): Decode<I, O | null, [E, UnexpectedInput<null, unknown>]> =>
  or(d, exactly(null))

export type UnexpectedInput<H, I> = { type: 'UnexpectedInput', expected: H, input: I }

export const exactly = <A>(a: A): Decode<unknown, A, UnexpectedInput<A, unknown>> =>
  input => input === a ? ok(input as A) : fail({ type: 'UnexpectedInput', expected: a, input })

export const is = <Hint, A extends I, I = unknown>(expected: Hint, p: (input: I) => input is A): Decode<I, A, UnexpectedInput<Hint, I>> =>
  input => p(input)
    ? ok(input as A)
    : fail({ type: 'UnexpectedInput', expected, input })

export const number = is('number', (x: unknown): x is number => typeof x === 'number')
export const string = is('string', (x: unknown): x is string => typeof x === 'string')
export const boolean = is('boolean', (x: unknown): x is boolean => typeof x === 'boolean')
export const unknown = is('unknown', (x: unknown): x is unknown => true)

export const float = (s: string): DecodeResult<number, never> =>
  ok(parseFloat(s))

export const list = is('unknown[]', (x: unknown): x is readonly unknown[] => Array.isArray(x))

export type KeyItemsFailed<E> = { type: 'KeyItemsFailed', errors: E }
export type AtKey<K, E> = { type: 'AtKey', key: K, error: E }

export const listOf = <I, O, E>(d: Decode<I, O, E>): Decode<readonly I[], readonly O[], KeyItemsFailed<readonly AtKey<number, E>[]>> =>
  ai => {
    const r: unknown[] = []
    const errors: AtKey<number, E>[] = []
    for (let k = 0; k < ai.length; k++) {
      const ir = runDecode(d, ai[k])
      if (!ir.ok) errors.push({ type: 'AtKey', key: k, error: ir.error })
      else r.push(ir.value)
    }
    return errors.length === 0 ? ok(r) as Ok<readonly O[]> : fail({ type: 'KeyItemsFailed', errors })
  }

export const rec = <K extends PropertyKey, V, KE, VE>(keys: Decode<unknown, K, KE>, values: Decode<unknown, V, VE>): Decode<unknown, Record<K, V>, UnexpectedInput<'Record<string, unknown>', unknown> | KeyItemsFailed<readonly AtKey<unknown, KE | VE>[]>> =>
  i => {
    if (Object.prototype.toString.call(i) !== '[object Object]') return fail({ type: 'UnexpectedInput', expected: 'Record<string, unknown>', input: i })
    const r = i as Record<PropertyKey, unknown>
    const ks = Object.keys(r)
    const errors: AtKey <unknown, KE | VE>[] = []
    const result = {} as Record<K, V>

    for(const k of ks) {
      const kr = keys(k)
      if(!kr.ok) errors.push({ type: 'AtKey', key: k, error: kr.error })
      else {
        const kv = values(r[k])
        if (!kv.ok) errors.push({ type: 'AtKey', key: k, error: kv.error })
        else result[kr.value] = kv.value
      }
    }

    return errors.length === 0
      ? ok(result)
      : fail({ type: 'KeyItemsFailed', errors })
  }

export const record = rec(string, unknown)//is('Record<string, unknown>', (x: unknown): x is Record<string, unknown> => Object.prototype.toString.call(x) === '[object Object]')

type DecodeRecordInput<R extends Record<string, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R as string]: InputOf<R[K]>
}

type DecodeRecordResult<R extends Record<string, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R]: OutputOf<R[K]>
}

type DecodeRecordErrors<R extends Record<string, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R]: ErrorOf<R[K]>
}[keyof R]

export const properties = <R extends Record<string, Decode<unknown, unknown, unknown>>>(r: R): Decode<DecodeRecordInput<R>, DecodeRecordResult<R>, KeyItemsFailed<readonly AtKey<keyof R, DecodeRecordErrors<R>>[]>> =>
  ri => {
    const ro: Record<string, unknown> = {}
    const errors: AtKey<keyof R, DecodeRecordErrors<R>>[] = []
    for (const k of Object.keys(r)) {
      const ir = runDecode(r[k], ri[k]) as DecodeResult<DecodeRecordResult<R>[keyof R], DecodeRecordErrors<R>>
      if (!ir.ok) errors.push({ type: 'AtKey', key: k, error: ir.error })
      else ro[k] = ir.value
    }

    return Object.keys(errors).length === 0
      ? ok(ro as DecodeRecordResult<R>)
      : fail({ type: 'KeyItemsFailed', errors })
  }

export type InvalidUrlString = { type: 'InvalidUrlString', error: unknown }

export const url = (s: string): DecodeResult<URL, InvalidUrlString> => {
  try {
    return ok(new URL(s))
  } catch (e) {
    return fail({ type: 'InvalidUrlString', error: e })
  }
}

export type JsonParseError = { type: 'JsonParseError', error: unknown }

export const json = (s: string): DecodeResult<Json, JsonParseError> => {
  try {
    return ok(JSON.parse(s))
  } catch (e) {
    return fail({ type: 'JsonParseError', error: e })
  }
}

export const renderFail = ({ error }: Fail<Stringifiable>): string =>
  stringifyError(error)

const pad = (n: number, p = ' '): string => n > 1 ? p + pad(n - 1, p) : p

type Node<T extends string> = { type: T }
type ErrorAST = KeyItemsFailed<readonly Stringifiable[]> | UnexpectedInput<unknown, unknown> | Label<unknown, Node<string>> | AtKey<string, Node<string>>
type Stringifiable = string | Error | Node<string> | readonly Stringifiable[] | ErrorAST

export const stringifyError = (s: Stringifiable, depth = 0): string => {
  if (typeof s === 'string') return s
  if (Array.isArray(s)) return s.map(x => stringifyError(x, depth + 1)).join('\n')

  const n = s as ErrorAST
  if (n.type === 'KeyItemsFailed') return `\n${stringifyError(n.errors, depth + 1)}`
  if (n.type === 'AtKey') return `${pad(depth)}${n.key}: ${stringifyError(n.error, depth + 1)}`
  if (n.type === 'Label') return `[${n.label}] ${stringifyError(n.value, depth + 1)}`
  if (n.type === 'UnexpectedInput') return `expected ${n.expected}, got ${n.input}: ${typeof n.input}`

  const { type, ...data } = n as Node<string>
  return `${type}: ${JSON.stringify(data)}`
}
