import { Location, Pet } from '../domain'
import { Http, jsonRequest, post } from './http'

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
  const p = await petfinderPets(e.http, token, l)
  return p.animals.map(toPet)
}

export const toPet = ({ name, url, photos }: Animal): Pet =>
  ({ name, url, photoUrl: photos[0]?.medium })

export const petfinderAuth = (http: Http, auth: PetfinderAuth): Promise<PetfinderToken> =>
  jsonRequest<PetfinderToken>(http, post(new URL('https://api.petfinder.com/v2/oauth2/token'), JSON.stringify(auth)))

export const petfinderPets = (http: Http, { access_token }: PetfinderToken, l: Location): Promise<PetfinderPets> =>
  jsonRequest<PetfinderPets>(http,
    post(new URL(`https://api.petfinder.com/v2/animals?location=${l.latitude},${l.longitude}&distance=10`), '', {
      Authorization: `Bearer ${access_token}`
    }))
