import fastify from 'fastify'

import { getPetsNear } from '../application/getPetsNear'
import { http } from '../infrastructure/http-node'
import { PetfinderAuth, getPetfinderPets } from '../infrastructure/petfinder'
import { IPAddress, getIPAddressLocation } from '../infrastructure/radar'
import { assert, context, is, pipe, properties, record, string } from '../lib/decode'

const decodeEnv = pipe(record, properties({
  /* eslint-disable @typescript-eslint/naming-convention */
  PETFINDER_ID: string,
  PETFINDER_SECRET: string,
  RADAR_API_KEY: string
  /* eslint-enable @typescript-eslint/naming-convention */
}))

const { PETFINDER_ID, PETFINDER_SECRET, RADAR_API_KEY } = assert(context('process.env', decodeEnv))(process.env)

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

const decodeIPAddress = is('IPAddress', (x: string): x is IPAddress =>
  /(([0-9]{1,3}.){3}[0-9]{1,3})/.test(x))

const getPetsNearIPAddress = getPetsNear(env)

fastify({ logger: true })
  .get('/', async (req) => {
    const ip = assert(context('request.ip', decodeIPAddress))(req.ip)
    // const ip = assert(context('request.ip', decodeIPAddress))('72.65.255.176')
    // const ip = assert(context('request.ip', decodeIPAddress))('72')

    return getPetsNearIPAddress(ip)
  })
  .listen(3000).then(x => console.log(`Ready: ${x}`))
