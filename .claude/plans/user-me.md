# Feature: Login returns user id + primary address; GET /users/me (profile of caller on browser refresh)

Profile object (login `user` and GET /users/me body, one shared response class):
`{ id, loginType, username, role, bussinessType, bussinessLicense, avatar, bio, createdAt, updatedAt,
   address: { province, ward, houseNumber, lat, long } | null }`   (address = primary address, for the map marker)

Flow A: `POST /auth/login` → LoginUser (after password + status ok: addresses.findPrimaryByUserId(user.id))
  → 200 `{ accessToken, refreshToken, user: <profile> }`

Flow B: `GET /users/me` + `Authorization: Bearer <accessToken>` (user module)
  → AccessTokenGuard (401) → user.GetMyProfile({ userId })
  (findById: none → 404 USER_NOT_FOUND; no status check; findPrimaryByUserId)
  → 200 <profile>

No migration, no event, no new module. IAddressRepository.findPrimaryByUserId already exists.

- [x] 1. [use-case]   user: LoginUser output adds `user.id` + `user.address` (inject IAddressRepository)
- [x] 2. [http]       POST /auth/login response adds `user.id` + `user.address` (e2e updated)
- [ ] 3. [use-case]   user: GetMyProfile (IUserRepository.findById, IAddressRepository.findPrimaryByUserId; USER_NOT_FOUND existing)
- [ ] 4. [http]       GET /users/me (guarded) → 200 profile, shared response class with login `user`
- [ ] 5. [api-docs]   GET /users/me (auth: true, 404 USER_NOT_FOUND)
- [ ] 6. [boundary-review]

## Decisions (approved)
1. GET /users/me: user not ACTIVE but token still valid → 200 (no status check).
2. Login `user` and GET /users/me include primary address (map marker); null if the user has none.
