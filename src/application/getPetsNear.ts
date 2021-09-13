import { Location, Pet } from '../domain/pets'

export type GetPets = (l: Location) => Promise<readonly Pet[]>

export type GetLocation = (u: IPAddress) => Promise<Location | null>

export type IPAddress = string & { _type: 'IPAddress' }

export type AdoptablePetsNear =
  | { type: 'UnknownLocation', ipAddress: IPAddress }
  | { type: 'Pets', location: Location, pets: readonly Pet[] }

export type GetPetsNearEnv = {
  getLocation: GetLocation
  getPets: GetPets
}

export const getPetsNear = ({ getLocation, getPets }: GetPetsNearEnv) =>
  async (ipAddress: IPAddress): Promise<AdoptablePetsNear> => {
    const location = await getLocation(ipAddress)
    return location === null
      ? { type: 'UnknownLocation', ipAddress: ipAddress }
      : { type: 'Pets', location, pets: await getPets(location) }
  }
