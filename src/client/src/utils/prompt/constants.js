/**
 * 提示词优化器常量定义
 *
 * 基于 OpenAI 官方 Sora 2 Prompting Guide
 * https://cookbook.openai.com/examples/sora/sora2_prompting_guide
 */

/**
 * 官方风格模板库
 *
 * 基于 OpenAI Cookbook 官方示例
 * https://cookbook.openai.com/examples/sora/sora2_prompting_guide
 */
export const OFFICIAL_STYLE_TEMPLATES = {
  // 文档风格
  'documentary': {
    name: '纪录片风格',
    nameEn: 'Documentary',
    description: '真实、观察式的纪录片风格',
    template: '[场景描述]。手持摄影机，自然光线，真实环境。',
    example: 'In a 90s documentary-style interview, an old Swedish man sits in a study and says, "I still remember when I was young."',
    keywords: ['documentary', 'handheld', 'natural light', 'observational'],
  },

  // 70年代电影
  '70s-film': {
    name: '70年代电影',
    nameEn: '70s Film',
    description: '复古胶片质感和温暖色调',
    template: 'Style: 1970s romantic drama, shot on 35mm film with natural flares, soft focus, and warm halation. [场景描述]。',
    example: 'At golden hour, a brick tenement rooftop transforms into a small stage where...',
    keywords: ['70s', 'film', 'warm', 'halation', 'romantic drama'],
  },

  // 动画风格
  'animation': {
    name: '手绘动画',
    nameEn: 'Animation',
    description: '温馨的2D/3D混合动画风格',
    template: 'Style: Hand-painted 2D/3D hybrid animation with soft brush textures, warm tungsten lighting, and a tactile, stop-motion feel. [场景描述]。',
    example: 'Inside a cluttered workshop, shelves overflow with gears... a small round robot sits on a wooden bench...',
    keywords: ['animation', '2D/3D hybrid', 'hand-painted', 'stop-motion'],
  },

  // IMAX 宏大场景
  'imax-epic': {
    name: 'IMAX史诗',
    nameEn: 'IMAX Epic',
    description: '宏大、壮观的IMAX级场景',
    template: 'Style: epic, IMAX-scale scene. [场景描述]。航空拍摄，广阔视角，壮观场面。',
    example: 'Sweeping aerial view of mountain range at dawn...',
    keywords: ['IMAX', 'epic', 'aerial', 'spectacular'],
  },
};

/**
 * 提示词评估维度
 *
 * 基于 OpenAI 官方指南的5个核心维度
 */
export const EVALUATION_DIMENSIONS = {
  // 1. 清晰度（Clarity） - 25%
  clarity: {
    id: 'clarity',
    name: '清晰度',
    nameEn: 'Clarity',
    weight: 25,
    description: '提示词是否包含具体的视觉元素描述',
    checks: [
      {
        id: 'specific_visuals',
        name: '具体视觉描述',
        check: (prompt) => {
          // 检查是否有具体的视觉元素（颜色、物体、材质）
          const hasColors = /(red|blue|green|yellow|black|white|gold|silver|amber|teal|cream|颜色)/i.test(prompt);
          const hasObjects = /\b(street|house|car|tree|person|cat|dog|table|chair|街道|房屋|汽车|树|人|猫|狗|桌子|椅子)\b/i.test(prompt);
          const hasMaterials = /\b(wood|metal|glass|fabric|stone|brick|wood|金属|玻璃|织物|石头|砖)\b/i.test(prompt);

          const score = (hasColors ? 8 : 0) + (hasObjects ? 9 : 0) + (hasMaterials ? 8 : 0);
          const passed = hasColors || hasObjects || hasMaterials;

          return {
            passed,
            score,
            message: passed
              ? '包含具体视觉元素'
              : '建议添加具体的颜色、物体或材质描述',
            severity: passed ? 'info' : 'warning',
          };
        },
      },
    ],
  },

  // 2. 摄影指导（Cinematography） - 20%
  cinematography: {
    id: 'cinematography',
    name: '摄影指导',
    nameEn: 'Cinematography',
    weight: 20,
    description: '是否包含镜头和摄影描述',
    checks: [
      {
        id: 'camera_direction',
        name: '摄影指导',
        check: (prompt) => {
          const cameraKeywords = [
            'wide shot', 'close-up', 'medium shot', 'aerial', 'tracking',
            '广角', '特写', '中景', '航拍', '跟拍',
            'shallow', 'depth of field', 'DOF', '浅景深',
            'handheld', 'tripod', 'dolly', 'pan', 'tilt',
            'camera shot', 'cinematography',
          ];

          const hasCamera = cameraKeywords.some((kw) =>
            prompt.toLowerCase().includes(kw.toLowerCase())
          );

          return {
            passed: hasCamera,
            score: hasCamera ? 20 : 0,
            message: hasCamera
              ? '包含摄影指导'
              : '建议添加镜头描述（如：wide shot, close-up）',
            severity: hasCamera ? 'info' : 'medium',
          };
        },
      },
    ],
  },

  // 3. 动作描述（Actions） - 25%
  actions: {
    id: 'actions',
    name: '动作描述',
    nameEn: 'Actions',
    weight: 25,
    description: '是否包含清晰的动作描述',
    checks: [
      {
        id: 'specific_motion',
        name: '具体动作',
        check: (prompt) => {
          // 检查是否有具体的、可计数的动作描述
          // Weak: "Actor walks across the room"
          // Strong: "Actor takes four steps to the window, pauses"
          const hasCountableActions =
            /\b(takes?\s+\d+\s+steps?|pedals?\s+\d+\s+times?|three steps|four steps|five steps|走了?\s+\d+\s+步|踩了?\s+\d+\s+下)\b/i.test(
              prompt
            );

          const hasActionVerbs =
            /\b(walks?|runs?|jumps?|sits?|stands?|moves?|turns?|looks?|走|跑|跳|坐|站|移动|转身|看)\b/i.test(prompt);

          const score = hasCountableActions ? 25 : hasActionVerbs ? 15 : 5;

          return {
            passed: hasActionVerbs || hasCountableActions,
            score,
            message: hasCountableActions
              ? '动作描述精确（可计数）'
              : hasActionVerbs
              ? '包含动作描述'
              : '建议添加动作描述',
            severity: hasCountableActions ? 'info' : 'medium',
          };
        },
      },
    ],
  },

  // 4. 灯光和色彩（Lighting & Palette） - 15%
  lighting: {
    id: 'lighting',
    name: '灯光和色彩',
    nameEn: 'Lighting & Palette',
    weight: 15,
    description: '是否包含灯光和色彩描述',
    checks: [
      {
        id: 'lighting_description',
        name: '灯光描述',
        check: (prompt) => {
          const lightingKeywords = [
            'natural light',
            'sunlight',
            'golden hour',
            'soft light',
            'hard light',
            '自然光',
            '阳光',
            '黄金时刻',
            '柔光',
            '硬光',
            'warm',
            'cool',
            'amber',
            'teal',
            'shadow',
            'rim light',
            'lighting',
          ];

          const hasLighting = lightingKeywords.some((kw) =>
            prompt.toLowerCase().includes(kw.toLowerCase())
          );

          return {
            passed: hasLighting,
            score: hasLighting ? 15 : 0,
            message: hasLighting
              ? '包含灯光描述'
              : '建议添加灯光说明（如：soft window light）',
            severity: hasLighting ? 'info' : 'low',
          };
        },
      },
    ],
  },

  // 5. 图生视频特定检查 - 30%
  imageReference: {
    id: 'imageReference',
    name: '参考图描述',
    nameEn: 'Image Reference',
    weight: 30,
    description: '图生视频时是否描述了参考图片内容',
    appliesTo: 'image-to-video', // 仅在图生视频模式时评估
    checks: [
      {
        id: 'describes_reference_image',
        name: '描述参考图片',
        check: (prompt, context) => {
          const { images } = context || {};

          // 如果没有参考图片，此维度不适用
          if (!images || images.length === 0) {
            return {
              passed: true,
              score: 30,
              message: '无参考图（不适用）',
              severity: 'info',
            };
          }

          // ⭐ 官方原则：提示词必须描述参考图片内容
          // 检查提示词长度（描述图片内容通常需要至少20个字符）
          const hasImageDescription = /[\u4e00-\u9fa5a-zA-Z]{20,}/.test(
            prompt.split('@')[0] || prompt
          );

          return {
            passed: hasImageDescription,
            score: hasImageDescription ? 30 : 0,
            message: hasImageDescription
              ? '已描述参考图片内容'
              : '⚠️ 图生视频必须描述参考图片！建议先描述图片中的主体、外观、环境、氛围',
            severity: 'error',
          };
        },
      },
    ],
  },
};

/**
 * 评分等级标准
 */
export const GRADE_THRESHOLDS = {
  EXCELLENT: 90, // 优秀
  GOOD: 75, // 良好
  PASS: 60, // 及格
  NEEDS_IMPROVEMENT: 0, // 需改进
};

/**
 * 评分等级映射
 */
export const GRADE_MAP = {
  EXCELLENT: {
    grade: 'A',
    label: '优秀',
    color: '#10b981', // green
    bgColor: '#d1fae5',
  },
  GOOD: {
    grade: 'B',
    label: '良好',
    color: '#f59e0b', // amber
    bgColor: '#fef3c7',
  },
  PASS: {
    grade: 'C',
    label: '及格',
    color: '#f97316', // orange
    bgColor: '#ffedd5',
  },
  NEEDS_IMPROVEMENT: {
    grade: 'D',
    label: '需改进',
    color: '#ef4444', // red
    bgColor: '#fee2e2',
  },
};

/**
 * 生成模式枚举
 */
export const GENERATION_MODES = {
  TEXT_TO_VIDEO: 'text-to-video', // 文生视频
  IMAGE_TO_VIDEO: 'image-to-video', // 图生视频
  STORYBOARD: 'storyboard', // 故事板
};

/**
 * 提示词结构模板（官方格式）
 *
 * OpenAI 官方推荐的提示词结构：
 * https://cookbook.openai.com/examples/sora/sora2_prompting_guide
 */
export const PROMPT_STRUCTURE_TEMPLATE = `[Prose scene description]
描述角色、服装、场景、天气等细节

Cinematography:
Camera shot: [framing and angle]
Mood: [overall tone]

Actions:
- [Action 1: clear beat or gesture]
- [Action 2: another distinct beat]

Dialogue:
[Short natural lines]

Background Sound:
[Ambient sound description]`;

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  // 默认风格模板
  defaultTemplate: 'documentary',

  // 是否包含 Cinematography 部分
  includeCinematography: true,

  // 默认镜头类型
  defaultCameraShot: 'medium shot, eye level',

  // 默认情绪
  defaultMood: 'cinematic',

  // 最大建议数量
  maxSuggestions: 10,

  // 自动补全时默认动作数量
  defaultActionCount: 2,
};

/**
 * 辅助函数：获取评分等级
 */
export function getGrade(score) {
  if (score >= GRADE_THRESHOLDS.EXCELLENT) return GRADE_MAP.EXCELLENT;
  if (score >= GRADE_THRESHOLDS.GOOD) return GRADE_MAP.GOOD;
  if (score >= GRADE_THRESHOLDS.PASS) return GRADE_MAP.PASS;
  return GRADE_MAP.NEEDS_IMPROVEMENT;
}

/**
 * 辅助函数：分析提示词结构
 */
export function analyzePromptStructure(prompt) {
  const structure = {
    hasProseDescription: false,
    hasCinematography: false,
    hasActions: false,
    hasDialogue: false,
    hasBackgroundSound: false,
  };

  // 检查各部分
  if (prompt.trim().length > 0) structure.hasProseDescription = true;
  if (/cinematography:/i.test(prompt)) structure.hasCinematography = true;
  if (/actions:/i.test(prompt)) structure.hasActions = true;
  if (/dialogue:/i.test(prompt)) structure.hasDialogue = true;
  if (/background sound:/i.test(prompt)) structure.hasBackgroundSound = true;

  return structure;
}

/**
 * 辅助函数：提取提示词中的角色引用
 */
export function extractCharacterReferences(prompt) {
  const regex = /@([a-zA-Z0-9_.]+)/g;
  const references = [];
  let match;

  while ((match = regex.exec(prompt)) !== null) {
    references.push(match[1]);
  }

  return references;
}
