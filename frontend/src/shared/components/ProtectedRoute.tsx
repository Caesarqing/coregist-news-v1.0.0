import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // 开发模式：可以通过以下方式启用
  // 方法1：URL参数 ?dev_mode=true（推荐，避免浏览器扩展干扰）
  // 方法2：localStorage 设置 'dev_mode' = 'true'
  // 取消开发模式：删除URL参数或执行 localStorage.removeItem('dev_mode')
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const urlDevMode = searchParams.get('dev_mode') === 'true';
  
  // 安全地读取 localStorage，避免浏览器扩展干扰
  let localStorageDevMode = false;
  try {
    localStorageDevMode = localStorage.getItem('dev_mode') === 'true';
  } catch (error) {
    // 忽略 localStorage 访问错误（可能是浏览器扩展导致的）
    console.warn('无法访问 localStorage，使用 URL 参数模式');
  }
  
  const isDevMode = urlDevMode || localStorageDevMode;
  const token = localStorage.getItem('access_token');
  
  // 如果通过 URL 参数启用开发模式，自动保存到 localStorage（可选）
  useEffect(() => {
    if (urlDevMode && !localStorageDevMode) {
      try {
        localStorage.setItem('dev_mode', 'true');
      } catch (error) {
        // 忽略设置错误
      }
    }
  }, [urlDevMode, localStorageDevMode]);
  
  if (!isDevMode && !token) {
    const returnUrl = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?return_url=${encodeURIComponent(returnUrl)}`} replace />;
  }
  
  return <>{children}</>;
}
