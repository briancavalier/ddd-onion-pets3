import fastify from 'fastify'

import { IPAddress, getPetsNear } from './application'
import { http } from './infrastructure/http-node'
import { PetfinderAuth, getPetfinderPets } from './infrastructure/petfinder'
import { getIPAddressLocation } from './infrastructure/radar'

const fail = (msg: string): never => {
  throw new Error(msg)
}

const petfinderAuth: PetfinderAuth = {
  client_id: process.env.PETFINDER_ID ?? fail('process.env.PETFINDER_ID must be set'),
  client_secret: process.env.PETFINDER_SECRET ?? fail('process.env.PETFINDER_SECRET must be set'),
  grant_type: 'client_credentials'
}

const radarAPIKey = process.env.RADAR_API_KEY ?? fail('process.env.RADAR_API_KEY must be set')

const env = {
  getLocation: getIPAddressLocation({ radarAPIKey, http }),
  getPets: getPetfinderPets({ petfinderAuth, http })
}

const decodeIPAddress = (ip: string): IPAddress | null =>
  /([0-9A-Fa-f:]+)|([0-9.]+)/.test(ip) ? ip as IPAddress : null

const getPetsNearIPAddress = getPetsNear(env)

fastify({ logger: true })
  .get('/', async (req, res) => {
    const ip = decodeIPAddress('72.65.255.176')
    if (ip == null) return res.status(400).send()

    const pets = await getPetsNearIPAddress(ip)
    return res.header('content-type', 'application/json').send(JSON.stringify(pets, null, '  '))
  })
  .listen(3000).then(x => console.log(`Ready: ${x}`))
