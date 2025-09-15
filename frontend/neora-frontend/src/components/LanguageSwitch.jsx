import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import useAuthStore from '../store/auth';
import { authAPI } from '../api/auth';

const LanguageSwitch = () => {
  const { i18n } = useTranslation();
  const { user, updateUser } = useAuthStore();

  const toggleLanguage = async () => {
    const newLanguage = i18n.language === 'en' ? 'ar' : 'en';
    
    // Update i18n
    i18n.changeLanguage(newLanguage);
    
    // Update HTML direction
    const html = document.documentElement;
    html.setAttribute('lang', newLanguage);
    html.setAttribute('dir', newLanguage === 'ar' ? 'rtl' : 'ltr');
    
    // Update user preference if logged in
    if (user) {
      try {
        await authAPI.updateProfile({ preferred_language: newLanguage });
        updateUser({ preferred_language: newLanguage });
      } catch (error) {
        console.error('Failed to update language preference:', error);
      }
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleLanguage}
      className="gap-2 font-medium"
    >
      <span className="text-sm">
        {i18n.language === 'en' ? 'العربية' : 'English'}
      </span>
    </Button>
  );
};

export default LanguageSwitch;

