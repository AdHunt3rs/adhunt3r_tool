// Guarda y recupera la clave de API de YouTube en chrome.storage
// Con cifrado adicional para mayor seguridad

// Función simple de cifrado usando base64 y XOR
function simpleEncrypt(text) {
  if (!text) return '';
  
  const key = 'AdHunt3r_Extension_Key_2024';
  let encrypted = '';
  
  for (let i = 0; i < text.length; i++) {
    const keyChar = key.charCodeAt(i % key.length);
    const textChar = text.charCodeAt(i);
    encrypted += String.fromCharCode(textChar ^ keyChar);
  }
  
  return btoa(encrypted); // Codificar en base64
}

// Función simple de descifrado
function simpleDecrypt(encryptedText) {
  if (!encryptedText) return '';
  
  try {
    const key = 'AdHunt3r_Extension_Key_2024';
    const encrypted = atob(encryptedText); // Decodificar de base64
    let decrypted = '';
    
    for (let i = 0; i < encrypted.length; i++) {
      const keyChar = key.charCodeAt(i % key.length);
      const encryptedChar = encrypted.charCodeAt(i);
      decrypted += String.fromCharCode(encryptedChar ^ keyChar);
    }
    
    return decrypted;
  } catch (error) {
    return '';
  }
}

export function saveApiKey(key) {
  return new Promise((resolve) => {
    const encryptedKey = simpleEncrypt(key);
    chrome.storage.local.set({ youtubeApiKey: encryptedKey }, () => {
      resolve();
    });
  });
}

export function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['youtubeApiKey'], (result) => {
      const decryptedKey = simpleDecrypt(result.youtubeApiKey || '');
      resolve(decryptedKey);
    });
  });
}
