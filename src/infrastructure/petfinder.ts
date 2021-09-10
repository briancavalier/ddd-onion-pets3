import { Location, Pet } from '../domain'
import { Http, get, jsonRequest, post } from './http'

export type PetfinderPets = {
  animals: readonly Animal[]
}

export type Animal = {
  name: string,
  url: string,
  photos: readonly Photo[]
}

export type Photo = {
  medium: string
}

export type PetfinderToken = {
  access_token: string
}

export type PetfinderAuth = {
  grant_type: 'client_credentials',
  client_id: string,
  client_secret: string
}

export type PetfinderEnv = {
  http: Http,
  petfinderAuth: PetfinderAuth
}

export const getPetfinderPets = (e: PetfinderEnv) => async (l: Location): Promise<readonly Pet[]> => {
  const token = await petfinderAuth(e.http, e.petfinderAuth)
  return petfinderPets(e.http, token, l)
}

export const petfinderAuth = (http: Http, auth: PetfinderAuth): Promise<PetfinderToken> =>
  jsonRequest(http, post(new URL('https://api.petfinder.com/v2/oauth2/token'), JSON.stringify(auth)))
    .then(decodeToken)

export const petfinderPets = (http: Http, { access_token }: PetfinderToken, l: Location): Promise<readonly Pet[]> =>
  jsonRequest(http,
    get(new URL(`https://api.petfinder.com/v2/animals?location=${l.latitude},${l.longitude}&distance=10`), {
      Authorization: `Bearer ${access_token}`
    })).then(decodePets)

export const decodeToken = (x: unknown): PetfinderToken => x as PetfinderToken

export const decodePets = (x: unknown): readonly Pet[] => (x as PetfinderPets).animals.map(toPet)

export const toPet = ({ name, url, photos }: Animal): Pet =>
  ({ name, url, photoUrl: photos[0]?.medium })
