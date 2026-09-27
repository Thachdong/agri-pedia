# Feature: Update profile of the caller (FARMER | DISTRIBUTOR, logged in)

Source: specs/api.md action 9 (update user); entities Media.

Flow: `PATCH /users/me { username?, bio?, bussinessType?, avatar?: { key, type, extension, filename }, bussinessLicense?: { key, type, extension, filename } }` + `Authorization: Bearer <accessToken>` (user module)
  → AccessTokenGuard (401) → user.UpdateProfile({ userId, ... })
  (findById: none → USER_NOT_FOUND; User.updateProfile(...) applies given fields, businessType rule (see Q2);
   avatar / license given → user module generates the new mediaId, user.avatar / user.businessLicense = mediaId; save in transaction)
  → emits `user.profile.updated` { userId, avatar?: { mediaId, key, type, extension, filename }, businessLicense?: {...} } after commit
  → media module handles → media.ReplaceMedia(ownerType USER_AVATAR | USER_LICENSE, ownerId userId, file with given mediaId)
    (move tmp → `users/<userId>/<mediaId>.<ext>` + save Media row (ConfirmMedia rules: own tmp key, valid extension);
     only if the new file is confirmed: delete the other Media rows of that owner + their storage objects after commit)
  → 200 { username, avatar, bio, bussinessLicense, bussinessType, updatedAt }   (avatar / bussinessLicense = mediaId, as spec)

No migration: users.avatar / users.business_license are already uuid columns (media id); media.owner_type is varchar.

- [x] 1. [domain-model]       user: User.updateProfile(username?, bio?, businessType?, avatar?, businessLicense?) (existing BusinessType errors)
- [x] 2. [domain-model]       media: EMediaOwnerType USER_AVATAR, USER_LICENSE (folder `users`); Media.create accepts a given id
- [x] 3. [use-case]           user: UpdateProfile (IUserRepository existing)
- [x] 4. [use-case]           media: ReplaceMedia (IMediaRepository existing findAllByOwner/save/delete; IFileStorage)
- [ ] 5. [integration-event]  UpdateProfile emits `user.profile.updated`
- [ ] 6. [event-handler]      media: `user.profile.updated` → ReplaceMedia (USER_AVATAR, USER_LICENSE)
- [ ] 7. [http]               PATCH /users/me (guarded) → 200 profile body
- [ ] 8. [api-docs]           PATCH /users/me (auth: true)
- [ ] 9. [boundary-review]

## Decisions (approved)
1. avatar / license: user module generates the mediaId, stores it at once (user.avatar / user.businessLicense = mediaId); media creates the row with that id via event.
   Accepted risk: file invalid/missing in TMP → handler skips + logs, client still gets 200, user field points to a Media that does not exist; old Media kept.
2. bussinessType sent by a FARMER → 400 USER_BUSINESS_TYPE_NOT_ALLOWED; DISTRIBUTOR sending null → 400 USER_BUSINESS_TYPE_REQUIRED (existing errors).
3. Route `PATCH /users/me`, 200 with profile body. username 1–100, bio ≤ 1000 (as register); avatar.type IMAGE; license type IMAGE | FILE.
   avatar / bussinessLicense null or absent → no change (no clearing).
