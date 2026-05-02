import { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { TopNavigation } from '~/shared/layouts/TopNavigation';

export function MainLayout() {
  const location = useLocation();

  // 根据当前路径确定活动标签
  const getActiveTab = (): string => {
    const path = location.pathname;
    if (path.startsWith('/home')) return 'home';
    if (path.startsWith('/news')) return 'news';
    if (path.startsWith('/profile')) return 'profile';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<string>(getActiveTab());

  // 当路径改变时更新活动标签
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopNavigation activeTab={activeTab} />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
