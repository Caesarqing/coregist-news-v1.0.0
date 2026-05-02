# 注册页面验证码功能更新

## 修改概述

已成功将注册页面的"确认密码"字段替换为"邮箱验证码"功能。

## 主要修改

### 1. API 接口更新 (`src/api/auth.ts`)
- 新增 `sendRegisterCode(email: string)` 方法，用于发送注册验证码到用户邮箱
- 该接口调用后端 `/auth/send-register-code` 端点

### 2. 类型定义更新 (`src/types/api.d.ts`)
- 在 `RegisterData` 接口中添加 `verification_code?: string` 字段
- 支持注册时提交验证码

### 3. 注册页面更新 (`src/pages/auth/Register.tsx`)

#### 移除的功能：
- 删除"确认密码"输入字段
- 删除密码匹配验证逻辑
- 删除 `showConfirmPassword` 状态

#### 新增的功能：
- 添加验证码输入字段
- 添加"发送验证码"按钮
- 实现60秒倒计时功能，防止频繁发送
- 验证码长度限制为6位
- 显示验证码发送成功提示
- 验证码验证逻辑

#### 状态管理：
```typescript
const [isSendingCode, setIsSendingCode] = useState(false);  // 发送验证码加载状态
const [codeSent, setCodeSent] = useState(false);            // 验证码是否已发送
const [countdown, setCountdown] = useState(0);              // 倒计时秒数
```

#### 验证码发送逻辑：
- 验证邮箱格式后才能发送
- 发送成功后启动60秒倒计时
- 倒计时期间按钮禁用
- 显示"验证码已发送至 xxx@xxx.com"提示

### 4. 多语言支持 (`src/contexts/LanguageContext.tsx`)

#### 新增中文翻译：
- `verificationCode`: '验证码'
- `enterVerificationCode`: '请输入验证码'
- `sendVerificationCode`: '发送验证码'
- `resendCode`: '重新发送'
- `codeSentTo`: '验证码已发送至'
- `resendCodeIn`: '秒后可重新发送'
- `pleaseEnterCode`: '请输入验证码'
- `invalidCode`: '验证码无效'
- `codeExpired`: '验证码已过期'
- `sendCodeFailed`: '发送验证码失败，请重试'

#### 新增英文翻译：
- `verificationCode`: 'Verification Code'
- `enterVerificationCode`: 'Enter verification code'
- `sendVerificationCode`: 'Send Code'
- `resendCode`: 'Resend'
- `codeSentTo`: 'Code sent to'
- `resendCodeIn`: 'Resend in'
- `pleaseEnterCode`: 'Please enter verification code'
- `invalidCode`: 'Invalid verification code'
- `codeExpired`: 'Verification code expired'
- `sendCodeFailed`: 'Failed to send verification code, please try again'

#### 移除的翻译：
- `confirmPassword`
- `pleaseConfirmPassword`
- `passwordMismatch`

## 用户体验改进

1. **简化注册流程**：用户无需重复输入密码，减少输入错误
2. **邮箱验证**：通过验证码确保邮箱真实有效
3. **防刷机制**：60秒倒计时防止验证码被滥用
4. **即时反馈**：清晰的成功/错误提示信息
5. **多语言支持**：完整的中英文界面

## 后端要求

后端需要实现以下接口：

### POST `/auth/send-register-code`
发送注册验证码到用户邮箱

**请求体：**
```json
{
  "email": "user@example.com"
}
```

**响应：**
```json
{
  "message": "验证码已发送"
}
```

### POST `/auth/register`
用户注册（需包含验证码验证）

**请求体：**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "Password123",
  "verification_code": "123456",
  "name": "Full Name",
  "phone": "13800138000"
}
```

**验证逻辑：**
- 验证码必须有效且未过期
- 验证码与邮箱匹配
- 验证码使用后失效

## 测试建议

1. 测试邮箱格式验证
2. 测试验证码发送功能
3. 测试倒计时功能
4. 测试验证码验证（正确/错误/过期）
5. 测试多语言切换
6. 测试错误提示显示
