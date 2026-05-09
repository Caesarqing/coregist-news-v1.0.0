importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBLKXeUC3nXf5Ra106fILv44n73BS-HzRY',
  authDomain: 'coregistnews-news.firebaseapp.com',
  projectId: 'coregistnews-news',
  storageBucket: 'coregistnews-news.firebasestorage.app',
  messagingSenderId: '44442095523',
  appId: '1:44442095523:web:55802ff49dae261635d416',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'CoreGist News';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/logo-192.png',
    data: payload.data || {},
  });
});
