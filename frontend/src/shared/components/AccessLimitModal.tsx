import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/shared/ui/dialog';
import { Button } from '~/shared/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';

interface AccessLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessLimitModal({ isOpen, onClose }: AccessLimitModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogin = () => {
    navigate('/login');
    onClose();
  };

  const handleRegister = () => {
    navigate('/register');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <DialogTitle className="text-gray-900 font-bold">
              {t('accessLimitReached') || '访问次数已满'}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            {t('accessLimitDesc') || '您已达到免费访问次数上限（20次）。请登录或注册账号后继续使用所有功能。'}
          </p>
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={handleRegister}
              className="flex-1 rounded-xl h-11 border-gray-200 hover:bg-gray-50"
            >
              {t('register') || '注册'}
            </Button>
            <Button 
              onClick={handleLogin}
              className="flex-1 rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {t('login') || '登录'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
