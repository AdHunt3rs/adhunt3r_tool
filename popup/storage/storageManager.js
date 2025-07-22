// Módulo para gestión optimizada de almacenamiento y caché
// Optimizado para evitar consultas repetidas a chrome.storage

// Sistema de cache optimizado con TTL
export const storageCache = {
  cache: new Map(),
  maxAge: 5000, // 5 segundos
  maxSize: 100, // Máximo 100 entradas en cache
  
  get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return Promise.resolve(cached.value);
    }
    
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        const value = result[key];
        this.set(key, value, false); // false = no guardar en storage
        resolve(value);
      });
    });
  },
  
  set(key, value, saveToStorage = true) {
    // Limpiar cache si excede el tamaño máximo
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
    
    if (saveToStorage) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
    }
    return Promise.resolve();
  },
  
  clear() {
    this.cache.clear();
  }
};

// Funciones auxiliares para manejo de storage
export function isValidVideoId(id) {
  return typeof id === 'string' && 
         id.trim().length > 0 && 
         id !== '(no disponible)' && 
         id !== 'empty_video' &&
         id !== 'null' &&
         id !== 'undefined';
}



// Función para limpiar datos de storage por patrón
export function cleanStorageByPattern(pattern) {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(key => key.match(pattern));
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, resolve);
      } else {
        resolve();
      }
    });
  });
}

// Función para obtener datos del historial
export function getHistoryData(type) {
  const historyKey = type === 'ad' ? 'ytad_history' : 'ytdata_history';
  return storageCache.get(historyKey).then(data => {
    const result = Array.isArray(data) ? data : [];
    return result;
  });
}



// Función para guardar datos en el historial
export function saveToHistory(type, item) {
  const historyKey = type === 'ad' ? 'ytad_history' : 'ytdata_history';
  const idKey = type === 'ad' ? 'adId' : 'videoId';
  
  return getHistoryData(type).then(history => {
    // Remover entrada anterior si existe
    const filteredHistory = history.filter(existingItem => 
      existingItem[idKey] !== item[idKey]
    );
    
    // Añadir la nueva entrada al principio
    filteredHistory.unshift(item);
    
    return storageCache.set(historyKey, filteredHistory).then(() => {
      // Notificar al historial si está abierto
      chrome.runtime.sendMessage({ 
        type: 'REFRESH_HISTORY', 
        which: type,
        lastAdded: item
      });
      
      return filteredHistory;
    });
  }).catch(error => {
    throw error;
  });
}

// === FUNCIONES DE FAVORITOS (SIMPLIFICADAS) ===

// Marcar elemento como favorito
export function markAsFavorite(item) {
  return saveToHistory(item.type, { ...item, isFavorite: true });
}

// Quitar de favoritos
export function removeFromFavorites(item) {
  return saveToHistory(item.type, { ...item, isFavorite: false });
}

// Obtener elementos favoritos
export function getFavorites() {
  return Promise.all([
    getHistoryData('video'),
    getHistoryData('ad')
  ]).then(([videoHistory, adHistory]) => {
    const allItems = [...videoHistory, ...adHistory];
    return allItems.filter(item => item.isFavorite);
  });
}
