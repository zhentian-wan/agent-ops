const DEG = Math.PI / 180

/**
 * 计算给定时刻、给定地点的太阳高度角（单位：度）。
 * 基于 NOAA 简化算法，精度约 ±0.5°，足够判断天色明暗。
 */
export function sunElevation(date: Date, latitude: number, longitude: number): number {
  // 儒略日
  const jd = date.getTime() / 86400000 + 2440587.5
  const n = jd - 2451545.0

  // 太阳黄经与近点角
  const meanLongitude = (280.46 + 0.9856474 * n) % 360
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) * DEG
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG

  // 赤纬
  const obliquity = 23.439 * DEG
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))

  // 格林尼治恒星时 -> 当地时角
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude)
  )
  const localSiderealHours = (gmst + longitude / 15) % 24
  const hourAngle = localSiderealHours * 15 * DEG - rightAscension

  const latRad = latitude * DEG
  const sinElevation =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle)

  return Math.asin(sinElevation) / DEG
}

export type SkyDarkness = 'daylight' | 'civil' | 'nautical' | 'astronomical' | 'dark'

/** 根据太阳高度角划分天空明暗程度 */
export function skyDarkness(elevation: number): SkyDarkness {
  if (elevation > 0) return 'daylight'
  if (elevation > -6) return 'civil'
  if (elevation > -12) return 'nautical'
  if (elevation > -18) return 'astronomical'
  return 'dark'
}

export const SKY_DARKNESS_LABEL: Record<SkyDarkness, string> = {
  daylight: '白天',
  civil: '民用暮光（天还亮）',
  nautical: '航海暮光（微暗）',
  astronomical: '天文暮光（较暗）',
  dark: '完全黑夜'
}
