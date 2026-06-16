import { skyDarkness } from './solar'

import type { SkyDarkness } from './solar'

export type VerdictLevel = 'excellent' | 'good' | 'possible' | 'unlikely' | 'none'

export interface VisibilityInput {
  /** 当前 Kp 指数，null 表示数据缺失 */
  kp: number | null
  /** 当前太阳高度角（度） */
  sunElevation: number
  /** 云量百分比 0-100，null 表示数据缺失 */
  cloudCover: number | null
  /** OVATION 模型给出的本地极光概率 0-100，null 表示数据缺失 */
  auroraProbability: number | null
}

export interface VisibilityVerdict {
  level: VerdictLevel
  title: string
  /** 影响判断的各项原因说明 */
  reasons: string[]
  darkness: SkyDarkness
}

/**
 * 赫尔辛基（磁纬约 57°）极光可见性经验规则：
 * Kp >= 6 头顶大概率可见；Kp 5 较可能；Kp 4 北方地平线可能可见；Kp <= 3 基本无望。
 * 同时要求天足够黑、云量不高。
 */
export function assessVisibility(input: VisibilityInput): VisibilityVerdict {
  const { kp, sunElevation, cloudCover, auroraProbability } = input
  const darkness = skyDarkness(sunElevation)
  const reasons: string[] = []

  // 1. 地磁活动评分
  let kpScore: VerdictLevel
  if (kp === null) {
    kpScore = 'unlikely'
    reasons.push('Kp 数据暂不可用')
  } else if (kp >= 6) {
    kpScore = 'excellent'
    reasons.push(`Kp ${kp.toFixed(1)}：地磁强烈，极光可能出现在头顶`)
  } else if (kp >= 5) {
    kpScore = 'good'
    reasons.push(`Kp ${kp.toFixed(1)}：地磁活跃，赫尔辛基可见概率较高`)
  } else if (kp >= 4) {
    kpScore = 'possible'
    reasons.push(`Kp ${kp.toFixed(1)}：北方低空地平线方向可能可见`)
  } else {
    kpScore = 'unlikely'
    reasons.push(`Kp ${kp.toFixed(1)}：地磁平静，赫尔辛基纬度基本看不到`)
  }

  if (auroraProbability !== null) {
    reasons.push(`OVATION 模型本地极光概率：${Math.round(auroraProbability)}%`)
  }

  // 2. 天色：天不够黑直接否决
  if (darkness === 'daylight' || darkness === 'civil') {
    reasons.push('现在天太亮（夏季白夜期间整夜无法观测）')
    return { level: 'none', title: '看不到 · 天太亮', reasons, darkness }
  }
  if (darkness === 'nautical') {
    reasons.push('天色尚未完全变暗，只有很强的极光才可见')
  }

  // 3. 云量：阴天直接否决
  if (cloudCover === null) {
    reasons.push('云量数据暂不可用')
  } else if (cloudCover > 80) {
    reasons.push(`云量 ${Math.round(cloudCover)}%：天空被云层覆盖`)
    return { level: 'none', title: '看不到 · 阴天多云', reasons, darkness }
  } else if (cloudCover > 50) {
    reasons.push(`云量 ${Math.round(cloudCover)}%：云较多，会影响观测`)
  } else {
    reasons.push(`云量 ${Math.round(cloudCover)}%：天空较为晴朗`)
  }

  // 4. 综合降级
  let level: VerdictLevel = kpScore
  const cloudy = cloudCover !== null && cloudCover > 50
  const dim = darkness === 'nautical'
  if (cloudy || dim) {
    level = downgrade(level)
  }

  return { level, title: TITLE[level], reasons, darkness }
}

const TITLE: Record<VerdictLevel, string> = {
  excellent: '极佳！快出门看极光',
  good: '机会不错，值得一试',
  possible: '有可能，留意北方天空',
  unlikely: '希望不大',
  none: '今晚看不到'
}

function downgrade(level: VerdictLevel): VerdictLevel {
  switch (level) {
    case 'excellent':
      return 'good'
    case 'good':
      return 'possible'
    case 'possible':
      return 'unlikely'
    default:
      return level
  }
}

/** Kp 值对应的赫尔辛基可见性等级，用于预报列表着色 */
export function kpLevelForHelsinki(kp: number): VerdictLevel {
  if (kp >= 6) return 'excellent'
  if (kp >= 5) return 'good'
  if (kp >= 4) return 'possible'
  if (kp >= 3) return 'unlikely'
  return 'none'
}

export const LEVEL_COLOR: Record<VerdictLevel, string> = {
  excellent: '#34d399',
  good: '#a3e635',
  possible: '#facc15',
  unlikely: '#fb923c',
  none: '#64748b'
}

export const LEVEL_LABEL: Record<VerdictLevel, string> = {
  excellent: '极佳',
  good: '较好',
  possible: '可能',
  unlikely: '渺茫',
  none: '无望'
}
