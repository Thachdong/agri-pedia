import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { DistributorController } from './distributor.controller';

defineApiDocs(DistributorController, {
  tag: 'Distributors',
  operations: {
    findNearby: {
      summary: 'List distributors near a location (public)',
      description:
        'No login needed; the access token is optional (an invalid one → 401). ' +
        'Location, first match wins: `lat` + `long` (GPS or a point picked on the map); ' +
        '`provinceCode` [+ `wardCode`] (codenames from GET /provinces and GET /provinces/{provinceCode}/wards); ' +
        "none: the caller's primary address (guest, or no address: every distributor by username). " +
        'A point and an area cannot be combined. ' +
        'Stages run in order and the first one with any distributor is paginated — ' +
        'point: `radius` (within DISTRIBUTOR_SEARCH_RADIUS_KM, default 30 km) → `nationwide_by_distance`, nearest first; ' +
        'area: `province` (the given ward first, then by username) → `nationwide`, by username. ' +
        '`scope` names the stage, `source` where the location came from. ' +
        '`distanceMeters` is set for the distance scopes only. ' +
        'Only ACTIVE distributors are listed, at their primary address. No match at all: 200 with empty `items`.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'USER_INVALID_COORDINATES' },
        { type: EDomainErrorType.VALIDATION, code: 'USER_LOCATION_INVALID' },
      ],
    },
    getProfile: {
      summary: 'Get the public profile of a distributor (public)',
      description:
        'No login needed. Returns the distributor with every address (primary first). ' +
        '`avatar` is a media id. Unknown id, not a DISTRIBUTOR, or not ACTIVE → 404 USER_DISTRIBUTOR_NOT_FOUND.',
      validation: true,
      errors: [
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'USER_DISTRIBUTOR_NOT_FOUND',
        },
      ],
    },
  },
});
