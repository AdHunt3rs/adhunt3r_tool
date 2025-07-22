// background.js

// === [SISTEMA DE GESTIÓN DE MEMORIA OPTIMIZADO] ===
const MEMORY_MONITOR = {
  lastCleanup: Date.now(),
  cleanupInterval: 5 * 60 * 1000, // 5 minutos
  maxMemoryUsage: 5 * 1024 * 1024, // 5MB (límite real de Chrome storage)
  memoryThreshold: 0.8, // 80% del límite
  
  checkMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const limit = performance.memory.jsHeapSizeLimit;
      const usage = used / limit;
      
      if (usage > this.memoryThreshold) {
        this.forceCleanup();
        return true;
      }
    }
    return false;
  },
  
  forceCleanup() {
    // Limpieza agresiva de memoria
    debugDataByTab = {};
    lastCountedVideoIdByTab = {};
    lastAdStateByTab = {};
    lastCountedAdIdByTab = {};
    globalVideoProcessing.clear();
    
    // Forzar garbage collection si está disponible
    if (window.gc) {
      window.gc();
    }
    
    this.lastCleanup = Date.now();
  }
};

// Almacena la última info de depuración recibida del content-script
let lastDebugInfo = {};
let lastAdDetected = false;
let lastAdDebugId = null;
let lastDebugText = '';

let lastDebugAll = {
  debugText: '',
  debugInfo: {},
  adActive: false,
  addebug_videoId: null
};

let debugDataByTab = {};
let lastCountedVideoIdByTab = {};
let lastAdStateByTab = {}; // Nuevo: para rastrear el último estado de anuncio por pestaña
let lastCountedAdIdByTab = {}; // Nuevo: para rastrear el último anuncio contado por pestaña
let globalVideoProcessing = new Set(); // Nuevo: evitar procesamiento concurrente del mismo video

// Configuración de limpieza de memoria (optimizado)
const MEMORY_CLEANUP_CONFIG = {
  debugDataByTab: {
    maxEntries: 50, // Reducido de 100
    maxAge: 15 * 60 * 1000, // 15 minutos (reducido de 30)
    cleanupInterval: 5 * 60 * 1000 // 5 minutos (reducido de 10)
  },
  globalVideoProcessing: {
    maxEntries: 25, // Reducido de 50
    maxAge: 3 * 60 * 1000 // 3 minutos (reducido de 5)
  }
};

// Función para actualizar el badge por pestaña
function updateBadge(tabId, hasAd) {
  if (!tabId) return;
  
  // Solo actualizamos si el estado realmente cambió
  if (lastAdStateByTab[tabId] !== hasAd) {
    lastAdStateByTab[tabId] = hasAd;
    
    if (hasAd) {
      chrome.action.setBadgeText({ text: 'AD', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#e53935', tabId }); // Rojo
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
}

// Función para limpiar datos cuando se cierra una pestaña
function cleanupTabData(tabId) {
  if (debugDataByTab[tabId]) {
    delete debugDataByTab[tabId];
  }
  if (lastCountedVideoIdByTab[tabId]) {
    delete lastCountedVideoIdByTab[tabId];
  }
  if (lastAdStateByTab[tabId]) {
    delete lastAdStateByTab[tabId];
  }
  // Limpiar también el contador de anuncios por pestaña
  if (lastCountedAdIdByTab[tabId]) {
    delete lastCountedAdIdByTab[tabId];
  }
  updateBadge(tabId, false);
}

// Listener para cuando se cierra o actualiza una pestaña
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanupTabData(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    // Limpiar el badge al navegar a una nueva página
    updateBadge(tabId, false);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  
  if (message.type === 'VIDEO_DEBUG_ALL' && tabId) {
    // Determinar si hay un anuncio activo
    const hasAd = message.adActive || !!message.addebug_videoId;
    const currentTabData = debugDataByTab[tabId] || {};
    
    // Detectar cambios significativos
    const adStateChanged = (hasAd !== currentTabData.adActive) || 
                           (hasAd && message.addebug_videoId && message.addebug_videoId !== currentTabData.addebug_videoId) ||
                           (!hasAd && currentTabData.adActive);

    // Inicializar datos de pestaña si no existen
    if (!debugDataByTab[tabId]) {
      debugDataByTab[tabId] = createEmptyTabData();
    }

    // Verificar si necesita actualización
    const shouldUpdateData = adStateChanged || 
                             message.debugText !== debugDataByTab[tabId].debugText ||
                             message.debug_videoId !== debugDataByTab[tabId].debug_videoId;

    if (shouldUpdateData) {
      updateTabData(tabId, message, hasAd);
      
      if (adStateChanged) {
        updateBadge(tabId, hasAd);
        handleAdCounting(message, tabId, hasAd);
      }
    }

    // Procesar conteo de videos
    handleVideoCounting(tabId);
  }

  if (message.type === 'AD_DETECTED') {
    lastAdDetected = true;
    const addebug_videoId = message.addebug_videoId;
    
    if (sender.tab && sender.tab.id) {
      updateBadge(sender.tab.id, true);
    }
    
    // NOTA: El conteo de anuncios ahora se hace en VIDEO_DEBUG_ALL para evitar duplicados
    // Este sistema AD_DETECTED solo se mantiene como backup para casos edge
  }

  if (message.type === 'AD_ENDED') {
    lastAdDetected = false;
    if (sender.tab && sender.tab.id) {
      updateBadge(sender.tab.id, false);
      debugDataByTab[sender.tab.id] = {
        ...debugDataByTab[sender.tab.id],
        adActive: false,
        addebug_videoId: null
      };
    }
  }

  // Consulta del número de anuncios en las últimas 24h
  if (message.type === 'GET_ADS_LAST_24H') {
    const now = Date.now();
    chrome.storage.local.get({ adTimestamps: [] }, (data) => {
      // Filtrar solo las entradas de las últimas 24h
      const last24h = (data.adTimestamps || []).filter(
        item => (now - item.timestamp) <= 24 * 60 * 60 * 1000
      );
      
      // Actualizar storage con solo las entradas válidas
      chrome.storage.local.set({ adTimestamps: last24h });
      
      // Enviar el conteo total de anuncios (incluyendo repeticiones)
      try {
      sendResponse({ count: last24h.length });
      } catch (e) {
        console.warn('[AdHunt3r] Error enviando respuesta GET_ADS_LAST_24H:', e.message);
      }
    });
    return true;
  }

  // Consulta del número de videos vistos en las últimas 24h
  if (message.type === 'GET_VIDEOS_LAST_24H') {
    const now = Date.now();
    chrome.storage.local.get({ videoTimestamps: [] }, (data) => {
      // Filtrar solo las entradas de las últimas 24h
      const last24h = (data.videoTimestamps || []).filter(
        item => (now - item.timestamp) <= 24 * 60 * 60 * 1000
      );
      
      // Contar videos únicos por videoId (debug_videoId)
      const uniqueVideos = new Set(last24h.map(item => item.videoId));
      const uniqueCount = uniqueVideos.size;
      
      // Actualizar storage con solo las entradas válidas
      chrome.storage.local.set({ videoTimestamps: last24h });
      
      // Enviar el conteo de videos únicos
      try {
        sendResponse({ count: uniqueCount });
      } catch (e) {
        console.warn('[AdHunt3r] Error enviando respuesta GET_VIDEOS_LAST_24H:', e.message);
      }
    });
    return true;
  }

  if (message.type === 'GET_DEBUG_INFO') {

    
    // Si la solicitud viene de un content-script, usar su tabId
    if (sender.tab?.id) {
      const tabData = debugDataByTab[sender.tab.id] || {
        debugText: '',
        debugInfo: {},
        adActive: false,
        addebug_videoId: null,
        debug_videoId: null,
        adTypeInfo: null
      };

      try {
      sendResponse(tabData);
      } catch (e) {
        console.warn('[AdHunt3r] Error enviando respuesta GET_DEBUG_INFO:', e.message);
      }
    } else {
      // Si viene del popup, buscar la pestaña activa
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.[0]?.id) {
          try {
          sendResponse({
            debugText: '',
            debugInfo: {},
            adActive: false,
            addebug_videoId: null,
            debug_videoId: null,
            adTypeInfo: null
          });
          } catch (e) {
            console.warn('[AdHunt3r] Error enviando respuesta GET_DEBUG_INFO (sin tabs):', e.message);
          }
          return;
        }
        
        const tabData = debugDataByTab[tabs[0].id] || {
          debugText: '',
          debugInfo: {},
          adActive: false,
          addebug_videoId: null,
          debug_videoId: null,
          adTypeInfo: null
        };
        
        // Asegurarse de que el badge refleja el estado actual
        updateBadge(tabs[0].id, tabData.adActive);
  
        
        try {
        sendResponse(tabData);
        } catch (e) {
          console.warn('[AdHunt3r] Error enviando respuesta GET_DEBUG_INFO (popup):', e.message);
        }
        
        // NUEVO: Forzar actualización del contador si hay un video válido detectado
        const debug_videoId = tabData.debug_videoId;
        const addebug_videoId = tabData.addebug_videoId;
        if (debug_videoId && debug_videoId.length >= 10 && debug_videoId !== addebug_videoId) {
          // Simular un mensaje VIDEO_DEBUG_ALL para forzar conteo si es necesario
          chrome.runtime.sendMessage({
            type: 'VIDEO_DEBUG_ALL',
            debugText: tabData.debugText,
            debugInfo: tabData.debugInfo,
            adActive: tabData.adActive,
            addebug_videoId: tabData.addebug_videoId,
            debug_videoId: tabData.debug_videoId,
            adTypeInfo: tabData.adTypeInfo
          }).catch(() => {
            // Ignorar errores
          });
        }
      });
      return true;
    }
  }

  // Resetear contadores de anuncios y videos de 24h
  if (message.type === 'RESET_COUNTERS') {
    chrome.storage.local.set({ 
      adTimestamps: [], 
      videoTimestamps: [] 
    }, () => {
      // Limpiar también el tracking por pestaña
      lastCountedVideoIdByTab = {};
      lastCountedAdIdByTab = {};
      globalVideoProcessing.clear();
      
      // Notificar al popup sobre el reset
      chrome.runtime.sendMessage({ 
        type: 'AD_COUNT_UPDATED', 
        count: 0 
      }).catch(() => {
        // Popup podría no estar abierto, ignorar error
      });
      
      chrome.runtime.sendMessage({ 
        type: 'VIDEO_COUNT_UPDATED', 
        count: 0 
      }).catch(() => {
        // Popup podría no estar abierto, ignorar error
      });
      
      try {
      sendResponse({ success: true });
      } catch (e) {
        console.warn('[AdHunt3r] Error enviando respuesta RESET_COUNTERS:', e.message);
      }
    });
    return true;
  }
});

// Sistema de limpieza periódica de memoria (optimizado)
function cleanupMemory() {
  const now = Date.now();
  
  // Verificar uso de memoria primero
  if (MEMORY_MONITOR.checkMemoryUsage()) {
    return; // Ya se hizo limpieza forzada
  }
  
  // Limpiar debugDataByTab si excede límites
  const debugEntries = Object.entries(debugDataByTab);
  if (debugEntries.length > MEMORY_CLEANUP_CONFIG.debugDataByTab.maxEntries) {
    // Mantener solo las entradas más recientes
    const sortedEntries = debugEntries
      .map(([tabId, data]) => ({ tabId, data, lastUpdate: data.lastUpdate || now }))
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
      .slice(0, MEMORY_CLEANUP_CONFIG.debugDataByTab.maxEntries);
    
    debugDataByTab = {};
    sortedEntries.forEach(({ tabId, data }) => {
      debugDataByTab[tabId] = data;
    });
  }
  
  // Limpiar globalVideoProcessing si excede límites
  if (globalVideoProcessing.size > MEMORY_CLEANUP_CONFIG.globalVideoProcessing.maxEntries) {
    globalVideoProcessing.clear();
  }
  
  // Limpiar entradas antiguas de tracking
  const maxAge = MEMORY_CLEANUP_CONFIG.debugDataByTab.maxAge;
  Object.keys(lastCountedVideoIdByTab).forEach(tabId => {
    if (now - (debugDataByTab[tabId]?.lastUpdate || 0) > maxAge) {
      delete lastCountedVideoIdByTab[tabId];
      delete lastCountedAdIdByTab[tabId];
    }
  });
  
  // Limpiar datos de pestañas cerradas
  Object.keys(debugDataByTab).forEach(tabId => {
    if (now - (debugDataByTab[tabId]?.lastUpdate || 0) > maxAge) {
      delete debugDataByTab[tabId];
    }
  });
  
  MEMORY_MONITOR.lastCleanup = now;
}

// Inicializar limpieza periódica cada 5 minutos (optimizado)
setInterval(cleanupMemory, MEMORY_CLEANUP_CONFIG.debugDataByTab.cleanupInterval);

// Funciones auxiliares optimizadas para manejo de mensajes
function createEmptyTabData() {
  return {
    debugText: '',
    debugInfo: {},
    adActive: false,
    addebug_videoId: null,
    debug_videoId: null,
    adTypeInfo: null,
    lastUpdate: Date.now()
  };
}

function updateTabData(tabId, message, hasAd) {
  const debug_videoId = message.debug_videoId || 
                       (message.debugInfo?.debug_videoId) ||
                       (message.debugInfo?.ytInitialPlayerResponse?.videoDetails?.videoId) ||
                       null;
                       
  debugDataByTab[tabId] = {
    debugText: message.debugText,
    debugInfo: message.debugInfo,
    adActive: hasAd,
    addebug_videoId: message.addebug_videoId,
    debug_videoId: debug_videoId,
    adTypeInfo: message.adTypeInfo || null,
    lastUpdate: Date.now()
  };
}

function handleAdCounting(message, tabId, hasAd) {
  if (hasAd && message.addebug_videoId && message.addebug_videoId !== 'empty_video') {
    const now = Date.now();
    const lastAdData = lastCountedAdIdByTab[tabId];
    
    // Evitar conteo duplicado en período muy corto
    const shouldCount = !lastAdData || 
                       lastAdData.adId !== message.addebug_videoId ||
                       (now - lastAdData.timestamp) > 5000;
    
    if (shouldCount) {
      lastCountedAdIdByTab[tabId] = {
        adId: message.addebug_videoId,
        timestamp: now
      };
      
      saveAdTimestamp(message.addebug_videoId, message.adTypeInfo, now);
    }
  }
}

function saveAdTimestamp(adId, adTypeInfo, timestamp) {
  chrome.storage.local.get({ adTimestamps: [] }, (data) => {
    let timestamps = data.adTimestamps || [];
    
    // Filtrar entradas antiguas (más de 24h)
    timestamps = timestamps.filter(item => 
      (timestamp - item.timestamp) <= 24 * 60 * 60 * 1000
    );
    
    // Añadir nueva entrada SIEMPRE (incluyendo repeticiones)
    timestamps.push({ 
      adId: adId, 
      timestamp: timestamp,
      adTypeInfo: adTypeInfo || null
    });
    
    chrome.storage.local.set({ adTimestamps: timestamps }, () => {
      // Notificar al popup con el conteo total (incluyendo repeticiones)
      chrome.runtime.sendMessage({ 
        type: 'AD_COUNT_UPDATED', 
        count: timestamps.length 
      }).catch(() => {});
    });
  });
}

function handleVideoCounting(tabId) {
  const tabData = debugDataByTab[tabId];
  if (!tabData) return;
  
  const debug_videoId = tabData.debug_videoId;
  const addebug_videoId = tabData.addebug_videoId;
  
  // Verificar si es un video válido para contar
  if (!debug_videoId || debug_videoId.length < 10 || debug_videoId === addebug_videoId) {
    return;
  }
  
  // Evitar conteo duplicado en la misma pestaña
  if (lastCountedVideoIdByTab[tabId] === debug_videoId) {
    return;
  }
  
  // Evitar procesamiento concurrente
  if (globalVideoProcessing.has(debug_videoId)) {
    lastCountedVideoIdByTab[tabId] = debug_videoId;
    return;
  }
  
  globalVideoProcessing.add(debug_videoId);
  
  chrome.storage.local.get({ videoTimestamps: [] }, (data) => {
    const now = Date.now();
    let timestamps = data.videoTimestamps || [];
    
    // Verificar si ya existe en las últimas 24h
    const existingEntry = timestamps.find(item => 
      item.videoId === debug_videoId && 
      (now - item.timestamp) <= 24 * 60 * 60 * 1000
    );
    
    if (!existingEntry) {
      lastCountedVideoIdByTab[tabId] = debug_videoId;
      
      // Filtrar entradas antiguas
      timestamps = timestamps.filter(item => 
        (now - item.timestamp) <= 24 * 60 * 60 * 1000
      );
      
      // Añadir nueva entrada
      timestamps.push({ videoId: debug_videoId, timestamp: now });
      
      chrome.storage.local.set({ videoTimestamps: timestamps }, () => {
        // Contar videos únicos para notificar al popup
        const uniqueVideos = new Set(timestamps.map(item => item.videoId));
        const uniqueCount = uniqueVideos.size;
        
        chrome.runtime.sendMessage({ 
          type: 'VIDEO_COUNT_UPDATED', 
          count: uniqueCount 
        }).catch(() => {});
        
        globalVideoProcessing.delete(debug_videoId);
      });
    } else {
      lastCountedVideoIdByTab[tabId] = debug_videoId;
      globalVideoProcessing.delete(debug_videoId);
    }
  });
}
