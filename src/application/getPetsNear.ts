export type GetPets<Location, Pets> = (l: Location) => Promise<Pets>

export type GetLocation<UserInfo, Location> = (u: UserInfo) => Promise<Location | null>

export type AdoptablePetsNear<UserInfo, Location, Pets> =
  | { type: 'UnknownLocation', userInfo: UserInfo }
  | { type: 'Pets', location: Location, pets: Pets }

export type GetPetsNearEnv<UserInfo, Location, Pets> = {
  getLocation: GetLocation<UserInfo, Location>
  getPets: GetPets<Location, Pets>
}

export const getPetsNear = <UserInfo, Location, Pets>({ getLocation, getPets }: GetPetsNearEnv<UserInfo, Location, Pets>) =>
  async (userInfo: UserInfo): Promise<AdoptablePetsNear<UserInfo, Location, Pets>> => {
    const location = await getLocation(userInfo)
    return location === null
      ? { type: 'UnknownLocation', userInfo }
      : { type: 'Pets', location, pets: await getPets(location) }
  }
