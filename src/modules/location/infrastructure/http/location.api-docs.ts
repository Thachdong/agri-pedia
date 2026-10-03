import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { LocationController } from './location.controller';

defineApiDocs(LocationController, {
  tag: 'Location',
  operations: {
    listAll: {
      summary: 'List all provinces',
      description:
        'Public (no login). Every province in master data order, not paginated. ' +
        'Use `codename` as `provinceCode` for GET /provinces/{provinceCode}/wards.',
    },
    listWards: {
      summary: 'List the wards of a province',
      description:
        'Public (no login). Every ward of the province in master data order, not paginated. ' +
        '`provinceCode` = a province `codename` (lowercase letters, digits, `_`; max 64). ' +
        'Ward `codename` is unique within its province only.',
      validation: true,
      errors: [
        {
          type: EDomainErrorType.NOT_FOUND,
          code: 'LOCATION_PROVINCE_NOT_FOUND',
        },
      ],
    },
  },
});
