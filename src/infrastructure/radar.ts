// export type GetLocation<UserInfo, Location> = (u: UserInfo) => Promise<Location | null>

import { IPAddress } from '../application'
import { Location } from '../domain'
import { Http, get, jsonRequest } from './http'

export type RadarEnv = {
  http: Http,
  radarAPIKey: string
}

export const getIPAddressLocation = ({ http, radarAPIKey }: RadarEnv) => (ip: IPAddress): Promise<Location | null> =>
  jsonRequest(http, get(new URL(`https://api.radar.io/v1/geocode/ip?ip=${ip}`), {
    Authorization: radarAPIKey
  }))
    .then(decodeRadarLocation)

export const decodeRadarLocation = (x: unknown): Location | null => {
  if (x == null || Array.isArray(x) || typeof x !== 'object') return null

  const { address } = x as Record<string, Record<string, unknown>>
  if (!address) return null

  console.log(address)
  const { latitude, longitude, city, state } = address
  console.log(latitude, longitude, city, state)
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof city !== 'string' ||
    typeof state !== 'string'
  ) return null

  return { latitude, longitude, city, state }
}
