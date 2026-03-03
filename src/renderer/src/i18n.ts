import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'

const resources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  }
}

// 尝试从 localStorage 获取语言，如果没有则默认中文
const savedLanguage = localStorage.getItem('app-language') || 'zh'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage, 
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  })

export default i18n
