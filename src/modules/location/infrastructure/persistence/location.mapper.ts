import { Province, Ward } from '../../domain';
import { ProvinceOrmEntity } from './province.orm-entity';
import { WardOrmEntity } from './ward.orm-entity';

/** Read-only master data: rows → domain only. */
export class LocationMapper {
  static provinceToDomain(row: ProvinceOrmEntity): Province {
    return Province.restore({ codename: row.codename, name: row.name });
  }

  static wardToDomain(row: WardOrmEntity): Ward {
    return Ward.restore({
      codename: row.codename,
      name: row.name,
      provinceCodename: row.provinceCodename,
    });
  }
}
