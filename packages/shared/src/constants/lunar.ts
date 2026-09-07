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

/** Kecepatan lepas kaki lompat vertikal astronot EVA (m/s) */
export const EVA_JUMP_VELOCITY = 3.6;

/** Kecepatan jalan loping dasar astronot EVA (m/s) (~8.6 km/h) */
export const EVA_WALK_SPEED = 2.4;

/** Kecepatan lari / sprint loping beruntun (m/s) (~18.7 km/h) */
export const EVA_SPRINT_SPEED = 5.2;

/** Akselerasi traksi di permukaan regolith (m/s²) — traksi rendah */
export const EVA_TRACTION_ACCEL = 4.5;

/** Deselerasi inersia saat meluncur di regolith (m/s²) */
export const EVA_DECEL = 3.2;

/** Ambang batas kecepatan benturan aman sebelum terkena fall damage (m/s) */
export const EVA_SAFE_IMPACT_VELOCITY = 8.5;

/** Koefisien damage per (m/s)² di atas ambang batas aman */
export const EVA_FALL_DAMAGE_COEFF = 2.5;

/** Air control factor di ruang hampa (tanpa gaya dorong luar) */
export const EVA_AIR_CONTROL = 0.0;

/** Massa kering lunar mining rover (kg) */
export const ROVER_MASS = 650;

/** Kecepatan maksimum nominal rover (m/s) (~30.6 km/h) */
export const ROVER_MAX_SPEED = 8.5;

/** Akselerasi motor traksi rendah di regolith (m/s²) */
export const ROVER_MOTOR_ACCEL = 3.2;

/** Deselerasi pengereman traksi rendah di regolith (m/s²) */
export const ROVER_BRAKE_DECEL = 2.8;

/** Radius interaksi masuk/keluar kendaraan (m) */
export const ROVER_INTERACT_RADIUS = 3.2;

/** Wheelbase rover (jarak sumbu roda depan ke belakang) (m) */
export const ROVER_WHEELBASE = 2.4;

/** Track width rover (jarak antar roda kiri dan kanan) (m) */
export const ROVER_TRACK_WIDTH = 1.8;

/** Sudut belok kemudi maksimum roda depan (radian) (~30 derajat) */
export const ROVER_MAX_STEER_RAD = 0.52;

/** Kapasitas oksigen nominal suit (persen) */
export const SUIT_O2_MAX = 100.0;

/** Laju konsumsi O2 dasar saat EVA (% / detik) */
export const SUIT_O2_BASE_CONSUMPTION = 0.28;

/** Multiplier konsumsi O2 saat sprint loping */
export const SUIT_O2_SPRINT_MULTIPLIER = 2.2;

/** Suhu nominal nyaman internal suit (°C) */
export const SUIT_TEMP_NOMINAL = 21.0;

/** Batas suhu dingin sebelum menderita hypothermia (°C) */
export const SUIT_TEMP_FREEZE_THRESHOLD = 5.0;

/** Batas suhu panas sebelum menderita hyperthermia (°C) */
export const SUIT_TEMP_OVERHEAT_THRESHOLD = 45.0;

/** Laju pendinginan di dalam bayangan dingin (°C / detik) */
export const SUIT_COOLING_RATE_SHADOW = 0.65;

/** Laju pemanasan di bawah sinar matahari langsung (°C / detik) */
export const SUIT_HEATING_RATE_SUN = 0.55;

/** Laju regulasi HVAC baterai suit internal (°C / detik) */
export const SUIT_HVAC_REGULATION_RATE = 0.35;

/** Radius interaksi airlock habitat pangkalan (m) */
export const HABITAT_AIRLOCK_RADIUS = 4.8;

