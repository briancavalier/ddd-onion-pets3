import { Location, Pet } from '../domain/pets'
import { OutputOf, assert, list, listOf, mapOutput, pipe, properties, record, string, url
} from '../lib/decode'

import { Http, get, jsonRequest, post } from './http'

export type PetfinderToken = OutputOf<typeof decodeToken>

export type PetfinderAuth = {
  /* eslint-disable @typescript-eslint/naming-convention */
  grant_type: 'client_credentials',
  client_id: string,
  client_secret: string
  /* eslint-enable @typescript-eslint/naming-convention */
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
    .then(assert(decodeToken))

// eslint-disable-next-line @typescript-eslint/naming-convention
export const petfinderPets = (http: Http, { access_token }: PetfinderToken, l: Location): Promise<readonly Pet[]> =>
  jsonRequest(http,
    get(new URL(`https://api.petfinder.com/v2/animals?location=${l.latitude},${l.longitude}&distance=10`), {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Authorization: `Bearer ${access_token}`
    })).then(assert(decodePets))

export const decodeToken = pipe(record, properties({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  access_token: string
}))

export const decodePets = mapOutput(pipe(record, properties({
  animals: pipe(list, listOf(pipe(record, properties({
    name: string,
    url: string,
    photos: pipe(list, listOf(pipe(record, properties({
      medium: pipe(string, url)
    }))))
  }))))
})), ({ animals }) => animals.map(({ name, url, photos }) => ({ name, url, photoUrl: photos[0]?.medium })))
