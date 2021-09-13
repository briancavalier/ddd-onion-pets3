export type GetPets<Location, Pets> = (l: Location) => Promise<Pets>

export type GetLocation<UserInfo, Location> = (u: UserInfo) => Promise<Location | null>

export type IPAddress = string & { _type: 'IPAddress' }

export type AdoptablePetsNear<UserInfo, Location, Pet> =
  | { type: 'UnknownLocation', userInfo: UserInfo }
  | { type: 'Pets', location: Location, pets: readonly Pet[] }

export type GetPetsNearEnv<UserInfo, Location, Pet> = {
  getLocation: GetLocation<UserInfo, Location | null>,
  getPets: GetPets<Location, readonly Pet[]>
}

export const getPetsNear = <UserInfo, Location, Pet>({ getLocation, getPets }: GetPetsNearEnv<UserInfo, Location, Pet>) =>
  async (user: UserInfo): Promise<AdoptablePetsNear<UserInfo, Location, Pet>> => {
    const location = await getLocation(user)
    return location === null
      ? { type: 'UnknownLocation', userInfo: user }
      : { type: 'Pets', location, pets: await getPets(location) }
  }
