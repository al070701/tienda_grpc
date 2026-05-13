
  import { initializeApp } from 
  "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

  import { getAuth } from 
  "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional

  const firebaseConfig = {

    apiKey: "AIzaSyCUvHlqFQa50XQ_fRb7Q1L_7eaEhuUP7jc",
    authDomain: "rellenitos-c8a38.firebaseapp.com",
    projectId: "rellenitos-c8a38",
    storageBucket: "rellenitos-c8a38.firebasestorage.app",
    messagingSenderId: "944392131977",
    appId: "1:944392131977:web:a051776322a7c487ecbd58",
    measurementId: "G-QS5DPFX6TX"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);

