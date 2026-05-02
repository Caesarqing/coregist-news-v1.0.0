// 用户名验证工具
let naughtyWords;
try {
  naughtyWords = require('naughty-words');
} catch (err) {
  console.warn('⚠️ naughty-words 库未安装，将跳过脏话检查');
  naughtyWords = null;
}

// 加载白名单和黑名单
let whitelist = [];
let blacklist = [];
try {
  const whitelistData = require('./usernameWhitelist.json');
  whitelist = whitelistData.whitelist || [];
  console.log(`✅ 已加载白名单: ${whitelist.length} 个例外词汇`);
} catch (err) {
  console.warn('⚠️ 无法加载白名单文件，使用空白名单');
}

try {
  const blacklistData = require('./usernameBlacklist.json');
  blacklist = blacklistData.blacklist || [];
  console.log(`✅ 已加载黑名单: ${blacklist.length} 个敏感词汇`);
} catch (err) {
  console.warn('⚠️ 无法加载黑名单文件，使用默认黑名单');
  // 默认黑名单
  blacklist = [
    'admin', 'administrator', 'root', 'system', 'support',
    'trump', 'obama', 'biden', 'putin', 'xi'
  ];
}

// Leet Speak 映射表（将数字/符号映射回字母）
const LEET_MAP = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '(': 'c',
  '[': 'c',
  '|': 'i',
  '&': 'a'
};

// 获取所有语言的脏话列表（合并为一个集合以提高检查效率）
const getAllBadWords = () => {
  if (!naughtyWords) return new Set();
  
  const allBadWords = new Set();
  // 动态获取所有可用语言（naughty-words 库支持多种语言）
  const availableLanguages = Object.keys(naughtyWords);
  
  availableLanguages.forEach(lang => {
    const words = naughtyWords[lang];
    if (Array.isArray(words)) {
      words.forEach(word => {
        if (word && typeof word === 'string' && word.trim()) {
          allBadWords.add(word.toLowerCase().trim());
        }
      });
    }
  });
  
  console.log(`✅ 已加载 ${allBadWords.size} 个脏话词汇，覆盖 ${availableLanguages.length} 种语言`);
  return allBadWords;
};

// 预先构建脏话集合（避免每次验证都重新构建）
const BAD_WORDS_SET = getAllBadWords();

// 计算字符串相似度（简单的编辑距离算法）
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Levenshtein 距离算法（编辑距离）
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 删除
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * 标准化用户名
 * 1. 转小写
 * 2. 去除所有非字母数字字符（下划线除外）
 * 3. 还原 Leet Speak（如 Tr0mp -> tromp）
 */
function normalizeUsername(username) {
  if (!username) return '';
  
  let normalized = username.toLowerCase();
  
  // 还原 Leet Speak
  for (const [leet, letter] of Object.entries(LEET_MAP)) {
    // 使用 split/join 避免正则特殊字符导致 RegExp 构造失败（如 "("）
    normalized = normalized.split(leet).join(letter);
  }
  
  // 去除所有非字母数字字符（包括下划线、连字符等）
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  
  return normalized;
}

/**
 * 验证用户名
 * @param {string} username - 要验证的用户名
 * @returns {object} { valid: boolean, reason?: string }
 */
function validateUsername(username) {
  try {
    if (!username || typeof username !== 'string') {
      return { valid: false, reason: 'USERNAME_EMPTY' };
    }

    const original = username.trim();
    const trimmed = original.toLowerCase();
    
    // 标准化处理（去除特殊字符，还原 Leet Speak）
    let normalized;
    try {
      normalized = normalizeUsername(original);
    } catch (err) {
      console.error('标准化用户名时出错:', err);
      normalized = trimmed; // 如果标准化失败，使用小写版本
    }

    // 长度检查
    if (normalized.length < 3) {
      return { valid: false, reason: 'USERNAME_TOO_SHORT' };
    }
    if (normalized.length > 20) {
      return { valid: false, reason: 'USERNAME_TOO_LONG' };
    }

    // 格式检查：只允许字母、数字和下划线（原始输入）
    if (!/^[a-zA-Z0-9_]+$/.test(original)) {
      return { valid: false, reason: 'USERNAME_INVALID_FORMAT' };
    }

    // 检查是否以数字开头
    if (/^\d/.test(trimmed)) {
      return { valid: false, reason: 'USERNAME_STARTS_WITH_NUMBER' };
    }

    // 检查白名单（如果用户名在白名单中，直接通过）
    if (whitelist.includes(normalized) || whitelist.includes(trimmed)) {
      console.log(`✅ 用户名在白名单中: ${username} -> ${normalized}`);
      return { valid: true };
    }

    // 检查脏话（使用 naughty-words 库）
    // 不仅检查完全匹配，还要检查标准化后的用户名是否包含脏话词汇
    // 这样可以防止 "kiss_dick" -> "kissdick" 这样的绕过
    if (BAD_WORDS_SET.size > 0) {
      // 检查标准化后的用户名是否完全匹配脏话
      if (BAD_WORDS_SET.has(normalized)) {
        console.log(`🚫 检测到脏话（完全匹配）: ${username} -> ${normalized}`);
        return { valid: false, reason: 'FORBIDDEN_PROFANITY' };
      }
      // 检查原始小写版本是否完全匹配脏话
      if (BAD_WORDS_SET.has(trimmed)) {
        console.log(`🚫 检测到脏话（完全匹配）: ${username}`);
        return { valid: false, reason: 'FORBIDDEN_PROFANITY' };
      }
      
      // 检查标准化后的用户名是否包含脏话词汇（防止组合绕过，如 "kiss_dick" -> "kissdick"）
      for (const badWord of BAD_WORDS_SET) {
        if (!badWord || badWord.length < 3) continue;
        if (normalized.includes(badWord)) {
          // 检查是否在白名单中（避免误杀，如 "classic" 包含 "ass" 但 "classic" 在白名单中）
          const isWhitelistedExact = whitelist.some(w => normalized === w.toLowerCase() || trimmed === w.toLowerCase());
          
          if (!isWhitelistedExact) {
            console.log(`🚫 检测到脏话（包含）: ${username} -> ${normalized} 包含 ${badWord}`);
            return { valid: false, reason: 'FORBIDDEN_PROFANITY' };
          }
        }
      }
      
      // 也检查原始小写版本是否包含脏话词汇（去除下划线后）
      const trimmedWithoutUnderscore = trimmed.replace(/_/g, '');
      for (const badWord of BAD_WORDS_SET) {
        if (!badWord || badWord.length < 3) continue;
        if (trimmedWithoutUnderscore.includes(badWord)) {
          // 检查是否在白名单中
          const isWhitelistedExact = whitelist.some(w => trimmedWithoutUnderscore === w.toLowerCase() || trimmed === w.toLowerCase());
          
          if (!isWhitelistedExact) {
            console.log(`🚫 检测到脏话（原始包含）: ${username} -> ${trimmedWithoutUnderscore} 包含 ${badWord}`);
            return { valid: false, reason: 'FORBIDDEN_PROFANITY' };
          }
        }
      }
    } else {
      console.warn('⚠️ BAD_WORDS_SET 为空，脏话检查未启用');
    }

    // 检查黑名单关键词（政治人物、系统关键词等）- 使用严格的包含匹配
    // 只要标准化后的用户名包含任何黑名单关键词，就拒绝（除非完全匹配白名单）
    for (const keyword of blacklist) {
      const lowerKeyword = keyword.toLowerCase();
      
      // 完全匹配检查（标准化后和原始小写版本）
      if (normalized === lowerKeyword || trimmed === lowerKeyword) {
        console.log(`🚫 检测到黑名单关键词（完全匹配）: ${username} -> ${normalized} 匹配 ${lowerKeyword}`);
        return { valid: false, reason: 'FORBIDDEN_KEYWORD_EXACT' };
      }
      
      // 严格包含检查：只要标准化后的用户名包含黑名单关键词，就拒绝
      // 这可以防止 "trump_", "shit_trump", "SuperTrump2024" 等变体
      // normalized 已经去除了所有非字母数字字符，所以 "trump_" -> "trump", "shit_trump" -> "shittrump"
      if (normalized.includes(lowerKeyword)) {
        // 只有在用户名完全匹配白名单中的词时才允许（避免误杀，如 "cassandra" 在白名单中）
        const isWhitelistedExact = whitelist.some(w => normalized === w.toLowerCase() || trimmed === w.toLowerCase());
        
        if (!isWhitelistedExact) {
          console.log(`🚫 检测到黑名单关键词（严格包含）: ${username} -> ${normalized} 包含 ${lowerKeyword}`);
          return { valid: false, reason: 'FORBIDDEN_KEYWORD_CONTAINS' };
        }
      }
      
      // 模糊匹配检查（防止拼写变体，如 "Trump" 写成 "Trumpk"）
      try {
        const similarity = calculateSimilarity(normalized, lowerKeyword);
        if (similarity > 0.85) {
          // 检查是否在白名单中
          const isWhitelisted = whitelist.some(w => {
            try {
              return calculateSimilarity(normalized, w) > 0.85;
            } catch (e) {
              return false;
            }
          });
          
          if (!isWhitelisted) {
            console.log(`🚫 检测到黑名单关键词（模糊匹配，相似度 ${(similarity * 100).toFixed(1)}%）: ${username} -> ${normalized} 类似 ${lowerKeyword}`);
            return { valid: false, reason: 'FORBIDDEN_KEYWORD_SIMILAR' };
          }
        }
      } catch (similarityError) {
        // 如果相似度计算失败，跳过模糊匹配检查
        console.warn(`模糊匹配检查失败: ${similarityError.message}`);
      }
    }
    
    // 对于系统关键词（admin, root等），也检查包含情况，避免 "admin123" 这样的用户名
    const systemKeywords = ['admin', 'administrator', 'root', 'system', 'support', 'moderator', 'official', 'verified'];
    for (const keyword of systemKeywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerKeyword.length >= 3 && normalized.includes(lowerKeyword)) {
        // 只有在用户名完全匹配白名单中的词时才允许
        const isWhitelistedExact = whitelist.some(w => normalized === w.toLowerCase() || trimmed === w.toLowerCase());
        
        if (!isWhitelistedExact) {
          console.log(`🚫 检测到系统关键词: ${username} -> ${normalized} 包含 ${lowerKeyword}`);
          return { valid: false, reason: 'FORBIDDEN_KEYWORD_SYSTEM' };
        }
      }
    }

    return { valid: true };
  } catch (err) {
    console.error('验证用户名时发生错误:', err);
    console.error('错误堆栈:', err.stack);
    // 如果验证过程中出错，为了安全起见，拒绝该用户名
    return { valid: false, reason: 'USERNAME_VALIDATION_ERROR' };
  }
}

/**
 * 检查用户名是否包含敏感词（用于前端实时提示）
 * @param {string} username - 要检查的用户名
 * @returns {boolean} 如果包含敏感词返回true
 */
function containsForbiddenKeyword(username) {
  if (!username) return false;
  const normalized = normalizeUsername(username);
  const trimmed = username.trim().toLowerCase();
  
  // 检查白名单
  if (whitelist.includes(normalized) || whitelist.includes(trimmed)) {
    return false;
  }
  
  // 检查脏话（不仅检查完全匹配，还要检查是否包含脏话词汇）
  if (BAD_WORDS_SET.size > 0) {
    // 完全匹配检查
    if (BAD_WORDS_SET.has(normalized) || BAD_WORDS_SET.has(trimmed)) {
      return true;
    }
    // 包含检查（防止组合绕过，如 "kiss_dick" -> "kissdick"）
    const trimmedWithoutUnderscore = trimmed.replace(/_/g, '');
    for (const badWord of BAD_WORDS_SET) {
      if (!badWord || badWord.length < 3) continue;
      if (normalized.includes(badWord) || trimmedWithoutUnderscore.includes(badWord)) {
        // 检查是否在白名单中
        const isWhitelistedExact = whitelist.some(w => 
          normalized === w.toLowerCase() || trimmed === w.toLowerCase() || trimmedWithoutUnderscore === w.toLowerCase()
        );
        if (!isWhitelistedExact) {
          return true;
        }
      }
    }
  }
  
  // 检查黑名单
  return blacklist.some(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    return normalized === lowerKeyword || 
           trimmed === lowerKeyword ||
           normalized.includes(lowerKeyword) ||
           trimmed.includes(lowerKeyword);
  });
}

module.exports = {
  validateUsername,
  containsForbiddenKeyword,
  normalizeUsername,
  calculateSimilarity,
};
