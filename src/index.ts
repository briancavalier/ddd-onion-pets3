import fastify from 'fastify'

import { IPAddress, getPetsNear } from './application/getPetsNear'
import { http } from './infrastructure/http-node'
import { PetfinderAuth, getPetfinderPets } from './infrastructure/petfinder'
import { getIPAddressLocation } from './infrastructure/radar'
import { assert, expected, is, mapError, pipe, properties, record, string } from './lib/decode'

const decodeEnv = pipe(record, properties({
  /* eslint-disable @typescript-eslint/naming-convention */
  PETFINDER_ID: string,
  PETFINDER_SECRET: string,
  RADAR_API_KEY: string
  /* eslint-enable @typescript-eslint/naming-convention */
}))

const { PETFINDER_ID, PETFINDER_SECRET, RADAR_API_KEY } = assert(decodeEnv)(process.env)

const petfinderAuth: PetfinderAuth = {
  /* eslint-disable @typescript-eslint/naming-convention */
  client_id: PETFINDER_ID,
  client_secret: PETFINDER_SECRET,
  grant_type: 'client_credentials'
  /* eslint-enable @typescript-eslint/naming-convention */
}

const radarAPIKey = RADAR_API_KEY

const env = {
  getLocation: getIPAddressLocation({ radarAPIKey, http }),
  getPets: getPetfinderPets({ petfinderAuth, http })
}

const decodeIPAddress = mapError(is((x: string): x is IPAddress =>
  /(([0-9]{1,3}.){3}[0-9]{1,3})/.test(x)), expected('IPAddress'))

const getPetsNearIPAddress = getPetsNear(env)

fastify({ logger: true })
  .get('/', async (req, res) => {
    const ip = assert(decodeIPAddress)(req.ip) //('72.65.255.176')
    const pets = await getPetsNearIPAddress(ip)
    return res.header('content-type', 'application/json').send(JSON.stringify(pets, null, '  '))
  })
  .listen(3000).then(x => console.log(`Ready: ${x}`))
