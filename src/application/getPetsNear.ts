import { Location, Pet } from '../domain/pets'

export type GetPets = (l: Location) => Promise<readonly Pet[]>

export type GetLocation<LocationQuery> = (q: LocationQuery) => Promise<Location | null>

export type IPAddress = string & { _type: 'IPAddress' }

export type LocationQuery =
  | { type: 'Geo' } & Geo
  | { type: 'CityState' } & CityState
  | { type: 'IPAddress', ip: IPAddress }

export type Geo = { lat: number, lon: number }
export type CityState = { city: string, state: string }

export type AdoptablePetsNear<Query> =
  | { type: 'UnknownLocation', query: Query }
  | { type: 'Pets', query: Query, location: Location, pets: readonly Pet[] }

export type GetPetsNearEnv<Query> = {
  getLocation: GetLocation<Query>,
  getPets: GetPets
}

export const getPetsNear = <Query>({ getLocation, getPets }: GetPetsNearEnv<Query>) =>
  async (query: Query): Promise<AdoptablePetsNear<Query>> => {
    const location = await getLocation(query)

    return location === null
    ? { type: 'UnknownLocation', query }
    : { type: 'Pets', query, location, pets: await getPets(location) }
  }
