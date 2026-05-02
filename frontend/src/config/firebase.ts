// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLKXeUC3nXf5Ra106fILv44n73BS-HzRY",
  authDomain: "coregistnews-news.firebaseapp.com",
  projectId: "coregistnews-news",
  storageBucket: "coregistnews-news.firebasestorage.app",
  messagingSenderId: "44442095523",
  appId: "1:44442095523:web:55802ff49dae261635d416",
  measurementId: "G-EZJ8E4HN4L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);

// 配置 Google 登录
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// 配置 Microsoft 登录
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  prompt: 'select_account'
});

// 配置 Facebook 登录
const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

// Firebase 认证服务
export const firebaseAuth = {
  // Google 登录
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return {
        user: result.user,
        credential: GoogleAuthProvider.credentialFromResult(result)
      };
    } catch (error: any) {
      console.error('Google 登录失败:', error);
      throw new Error(getErrorMessage(error.code));
    }
  },

  // Microsoft 登录
  signInWithMicrosoft: async () => {
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      return {
        user: result.user,
        credential: OAuthProvider.credentialFromResult(result)
      };
    } catch (error: any) {
      console.error('Microsoft 登录失败:', error);
      throw new Error(getErrorMessage(error.code));
    }
  },

  // Facebook 登录
  signInWithFacebook: async () => {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      return {
        user: result.user,
        credential: FacebookAuthProvider.credentialFromResult(result)
      };
    } catch (error: any) {
      console.error('Facebook 登录失败:', error);
      throw new Error(getErrorMessage(error.code));
    }
  },

  // 邮箱密码登录
  signInWithEmail: async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error: any) {
      console.error('邮箱登录失败:', error);
      throw new Error(getErrorMessage(error.code));
    }
  },

  // 邮箱密码注册
  registerWithEmail: async (email: string, password: string, displayName?: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // 更新用户显示名称
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }
      
      // 发送验证邮件
      if (result.user) {
        await sendEmailVerification(result.user);
      }
      
      return result.user;
    } catch (error: any) {
      console.error('注册失败:', error);
      throw new Error(getErrorMessage(error.code));
    }
  },

  // 发送密码重置邮件
  sendPasswordReset: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: '密码重置邮件已发送' };
    } catch (error: any) {
      console.error('发送密码重置邮件失败:', error);
      throw new Error(getErrorMessage(error.code));
    }
  },

  // 发送邮箱验证
  sendVerificationEmail: async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return { success: true, message: '验证邮件已发送' };
      }
      throw new Error('未登录');
    } catch (error: any) {
      console.error('发送验证邮件失败:', error);
      throw new Error(getErrorMessage(error.code));
    }
  },

  // 登出
  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('登出失败:', error);
      throw new Error(getErrorMessage(error.code));
    }
  },

  // 获取当前用户
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // 监听认证状态变化
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // 获取 ID Token
  getIdToken: async () => {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }
};

// 错误消息映射
function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': '该邮箱已被注册',
    'auth/invalid-email': '邮箱格式不正确',
    'auth/operation-not-allowed': '操作不被允许',
    'auth/weak-password': '密码强度太弱',
    'auth/user-disabled': '该账户已被禁用',
    'auth/user-not-found': '用户不存在',
    'auth/wrong-password': '密码错误',
    'auth/invalid-credential': '登录凭证无效',
    'auth/account-exists-with-different-credential': '该邮箱已使用其他方式注册',
    'auth/popup-closed-by-user': '登录窗口被关闭',
    'auth/cancelled-popup-request': '登录请求被取消',
    'auth/popup-blocked': '登录窗口被浏览器阻止',
    'auth/network-request-failed': '网络请求失败',
    'auth/too-many-requests': '请求过于频繁，请稍后再试',
    'auth/requires-recent-login': '需要重新登录',
  };

  return errorMessages[errorCode] || '操作失败，请重试';
}

export { auth, analytics, app };
export default firebaseAuth;
