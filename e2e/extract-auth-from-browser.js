// Run this in your browser console after signing in normally

// This script extracts your authentication state after you've logged in manually
// Copy this entire script and paste it in the browser console

(function extractAuth() {
  const authData = {
    cookies: [],
    origins: [{
      origin: window.location.origin,
      localStorage: [],
      sessionStorage: []
    }]
  };

  // Get all cookies (Note: httpOnly cookies won't be accessible)
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      authData.cookies.push({
        name: name,
        value: value,
        domain: window.location.hostname,
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: window.location.protocol === 'https:',
        sameSite: 'Lax'
      });
    }
  });

  // Get localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    authData.origins[0].localStorage.push({
      name: key,
      value: localStorage.getItem(key)
    });
  }

  // Get sessionStorage  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    authData.origins[0].sessionStorage.push({
      name: key,
      value: sessionStorage.getItem(key)
    });
  }

  // Try to get Firebase auth token if available
  if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
    firebase.auth().currentUser.getIdToken().then(token => {
      console.log('Firebase Auth Token:', token);
      authData.firebaseToken = token;
      console.log('\n📋 Full auth data to save:');
      console.log(JSON.stringify(authData, null, 2));
      console.log('\n✅ Copy the JSON above and save it to: e2e/storage-states/realUser.json');
    }).catch(err => {
      console.log('Could not get Firebase token:', err);
      console.log('\n📋 Auth data (without Firebase token):');
      console.log(JSON.stringify(authData, null, 2));
      console.log('\n✅ Copy the JSON above and save it to: e2e/storage-states/realUser.json');
    });
  } else {
    console.log('\n📋 Auth data:');
    console.log(JSON.stringify(authData, null, 2));
    console.log('\n✅ Copy the JSON above and save it to: e2e/storage-states/realUser.json');
  }
})();