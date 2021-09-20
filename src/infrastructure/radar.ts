// export type GetLocation<UserInfo, Location> = (u: UserInfo) => Promise<Location | null>

import { CityState, Geo, IPAddress, LocationQuery } from '../application/getPetsNear'
import { Location } from '../domain/pets'
import { assert, list, listOf, mapOutput, nullable, number, pipe, properties, record, string } from '../lib/decode'
import { Json } from '../lib/json'

import { Http, get, jsonRequest } from './http'

export type RadarEnv = {
  http: Http,
  radar: {
    baseUrl: URL,
    apiKey: string
  }
}

export const getRadarLocation = (env: RadarEnv) => (q: LocationQuery): Promise<Location | null> => {
  switch(q.type) {
    case 'IPAddress': return getIPAddressLocation(env, q.ip)
    case 'Geo': return getGeoLocation(env, q)
    case 'CityState': return getCityStateLocation(env, q)
  }
}

export const getIPAddressLocation = (env: RadarEnv, ip: IPAddress): Promise<Location | null> =>
  radarRequest(env, new URL(`geocode/ip?ip=${ip}`, env.radar.baseUrl))
    .then(assert(decodeAddressLocation))

export const getCityStateLocation = (env: RadarEnv, { city, state }: CityState): Promise<Location | null> =>
  radarRequest(env, new URL(`geocode/forward?country=us&layers=coarse&query=${city}+${state}`, env.radar.baseUrl))
    .then(assert(decodeAddressesLocation))
    .then(head)

export const getGeoLocation = (env: RadarEnv, { lat, lon }: Geo): Promise<Location | null> =>
  radarRequest(env, new URL(`geocode/reverse?layers=coarse&coordinates=${lat},${lon}`, env.radar.baseUrl))
    .then(assert(decodeAddressesLocation))
    .then(head)

const radarRequest = ({ http, radar: { apiKey } }: RadarEnv, url: URL): Promise<Json> =>
  // eslint-disable-next-line @typescript-eslint/naming-convention
  jsonRequest(http, get(url, { Authorization: apiKey }))

export const decodeRadarAddress = properties({
  latitude: number,
  longitude: number,
  city: string,
  state: string
})

export const decodeAddressLocation = nullable(mapOutput(
  pipe(record, properties({
    address: pipe(record, decodeRadarAddress)
  })),
  ({ address }) => radarAddressToLocation(address)
))

export const decodeAddressesLocation = mapOutput(
  pipe(record, properties({
    addresses: pipe(list, listOf(pipe(record, decodeRadarAddress)))
  })),
  ({ addresses }) => addresses.map(radarAddressToLocation)
)

export type RadarAddress = {
  city: string,
  state: string,
  latitude: number,
  longitude: number
}

export const radarAddressToLocation = ({ latitude, longitude, city, state }: RadarAddress): Location =>
  ({ latitude, longitude, city, state })

export const head = <A>([a]: readonly A[]): A | null =>
  a ?? null
