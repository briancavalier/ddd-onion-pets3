// export type GetLocation<UserInfo, Location> = (u: UserInfo) => Promise<Location | null>

import { Location } from '../domain/pets'
import { assert, mapOutput, nullable, number, pipe, properties, record, string } from '../lib/decode'

import { Http, get, jsonRequest } from './http'

export type IPAddress = string & { _type: 'IPAddress' }

export type RadarEnv = {
  http: Http,
  radarAPIKey: string
}

export const getIPAddressLocation = ({ http, radarAPIKey }: RadarEnv) => (ip: IPAddress): Promise<Location | null> =>
  jsonRequest(http, get(new URL(`https://api.radar.io/v1/geocode/ip?ip=${ip}`), {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Authorization: radarAPIKey
  }))
    .then(assert(decodeRadarLocation))

export const decodeRadarLocation = nullable(mapOutput(pipe(record, properties({
  address: pipe(record, properties({
    latitude: number,
    longitude: number,
    city: string,
    state: string
  }))
})), ({ address: { latitude, longitude, city, state } }) => ({
  latitude, longitude, city, state
})))
