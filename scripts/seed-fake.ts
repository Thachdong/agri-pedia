// Dev-only fake data: 50 distributors (10-30 products each) + 50 farmers around Ho Chi Minh City.
// Media rows point to storage keys that do not exist (downloads fail until real files are uploaded).
// Raw credentials go to seed-raw.json; a re-run first deletes the users listed there (and their data).
// Usage: npm run seed:fake
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { securityConfig } from '../src/config/security.config';
import { NodeCryptoService } from '../src/shared/crypto/node.crypto';
import dataSource from '../src/shared/database/data-source';

const RAW_FILE = join(__dirname, '..', 'seed-raw.json');
const DISTRIBUTOR_COUNT = 50;
const FARMER_COUNT = 50;
const MIN_PRODUCTS = 10;
const MAX_PRODUCTS = 30;

// ---------- deterministic random ----------
let seed = 20260929;
const rand = (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min: number, max: number): number =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)];
const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

// ---------- locations (approximate ward centers) ----------
type TWardAnchor = {
  province: string;
  ward: string;
  lat: number;
  long: number;
  weight: number;
};

const WARDS: TWardAnchor[] = [
  // Ho Chi Minh City (incl. former Binh Duong, Ba Ria - Vung Tau)
  ['ho_chi_minh', 'phuong_ben_thanh', 10.7725, 106.698, 2],
  ['ho_chi_minh', 'phuong_sai_gon', 10.779, 106.702, 2],
  ['ho_chi_minh', 'phuong_tan_dinh', 10.789, 106.69, 2],
  ['ho_chi_minh', 'phuong_go_vap', 10.838, 106.665, 3],
  ['ho_chi_minh', 'phuong_binh_thanh', 10.805, 106.71, 3],
  ['ho_chi_minh', 'phuong_phu_nhuan', 10.799, 106.68, 2],
  ['ho_chi_minh', 'phuong_tan_binh', 10.798, 106.653, 3],
  ['ho_chi_minh', 'phuong_tan_phu', 10.79, 106.628, 3],
  ['ho_chi_minh', 'phuong_binh_tan', 10.765, 106.603, 3],
  ['ho_chi_minh', 'phuong_an_lac', 10.725, 106.615, 3],
  ['ho_chi_minh', 'phuong_tan_hung', 10.745, 106.7, 2],
  ['ho_chi_minh', 'phuong_tan_my', 10.738, 106.72, 2],
  ['ho_chi_minh', 'phuong_thu_duc', 10.85, 106.76, 3],
  ['ho_chi_minh', 'phuong_long_binh', 10.875, 106.815, 3],
  ['ho_chi_minh', 'phuong_an_khanh', 10.787, 106.73, 2],
  ['ho_chi_minh', 'phuong_cat_lai', 10.77, 106.78, 2],
  ['ho_chi_minh', 'phuong_cho_lon', 10.753, 106.66, 2],
  ['ho_chi_minh', 'phuong_binh_tay', 10.75, 106.645, 2],
  ['ho_chi_minh', 'phuong_thoi_an', 10.875, 106.65, 3],
  ['ho_chi_minh', 'phuong_trung_my_tay', 10.855, 106.615, 3],
  ['ho_chi_minh', 'xa_cu_chi', 10.973, 106.493, 4],
  ['ho_chi_minh', 'xa_hoc_mon', 10.886, 106.592, 4],
  ['ho_chi_minh', 'xa_binh_chanh', 10.69, 106.58, 4],
  ['ho_chi_minh', 'xa_nha_be', 10.695, 106.74, 3],
  ['ho_chi_minh', 'xa_can_gio', 10.411, 106.954, 2],
  ['ho_chi_minh', 'phuong_thu_dau_mot', 10.98, 106.655, 3],
  ['ho_chi_minh', 'phuong_di_an', 10.905, 106.769, 3],
  ['ho_chi_minh', 'phuong_thuan_an', 10.93, 106.71, 3],
  ['ho_chi_minh', 'phuong_lai_thieu', 10.905, 106.701, 2],
  ['ho_chi_minh', 'phuong_ben_cat', 11.09, 106.595, 3],
  ['ho_chi_minh', 'phuong_tan_uyen', 11.065, 106.76, 3],
  ['ho_chi_minh', 'phuong_ba_ria', 10.496, 107.169, 2],
  ['ho_chi_minh', 'phuong_vung_tau', 10.346, 107.084, 2],
  ['ho_chi_minh', 'phuong_phu_my', 10.59, 107.05, 2],
  // Dong Nai
  ['dong_nai', 'phuong_bien_hoa', 10.945, 106.824, 3],
  ['dong_nai', 'phuong_tran_bien', 10.95, 106.84, 2],
  ['dong_nai', 'xa_trang_bom', 10.953, 107.0, 3],
  ['dong_nai', 'xa_long_thanh', 10.78, 106.95, 3],
  ['dong_nai', 'xa_nhon_trach', 10.71, 106.89, 3],
  ['dong_nai', 'phuong_long_khanh', 10.935, 107.24, 2],
  ['dong_nai', 'xa_dau_giay', 10.94, 107.14, 2],
  // Tay Ninh (incl. former Long An)
  ['tay_ninh', 'phuong_tan_an', 10.536, 106.413, 2],
  ['tay_ninh', 'xa_ben_luc', 10.64, 106.49, 3],
  ['tay_ninh', 'xa_duc_hoa', 10.88, 106.4, 3],
  ['tay_ninh', 'xa_can_giuoc', 10.61, 106.67, 3],
  ['tay_ninh', 'xa_can_duoc', 10.51, 106.61, 2],
  ['tay_ninh', 'phuong_trang_bang', 11.03, 106.36, 2],
  ['tay_ninh', 'phuong_tan_ninh', 11.31, 106.1, 1],
].map(([province, ward, lat, long, weight]) => ({
  province,
  ward,
  lat,
  long,
  weight,
})) as TWardAnchor[];

const TOTAL_WEIGHT = WARDS.reduce((sum, w) => sum + w.weight, 0);
const pickWard = (): TWardAnchor => {
  let r = rand() * TOTAL_WEIGHT;
  for (const ward of WARDS) {
    r -= ward.weight;
    if (r < 0) return ward;
  }
  return WARDS[WARDS.length - 1];
};
/** ~±800 m around the ward anchor. */
const jitter = (value: number): number =>
  Math.round((value + (rand() - 0.5) * 0.016) * 1e6) / 1e6;

const STREETS = [
  'Nguyễn Văn Linh',
  'Lê Văn Việt',
  'Quốc lộ 1A',
  'Quốc lộ 22',
  'Tỉnh lộ 10',
  'Nguyễn Thị Minh Khai',
  'Lê Lợi',
  'Trần Hưng Đạo',
  'Phạm Văn Đồng',
  'Võ Văn Kiệt',
  'Nguyễn Ảnh Thủ',
  'Hương lộ 2',
  'Đường số 7',
  'Đường số 12',
  'Lê Trọng Tấn',
  'Tô Ký',
  'Nguyễn Văn Quá',
  'Huỳnh Tấn Phát',
  'Đại lộ Bình Dương',
  'Quốc lộ 51',
];
const houseNumber = (): string =>
  rand() < 0.3
    ? `Ấp ${int(1, 9)}, ${pick(STREETS)}`
    : `${int(1, 999)}${rand() < 0.2 ? `/${int(1, 60)}` : ''} ${pick(STREETS)}`;

// ---------- people ----------
const LAST = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Huỳnh',
  'Hoàng',
  'Võ',
  'Phan',
  'Trương',
  'Bùi',
  'Đặng',
  'Đỗ',
  'Ngô',
  'Dương',
  'Lý',
];
const MIDDLE = [
  'Văn',
  'Thị',
  'Minh',
  'Hữu',
  'Thanh',
  'Ngọc',
  'Quốc',
  'Đức',
  'Thị Kim',
  'Hoàng',
];
const FIRST = [
  'An',
  'Bình',
  'Cường',
  'Dũng',
  'Hà',
  'Hải',
  'Hòa',
  'Hùng',
  'Khoa',
  'Lan',
  'Long',
  'Mai',
  'Nam',
  'Phúc',
  'Quang',
  'Sơn',
  'Tâm',
  'Thảo',
  'Trang',
  'Trung',
  'Tuấn',
  'Vy',
  'Yến',
  'Lộc',
  'Tài',
];
const personName = (): string => `${pick(LAST)} ${pick(MIDDLE)} ${pick(FIRST)}`;

const SHOP_SUFFIX = [
  'Phát',
  'Thịnh',
  'Lợi',
  'Hưng',
  'Thành',
  'Nông',
  'Xanh',
  'Việt',
  'Phú',
  'An',
];
const SHOP_PREFIX: Record<string, string[]> = {
  AGRICULTURAL_CHEMICAL_SUPPLIES: [
    'Đại lý VTNN',
    'Cửa hàng Vật tư Nông nghiệp',
    'Đại lý Thuốc BVTV',
    'Đại lý Phân bón',
  ],
  SEEDS_SEEDLINGS: [
    'Vườn ươm',
    'Cửa hàng Giống cây trồng',
    'Trại giống cây',
    'Nhà vườn',
  ],
  AQUACULTURE_SEEDLINGS: [
    'Trại giống Thủy sản',
    'Trại tôm giống',
    'Trại cá giống',
    'Cơ sở Giống thủy sản',
  ],
};
const BIO: Record<string, string[]> = {
  AGRICULTURAL_CHEMICAL_SUPPLIES: [
    'Chuyên phân bón, thuốc bảo vệ thực vật chính hãng. Tư vấn kỹ thuật miễn phí cho bà con.',
    'Hơn 10 năm cung cấp vật tư nông nghiệp. Giao hàng tận vườn trong bán kính 20km.',
  ],
  SEEDS_SEEDLINGS: [
    'Cây giống chuẩn, sạch bệnh, bảo hành tỷ lệ sống. Nhận đặt số lượng lớn.',
    'Chuyên giống cây ăn trái, rau màu. Hỗ trợ kỹ thuật trồng và chăm sóc.',
  ],
  AQUACULTURE_SEEDLINGS: [
    'Giống thủy sản khỏe, sạch bệnh, có kiểm dịch. Giao hàng bằng xe chuyên dụng.',
    'Cung cấp tôm, cá giống chất lượng cao cho ao nuôi khu vực Đông Nam Bộ.',
  ],
};
const FARMER_BIO = [
  'Trồng rau màu 2ha.',
  'Nuôi tôm thẻ chân trắng.',
  'Vườn sầu riêng, bưởi.',
  'Trồng lúa và rau ăn lá.',
  'Nuôi cá tra, cá rô phi.',
  null,
];

// ---------- products ----------
type TProductTemplate = {
  name: string;
  unit: string;
  min: number;
  max: number;
};
const tpl = (
  name: string,
  unit: string,
  min: number,
  max: number,
): TProductTemplate => ({ name, unit, min, max });

const CATALOG: Record<
  string,
  { category: string; items: TProductTemplate[]; desc: string[] }
> = {
  AGRICULTURAL_CHEMICAL_SUPPLIES: {
    category: 'Thuốc & vật tư nông nghiệp',
    desc: [
      'Hàng chính hãng, còn hạn sử dụng dài. Đọc kỹ hướng dẫn trước khi dùng.',
      'Phù hợp cho lúa, rau màu và cây ăn trái. Liên hệ để được tư vấn liều lượng.',
      'Giá sỉ cho đơn hàng số lượng lớn. Giao hàng tận nơi.',
    ],
    items: [
      tpl('Phân Urê Phú Mỹ', '50kg', 550000, 750000),
      tpl('Phân DAP Đình Vũ', '50kg', 800000, 1050000),
      tpl('Phân NPK 16-16-8 Bình Điền', '50kg', 650000, 850000),
      tpl('Phân NPK 20-20-15 Baconco', '50kg', 750000, 950000),
      tpl('Phân Kali Canada', '50kg', 500000, 700000),
      tpl('Phân hữu cơ vi sinh Sông Gianh', '50kg', 180000, 260000),
      tpl('Phân bón lá Growmore 30-10-10', 'piece', 45000, 90000),
      tpl('Phân trùn quế', '10kg', 60000, 110000),
      tpl('Vôi bột nông nghiệp', '50kg', 90000, 150000),
      tpl('Thuốc trừ sâu Regent 800WG', 'piece', 15000, 35000),
      tpl('Thuốc trừ sâu Actara 25WG', 'piece', 20000, 40000),
      tpl('Thuốc trừ bệnh Anvil 5SC', 'piece', 60000, 120000),
      tpl('Thuốc trừ bệnh Tilt Super 300EC', 'piece', 80000, 150000),
      tpl('Thuốc trừ cỏ Sofit 300EC', 'piece', 90000, 160000),
      tpl('Thuốc trừ ốc Bolis 6GB', 'kg', 40000, 80000),
      tpl('Chế phẩm Trichoderma', 'kg', 50000, 90000),
      tpl('Màng phủ nông nghiệp 1m2', 'kg', 45000, 70000),
      tpl('Bình xịt điện 16 lít', 'piece', 550000, 950000),
      tpl('Lưới che nắng 70%', 'kg', 35000, 60000),
      tpl('Ống tưới nhỏ giọt 16mm', 'piece', 250000, 450000),
      tpl('Đất sạch trồng cây Tribat', 'bag', 30000, 60000),
      tpl('Xơ dừa đã xử lý', 'bag', 40000, 80000),
      tpl('Chế phẩm EM gốc', 'piece', 30000, 60000),
      tpl('Phân dơi Hòa Bình', '10kg', 120000, 200000),
      tpl('Thuốc dưỡng hoa Atonik', 'piece', 10000, 25000),
    ],
  },
  SEEDS_SEEDLINGS: {
    category: 'Giống cây trồng',
    desc: [
      'Cây giống khỏe, sạch bệnh, bầu đất chắc. Bảo hành tỷ lệ sống 95%.',
      'Giống năng suất cao, thích nghi tốt khí hậu Nam Bộ.',
      'Nhận đặt số lượng lớn, hỗ trợ vận chuyển và hướng dẫn kỹ thuật.',
    ],
    items: [
      tpl('Cây giống sầu riêng Ri6 ghép', 'piece', 35000, 70000),
      tpl('Cây giống sầu riêng Monthong', 'piece', 45000, 90000),
      tpl('Cây giống bưởi da xanh', 'piece', 25000, 50000),
      tpl('Cây giống xoài cát Hòa Lộc', 'piece', 25000, 55000),
      tpl('Cây giống mít Thái siêu sớm', 'piece', 15000, 35000),
      tpl('Cây giống chôm chôm Thái', 'piece', 25000, 50000),
      tpl('Cây giống sapoche Mexico', 'piece', 20000, 45000),
      tpl('Cây giống cam sành', 'piece', 20000, 40000),
      tpl('Cây giống chanh không hạt', 'piece', 15000, 30000),
      tpl('Cây giống thanh long ruột đỏ', 'piece', 8000, 15000),
      tpl('Cây giống dừa xiêm lùn', 'piece', 60000, 120000),
      tpl('Cây giống cà phê Robusta TR4', 'piece', 5000, 12000),
      tpl('Cây giống tiêu Vĩnh Linh', 'piece', 8000, 15000),
      tpl('Cây giống bơ 034', 'piece', 35000, 70000),
      tpl('Hạt giống lúa ST25', 'kg', 25000, 45000),
      tpl('Hạt giống lúa OM18', 'kg', 18000, 30000),
      tpl('Hạt giống bắp nếp lai', 'kg', 180000, 300000),
      tpl('Hạt giống dưa leo F1', 'piece', 20000, 45000),
      tpl('Hạt giống cà chua F1', 'piece', 25000, 55000),
      tpl('Hạt giống ớt chỉ thiên', 'piece', 20000, 45000),
      tpl('Hạt giống rau muống', 'kg', 60000, 110000),
      tpl('Hạt giống cải ngọt', 'piece', 10000, 25000),
      tpl('Hạt giống khổ qua F1', 'piece', 20000, 40000),
      tpl('Cây giống chuối cấy mô', 'piece', 6000, 12000),
      tpl('Cây giống mai vàng ghép', 'piece', 50000, 150000),
    ],
  },
  AQUACULTURE_SEEDLINGS: {
    category: 'Giống thủy sản',
    desc: [
      'Con giống khỏe, đồng đều, đã kiểm dịch. Tư vấn mật độ thả nuôi.',
      'Sạch bệnh, tỷ lệ sống cao. Đóng bao oxy, giao tận ao.',
      'Nguồn bố mẹ nhập khẩu, tăng trưởng nhanh.',
    ],
    items: [
      tpl('Tôm thẻ chân trắng giống PL12 (1.000 con)', 'piece', 90000, 160000),
      tpl('Tôm sú giống PL15 (1.000 con)', 'piece', 100000, 180000),
      tpl('Tôm càng xanh giống (1.000 con)', 'piece', 250000, 400000),
      tpl('Cá tra giống', 'kg', 25000, 45000),
      tpl('Cá rô phi đơn tính giống', 'kg', 60000, 100000),
      tpl('Cá điêu hồng giống', 'kg', 70000, 110000),
      tpl('Cá lóc đầu nhím giống', 'kg', 90000, 150000),
      tpl('Cá chép lai giống', 'kg', 60000, 100000),
      tpl('Cá trê vàng giống', 'kg', 70000, 120000),
      tpl('Cá rô đầu vuông giống', 'kg', 80000, 130000),
      tpl('Cá thát lát cườm giống', 'kg', 150000, 250000),
      tpl('Cá chạch lấu giống', 'kg', 200000, 350000),
      tpl('Cá kèo giống', 'kg', 120000, 200000),
      tpl('Cua biển giống', 'piece', 2000, 5000),
      tpl('Ếch Thái Lan giống', 'kg', 80000, 140000),
      tpl('Lươn không bùn giống', 'kg', 180000, 300000),
      tpl('Ốc bươu đen giống', 'kg', 60000, 100000),
      tpl('Cá mè vinh giống', 'kg', 50000, 90000),
      tpl('Cá sặc rằn giống', 'kg', 60000, 100000),
      tpl('Thức ăn tôm giống số 0', 'kg', 60000, 110000),
      tpl('Men vi sinh xử lý ao nuôi', 'kg', 150000, 300000),
      tpl('Vôi CaCO3 xử lý ao', '50kg', 80000, 140000),
      tpl('Khoáng tạt ao nuôi tôm', '10kg', 150000, 280000),
    ],
  },
};
const BUSINESS_TYPES = Object.keys(CATALOG);
const roundPrice = (value: number): number => Math.round(value / 1000) * 1000;

// ---------- types ----------
type TRawUser = {
  id: string;
  role: 'DISTRIBUTOR' | 'FARMER';
  businessType: string | null;
  username: string;
  loginType: 'EMAIL' | 'PHONE';
  email: string | null;
  phone: string | null;
  password: string;
  address: {
    province: string;
    ward: string;
    houseNumber: string;
    lat: number;
    long: number;
  };
  productCount: number;
};

const main = async (): Promise<void> => {
  const crypto = new NodeCryptoService({
    get: () => securityConfig(),
  } as never);
  await dataSource.initialize();

  const categoryRows: { id: string; name: string }[] = await dataSource.query(
    `SELECT id, name FROM categories`,
  );
  const categoryId = (name: string): string => {
    const row = categoryRows.find((c) => c.name === name);
    if (!row)
      throw new Error(`Category not found: ${name} (run migrations first)`);
    return row.id;
  };

  const users: TRawUser[] = [];
  const makeUser = (role: TRawUser['role'], index: number): TRawUser => {
    const isDistributor = role === 'DISTRIBUTOR';
    const businessType = isDistributor
      ? BUSINESS_TYPES[index % BUSINESS_TYPES.length]
      : null;
    const loginType = index % 2 === 0 ? 'EMAIL' : 'PHONE';
    const slug = isDistributor ? 'distributor' : 'farmer';
    const ward = pickWard();
    return {
      id: randomUUID(),
      role,
      businessType,
      username: isDistributor
        ? `${pick(SHOP_PREFIX[businessType])} ${pick(LAST)} ${pick(SHOP_SUFFIX)}`
        : personName(),
      loginType,
      email:
        loginType === 'EMAIL'
          ? `seed.${slug}${pad(index + 1)}@agripedia.test`
          : null,
      // 09x prefix + role digit + index keeps phones unique across roles.
      phone:
        loginType === 'PHONE'
          ? `09${isDistributor ? 1 : 2}${pad(int(0, 99))}${pad(index + 1, 5)}`
          : null,
      password: `Agri@${pad(int(0, 9999), 4)}`,
      address: {
        province: ward.province,
        ward: ward.ward,
        houseNumber: houseNumber(),
        lat: jitter(ward.lat),
        long: jitter(ward.long),
      },
      productCount: isDistributor ? int(MIN_PRODUCTS, MAX_PRODUCTS) : 0,
    };
  };
  for (let i = 0; i < DISTRIBUTOR_COUNT; i++)
    users.push(makeUser('DISTRIBUTOR', i));
  for (let i = 0; i < FARMER_COUNT; i++) users.push(makeUser('FARMER', i));

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  await dataSource.transaction(async (manager) => {
    // Remove the previous seed run.
    if (existsSync(RAW_FILE)) {
      const content = readFileSync(RAW_FILE, 'utf8').trim();
      const previousIds: string[] = content
        ? (JSON.parse(content).users ?? []).map((u: TRawUser) => u.id)
        : [];
      if (previousIds.length) {
        const productIds: string[] = (
          await manager.query(
            `SELECT id FROM products WHERE user_id = ANY($1::uuid[])`,
            [previousIds],
          )
        ).map((r: { id: string }) => r.id);
        await manager.query(
          `DELETE FROM media WHERE owner_id = ANY($1::uuid[])`,
          [[...previousIds, ...productIds]],
        );
        await manager.query(
          `DELETE FROM products WHERE user_id = ANY($1::uuid[])`,
          [previousIds],
        );
        await manager.query(
          `DELETE FROM addresses WHERE user_id = ANY($1::uuid[])`,
          [previousIds],
        );
        await manager.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [
          previousIds,
        ]);
        console.log(
          `Removed previous seed: ${previousIds.length} users, ${productIds.length} products`,
        );
      }
    }

    let productTotal = 0;
    let mediaTotal = 0;
    for (const user of users) {
      const identifier = user.email ?? user.phone;
      const createdAt = new Date(now - int(30, 365) * DAY);
      const avatarId = randomUUID();
      await manager.query(
        `INSERT INTO users (id, login_type, hashed_identifier, encrypted_identifier, password_hash, username, role, business_type, status, identifier_verified_at, avatar, bio, business_license, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE',$9,$10,$11,NULL,$9,$9)`,
        [
          user.id,
          user.loginType,
          crypto.hash(identifier),
          crypto.encrypt(identifier),
          await crypto.hashPassword(user.password),
          user.username,
          user.role,
          user.businessType,
          createdAt,
          avatarId,
          user.businessType ? pick(BIO[user.businessType]) : pick(FARMER_BIO),
        ],
      );
      await manager.query(
        `INSERT INTO media (id, type, extension, filename, source, owner_type, owner_id, sort_order)
         VALUES ($1,'IMAGE','jpg','avatar.jpg',$2,'USER_AVATAR',$3,NULL)`,
        [avatarId, `users/${user.id}/${avatarId}.jpg`, user.id],
      );
      mediaTotal++;
      await manager.query(
        `INSERT INTO addresses (id, user_id, province, ward, house_number, lat, long, is_primary)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [
          randomUUID(),
          user.id,
          user.address.province,
          user.address.ward,
          user.address.houseNumber,
          user.address.lat,
          user.address.long,
        ],
      );

      if (!user.businessType) continue;
      const catalog = CATALOG[user.businessType];
      const items = [...catalog.items].sort(() => rand() - 0.5);
      for (let i = 0; i < user.productCount; i++) {
        const item = items[i % items.length];
        const productId = randomUUID();
        const roll = rand();
        const status =
          roll < 0.85 ? 'ACTIVE' : roll < 0.93 ? 'OUT_OF_STOCK' : 'INACTIVE';
        await manager.query(
          `INSERT INTO products (id, user_id, name, description, price, quantity, unit, category_id, status, created_at, deleted_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL)`,
          [
            productId,
            user.id,
            i < items.length
              ? item.name
              : `${item.name} (loại ${Math.floor(i / items.length) + 1})`,
            pick(catalog.desc),
            roundPrice(item.min + rand() * (item.max - item.min)),
            status === 'OUT_OF_STOCK' ? 0 : int(5, 500),
            item.unit,
            categoryId(catalog.category),
            status,
            new Date(
              createdAt.getTime() + rand() * (now - createdAt.getTime()),
            ),
          ],
        );
        productTotal++;
        const imageCount = int(1, 3);
        for (let order = 0; order < imageCount; order++) {
          const mediaId = randomUUID();
          await manager.query(
            `INSERT INTO media (id, type, extension, filename, source, owner_type, owner_id, sort_order)
             VALUES ($1,'IMAGE','jpg',$2,$3,'PRODUCT',$4,$5)`,
            [
              mediaId,
              `product-${order + 1}.jpg`,
              `products/${productId}/${mediaId}.jpg`,
              productId,
              order,
            ],
          );
          mediaTotal++;
        }
      }
    }
    console.log(
      `Inserted ${users.length} users, ${productTotal} products, ${mediaTotal} media`,
    );
  });

  writeFileSync(
    RAW_FILE,
    `${JSON.stringify({ generatedAt: new Date(now).toISOString(), users }, null, 2)}\n`,
  );
  console.log(`Raw credentials written to ${RAW_FILE}`);
  await dataSource.destroy();
};

main().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
