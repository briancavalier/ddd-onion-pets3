import { Json } from './json'

export type Decode<I, O, E> = (i: I) => DecodeResult<O, E>

export type DecodeResult<O, E> = Ok<O> | Fail<E>
export type Ok<O> = { ok: true, value: O }
export type Fail<E> = { ok: false, error: E }

export type OutputOf<D extends Decode<unknown, unknown, unknown>> = D extends Decode<unknown, infer O, unknown> ? O : never
export type ErrorOf<D extends Decode<unknown, unknown, unknown>> = D extends Decode<unknown, unknown, infer E> ? E : never

export const ok = <O>(value: O): Ok<O> => ({ ok: true, value })
export const fail = <E>(error: E): Fail<E> => ({ ok: false, error })

export const name = <H extends string, I, O, E>(hint: H, d: Decode<I, O, E>): Decode<I, O, Label<H, E>> =>
  mapError(d, label(hint))

export const decode = <I, O, E>(d: Decode<I, O, E>, i: I): DecodeResult<O, E> =>
  d(i)

class DecodeAssertError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export const assert = <I, O, E>(d: Decode<I, O, E>) => (i: I): O => {
  const r = decode(d, i)
  if (r.ok) return r.value
  console.log(JSON.stringify(r, null, '  '))
  throw new DecodeAssertError(stringifyError(r.error as unknown as Node<string>))
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

export const mapError = <I, O, R, E>(d: Decode<I, O, E>, f: (e: E) => R): Decode<I, O, R> =>
  i => {
    const o = decode(d, i)
    return o.ok ? o : fail(f(o.error))
  }

export type Label<L, A> = { type: 'Label', label: L, value: A }

export const label = <L>(label: L) => <A>(value: A): Label<L, A> =>
  ({ type: 'Label', label, value })

export type Expected<L, A> = { type: 'Expected', label: L, value: A }

export const expected = <L>(label: L) => <A>(value: A): Expected<L, A> =>
  ({ type: 'Expected', label, value })

export const or = <I1, I2, O1, O2, E1, E2>(d1: Decode<I1, O1, E1>, d2: Decode<I2, O2, E2>): Decode<I1 & I2, O1 | O2, [E1, E2]> =>
  i => {
    const r1 = d1(i)
    if (r1.ok) return r1

    const r2 = d2(i)
    if (r2.ok) return r2

    return fail([r1.error, r2.error])
  }

export const nullable = <I, O, E>(d: Decode<I, O, E>): Decode<I, O | null, [E, UnexpectedInput<unknown>]> =>
  or(d, exactly(null))

export type UnexpectedInput<I> = { type: 'UnexpectedInput', input: I }

export const exactly = <A>(a: A): Decode<unknown, A, UnexpectedInput<unknown>> =>
  input => input === a ? ok(input as A) : fail({ type: 'UnexpectedInput', input })

export const is = <A extends I, I = unknown>(p: (input: I) => input is A): Decode<I, A, UnexpectedInput<I>> =>
  input => p(input)
    ? ok(input as A)
    : fail({ type: 'UnexpectedInput', input })

export const number = mapError(is((x: unknown): x is number => typeof x === 'number'), expected('number'))
export const string = mapError(is((x: unknown): x is string => typeof x === 'string'), expected('string'))
export const boolean = mapError(is((x: unknown): x is boolean => typeof x === 'boolean'), expected('boolean'))

export const list = mapError(is((x: unknown): x is readonly unknown[] => Array.isArray(x)), expected('unknown[]'))

export type KeyItemsFailed<E> = { type: 'KeyItemsFailed', errors: E }
export type AtKey<K, E> = { type: 'AtKey', key: K, error: E }

export const listOf = <I, O, E>(d: Decode<I, O, E>): Decode<readonly I[], readonly O[], KeyItemsFailed<readonly AtKey<number, E>[]>> =>
  ai => {
    const r: unknown[] = []
    const errors: AtKey<number, E>[] = []
    for (let k = 0; k < ai.length; k++) {
      const ir = decode(d, ai[k])
      if (!ir.ok) errors.push({ type: 'AtKey', key: k, error: ir.error })
      else r.push(ir.value)
    }
    return errors.length === 0 ? ok(r) as Ok<readonly O[]> : fail({ type: 'KeyItemsFailed', errors })
  }

export const record = mapError(is((x: unknown): x is Record<string, unknown> => Object.prototype.toString.call(x) === '[object Object]'), expected('Record<string, unknown>'))

type DecodeRecordResult<R extends Record<string, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R]: OutputOf<R[K]>
}

type DecodeRecordErrors<R extends Record<string, Decode<unknown, unknown, unknown>>> = {
  readonly [K in keyof R]: ErrorOf<R[K]> | Missing
}[keyof R]

export type Missing = { type: 'Missing' }

export const properties = <R extends Record<string, Decode<unknown, unknown, unknown>>>(r: R): Decode<Record<string, unknown>, DecodeRecordResult<R>, KeyItemsFailed<readonly AtKey<keyof R, Missing | DecodeRecordErrors<R>>[]>> =>
  ri => {
    const ro: Record<string, unknown> = {}
    const errors: AtKey<keyof R, Missing | DecodeRecordErrors<R>>[] = []
    for (const k of Object.keys(r)) {
      if (!Object.prototype.hasOwnProperty.call(ri, k)) {
        errors.push({ type: 'AtKey', key: k, error: { type: 'Missing' } })
      }
      else {
        const ir = decode(r[k], ri[k]) as DecodeResult<DecodeRecordResult<R>[keyof R], DecodeRecordErrors<R>>
        if (!ir.ok) errors.push({ type: 'AtKey', key: k, error: ir.error })
        else {
          ro[k] = ir.value
        }
      }
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
type ErrorAST = KeyItemsFailed<readonly Stringifiable[]> | UnexpectedInput<unknown> | Expected<unknown, Node<string>> | Label<unknown, Node<string>> | AtKey<string, Node<string>> | Missing
type Stringifiable = string | Node<string> | readonly Stringifiable[] | ErrorAST

export const stringifyError = (s: Stringifiable, depth = 0): string => {
  if (typeof s === 'string') return s
  if (Array.isArray(s)) return s.map(x => stringifyError(x, depth + 1)).join('\n')

  const n = s as ErrorAST
  if (n.type === 'KeyItemsFailed') return `\n${stringifyError(n.errors, depth + 1)}`
  if (n.type === 'AtKey') return `${pad(depth)}${n.key}: ${stringifyError(n.error, depth + 1)}`
  if (n.type === 'Label') return `[${n.label}] ${stringifyError(n.value, depth + 1)}`
  if (n.type === 'Expected') return `expected ${n.label}, got ${stringifyError(n.value, depth + 1)}`
  if (n.type === 'UnexpectedInput') return `${n.input}: ${typeof n.input}`
  if (n.type === 'Missing') return `<missing>`

  const { type, ...data } = n as Node<string>
  return `${type}: ${data}`
}
`
// const p = pipe(list, listOf(pipe(record, properties({
//   name: string,
//   age: number,
//   address: pipe(record, properties({
//     street: string
//   }))
// }))))

// const r = decode(name('people array', p), [
//   { name: 'Bob', age: 'a', address: { street: 'a' } },
//   { name: 'Alice', age: 27, address: {} },
//   { name: 'Dennis', age: 37, address: { street: 'b' } }
// ])

// console.log(r)
// if (!r.ok) console.log(stringifyError(r.error))
`
