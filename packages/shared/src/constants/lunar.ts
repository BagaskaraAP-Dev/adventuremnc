/** Percepatan gravitasi permukaan Bulan (m/s²). Bumi: 9.807 */
export const LUNAR_GRAVITY = 1.625;

/** Radius rata-rata Bulan (m) */
export const LUNAR_RADIUS = 1_737_400;

/** Jarak cakrawala (m) untuk tinggi mata h (m): sqrt(2 * R * h) */
export const horizonDistance = (eyeHeight: number) =>
  Math.sqrt(2 * LUNAR_RADIUS * eyeHeight);
// h = 1.7 m  ->  ~2430 m

/** Albedo bond regolith. Segelap aspal lapuk. */
export const REGOLITH_ALBEDO = 0.12;

/** Densitas regolith permukaan (kg/m³) */
export const REGOLITH_DENSITY = 1_500;

/** Sudut istirahat regolith (derajat) — batas kemiringan stabil */
export const REGOLITH_ANGLE_OF_REPOSE = 37;

/** Irradiansi matahari di orbit Bulan (W/m²) */
export const SOLAR_CONSTANT = 1361;

/** Suhu permukaan (K): siang khatulistiwa, malam, kawah gelap permanen */
export const SURFACE_TEMP_DAY = 390;
export const SURFACE_TEMP_NIGHT = 100;
export const SURFACE_TEMP_PSR = 40;

/** Panjang hari sinodis Bulan (detik) — 29.53 hari Bumi */
export const LUNAR_DAY_SECONDS = 2_551_443;

/** Faktor kompresi siklus siang-malam untuk gameplay.
 *  Keputusan sadar: 1 hari Bulan = 90 menit real-time.
 *  Lihat docs/DECISIONS.md#day-night-compression */
export const DAY_CYCLE_COMPRESSION = LUNAR_DAY_SECONDS / (90 * 60);

/** Diameter sudut Bumi dilihat dari Bulan (derajat) */
export const EARTH_ANGULAR_DIAMETER_DEG = 1.9;

/** Fixed timestep simulasi (detik) */
export const FIXED_DT = 1 / 60;
