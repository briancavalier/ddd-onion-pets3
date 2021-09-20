import fastify from 'fastify'

import { CityState, Geo, IPAddress, getPetsNear } from '../application/getPetsNear'
import { http } from '../infrastructure/http-node'
import { PetfinderAuth, getPetfinderPets } from '../infrastructure/petfinder'
import { getRadarLocation } from '../infrastructure/radar'
import { assert, context, float, is, mapInput, mapOutput, or, pipe, properties, record, string, url } from '../lib/decode'

const decodeEnv = pipe(record, properties({
  /* eslint-disable @typescript-eslint/naming-convention */
  PETFINDER_ID: string,
  PETFINDER_SECRET: string,
  RADAR_API_KEY: string,
  RADAR_BASE_URL: pipe(string, url)
  /* eslint-enable @typescript-eslint/naming-convention */
}))

const { PETFINDER_ID, PETFINDER_SECRET, RADAR_API_KEY, RADAR_BASE_URL } = assert(context('process.env', decodeEnv))(process.env)

const petfinderAuth: PetfinderAuth = {
  /* eslint-disable @typescript-eslint/naming-convention */
  client_id: PETFINDER_ID,
  client_secret: PETFINDER_SECRET,
  grant_type: 'client_credentials'
  /* eslint-enable @typescript-eslint/naming-convention */
}

const radar = {
  baseUrl: RADAR_BASE_URL,
  apiKey: RADAR_API_KEY
}

const env = {
  getLocation: getRadarLocation({ radar, http }),
  getPets: getPetfinderPets({ petfinderAuth, http })
}

const decodeGeo = properties({ lat: pipe(string, float), lon: pipe(string, float) })
const decodeCityState = properties({ city: string, state: string })

const decodeQuery = or(
  mapOutput(decodeGeo, geo => ({ type: 'Geo', ...geo }) as const),
  mapOutput(decodeCityState, cityState => ({ type: 'CityState', ...cityState }) as const)
)

const decodeIPAddress = is('IPAddress', (x: string): x is IPAddress =>
  /(([0-9]{1,3}.){3}[0-9]{1,3})/.test(x))

const decodeRequestIPAddress = mapOutput(decodeIPAddress, ip => ({ type: 'IPAddress', ip }) as const)

type HasIPAddress = { ip: string }
type HasQuery<Query> = { query: Query }

const decodeLocationQuery = or(
  mapInput((r: HasQuery<Geo | CityState>) => r.query, decodeQuery),
  mapInput((r: HasIPAddress) => r.ip, decodeRequestIPAddress)
)

const getPets = getPetsNear(env)

fastify({ logger: true })
  // eslint-disable-next-line @typescript-eslint/naming-convention
  .get<{ Querystring: Geo | CityState }>('/', async (req) => {
    const r = decodeLocationQuery(req)
    return r.ok ? getPets(r.value) : { status: 401, properties: r.error }
  })
  .listen(3000).then(x => console.log(`Ready: ${x}`))
