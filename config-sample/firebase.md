// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDieg06Bt-pBVWxiHmVBKziWaEyBxRuO7M",
  authDomain: "golden-wine-internal.firebaseapp.com",
  projectId: "golden-wine-internal",
  storageBucket: "golden-wine-internal.firebasestorage.app",
  messagingSenderId: "851247576236",
  appId: "1:851247576236:web:3f9c7f4d06d7872f2a1b09",
  measurementId: "G-MK3X3CLDNN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


