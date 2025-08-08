import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Minimal i18n setup with English, Hindi, and Marathi
const resources = {
  en: {
    common: {
      nav: {
        browse: 'Browse Items',
        matches: 'My Matches',
        myItems: 'My Items',
        claims: 'Claims',
        messages: 'Messages',
        postLost: 'Post Lost Item',
        postFound: 'Post Found Item',
        admin: 'Admin'
      },
      buttons: {
        postItem: 'Post Item',
        signIn: 'Sign In',
        getStarted: 'Get Started',
        qrTag: 'Item QR Tag'
      }
    }
  },
  hi: {
    common: {
      nav: {
        browse: 'आइटम ब्राउज़ करें',
        matches: 'मेरे मैच',
        myItems: 'मेरी वस्तुएँ',
        claims: 'दावे',
        messages: 'संदेश',
        postLost: 'खोई वस्तु पोस्ट करें',
        postFound: 'मिली वस्तु पोस्ट करें',
        admin: 'एडमिन'
      },
      buttons: {
        postItem: 'वस्तु पोस्ट करें',
        signIn: 'साइन इन',
        getStarted: 'शुरू करें',
        qrTag: 'क्यूआर टैग'
      }
    }
  },
  mr: {
    common: {
      nav: {
        browse: 'वस्तू ब्राउझ करा',
        matches: 'माय मॅचेस',
        myItems: 'माझ्या वस्तू',
        claims: 'दावे',
        messages: 'संदेश',
        postLost: 'हरवलेली वस्तू पोस्ट करा',
        postFound: 'सापडलेली वस्तू पोस्ट करा',
        admin: 'प्रशासक'
      },
      buttons: {
        postItem: 'वस्तू पोस्ट करा',
        signIn: 'साइन इन',
        getStarted: 'सुरू करा',
        qrTag: 'QR टॅग'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

export default i18n;
