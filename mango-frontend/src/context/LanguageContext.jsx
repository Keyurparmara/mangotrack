import { createContext, useContext, useState, useEffect } from 'react'

const translations = {
  en: {
    // Nav
    'Home': 'Home',
    'Purchase': 'Purchase',
    'Sales': 'Sales',
    'New Sale': 'New Sale',
    'Stock': 'Stock',
    'Pay': 'Pay',
    'Team': 'Team',
    'My Sales': 'My Sales',
    'Profile': 'Profile',
    'Settings': 'Settings',
    'Parties': 'Parties',
    'Trucks': 'Trucks',

    // Common
    'Logout': 'Logout',
    'Save': 'Save',
    'Cancel': 'Cancel',
    'Back': 'Back',
    'Add': 'Add',
    'Create': 'Create',
    'Loading...': 'Loading...',
    'Help & Support': 'Help & Support',
    'Available': 'Available',
    'Purchased': 'Purchased',
    'Sold': 'Sold',

    // Dashboard
    'Good morning': 'Good morning',
    'Good afternoon': 'Good afternoon',
    'Good evening': 'Good evening',
    'Total Revenue': 'Total Revenue',
    'Boxes Sold': 'Boxes Sold',
    'Orders': 'Orders',

    // Sale
    'Mango Details': 'Mango Details',
    'Box Sale (Optional)': 'Box Sale (Optional)',
    'Customer Details': 'Customer Details',
    'Delivery Details': 'Delivery Details',
    'Confirm Sale': 'Confirm Sale',
    'Category': 'Category',
    'Box Size': 'Box Size',
    'Quantity (boxes)': 'Quantity (boxes)',
    'Price / box': 'Price / box',

    // Stock
    'Live inventory': 'Live inventory — purchase minus sales',
    'No mango stock': 'No mango stock',
    'No box stock': 'No box stock',

    // Login
    'Sign In': 'Sign In',
    'Welcome back': 'Welcome back!',
    'Username': 'Username',
    'Password': 'Password',

    // Payments
    'Total': 'Total',
    'Paid': 'Paid',
    'Remaining': 'Remaining',
    'Pending': 'Pending',
  },
  gu: {
    // Nav
    'Home': 'હોમ',
    'Purchase': 'ખરીદ',
    'Sales': 'વેચાણ',
    'New Sale': 'નવું વેચાણ',
    'Stock': 'સ્ટૉક',
    'Pay': 'ચુકવ.',
    'Team': 'ટીમ',
    'My Sales': 'મારા વેચાણ',
    'Profile': 'પ્રોફાઇલ',
    'Settings': 'સેટિંગ્સ',
    'Parties': 'પાર્ટી',
    'Trucks': 'ટ્રક',

    // Common
    'Logout': 'લૉગ આઉટ',
    'Save': 'સેવ',
    'Cancel': 'રદ',
    'Back': 'પાછળ',
    'Add': 'ઉમેરો',
    'Create': 'બનાવો',
    'Loading...': 'લોડ થઈ રહ્યું છે...',
    'Help & Support': 'મદદ & સહાય',
    'Available': 'ઉપલબ્ધ',
    'Purchased': 'ખરીદ',
    'Sold': 'વેચ્યું',

    // Dashboard
    'Good morning': 'સુ-સ્વભાતે',
    'Good afternoon': 'શુભ બપોર',
    'Good evening': 'શુભ સાંજ',
    'Total Revenue': 'કુલ આવક',
    'Boxes Sold': 'વેચેલ ખોખા',
    'Orders': 'ઓર્ડર',

    // Sale
    'Mango Details': 'આંબા ની માહિતી',
    'Box Sale (Optional)': 'ખોખા વેચાણ (ઐચ્છિક)',
    'Customer Details': 'ગ્રાહક ની માહિતી',
    'Delivery Details': 'ડિલિવરી ની માહિતી',
    'Confirm Sale': 'વેચાણ કન્ફર્મ',
    'Category': 'શ્રેણી',
    'Box Size': 'ખોખા નો આકાર',
    'Quantity (boxes)': 'જથ્થો (ખોખા)',
    'Price / box': 'ભાવ / ખોખો',

    // Stock
    'Live inventory': 'લાઇવ સ્ટૉક — ખરીદ ઓછું વેચ',
    'No mango stock': 'આંબાનો સ્ટૉક નથી',
    'No box stock': 'ખોખાનો સ્ટૉક નથી',

    // Login
    'Sign In': 'લૉગ ઇન',
    'Welcome back': 'ફરી સ્વાગત છે!',
    'Username': 'વપરાશકર્તા નામ',
    'Password': 'પાસવર્ડ',

    // Payments
    'Total': 'કુલ',
    'Paid': 'ચૂકવ્યું',
    'Remaining': 'બાકી',
    'Pending': 'બાકી',
  }
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en')

  const setLang = (code) => {
    localStorage.setItem('lang', code)
    setLangState(code)
  }

  const t = (key) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key

  const locale = lang === 'gu' ? 'gu-IN' : 'en-IN'

  // Format money: ₹૧,૨૩,૪૫૬ in Gujarati, ₹1,23,456 in English
  const fmtMoney = (n) =>
    '₹' + (n || 0).toLocaleString(locale, { maximumFractionDigits: 0 })

  // Format number only
  const fmtNum = (n) =>
    (n || 0).toLocaleString(locale, { maximumFractionDigits: 0 })

  // Format date
  const fmtDate = (d, opts) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(locale, opts || { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Format datetime
  const fmtDateTime = (d, opts) => {
    if (!d) return '—'
    return new Date(d).toLocaleString(locale, opts || { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, fmtMoney, fmtNum, fmtDate, fmtDateTime }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
