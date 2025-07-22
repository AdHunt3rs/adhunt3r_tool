// content-script.js
(function injectDebugScript() {
  // === [SISTEMA DE PERFORMANCE OPTIMIZADO] ===
  const PERFORMANCE_THRESHOLD = 16; // 16ms = 60fps
  const DEBOUNCE_DELAY = 300; // 300ms para debouncing
  
  // Sistema de debouncing para evitar ejecuciones excesivas
  const debounceCache = new Map();
  
  function debounce(func, delay, key) {
    const cacheKey = key || func.name || 'anonymous';
    
    if (debounceCache.has(cacheKey)) {
      clearTimeout(debounceCache.get(cacheKey));
    }
    
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        const startTime = performance.now();
        func();
        const endTime = performance.now();
        
        // Performance monitoring disabled
      });
      debounceCache.delete(cacheKey);
    }, delay);
    
    debounceCache.set(cacheKey, timeoutId);
  }
  
  // Función optimizada para manejar mensajes sin bloquear
  function optimizedMessageHandler(handler) {
    return function(event) {
      const scheduleFn = window.requestIdleCallback || requestAnimationFrame;
      
      scheduleFn(() => {
        const startTime = performance.now();
        handler.call(this, event);
        const endTime = performance.now();
        
        // Performance monitoring disabled
      });
    };
  }

  // Variables de estado optimizadas
  let lastAdDebugId = null;
let lastAdState = false;
  let stableAdCheckCount = 0;

let messageBuffer = {
  lastVideoDebugAll: null,
  lastAdDetected: null,
  lastAdEnded: null,
  lastSentTime: 0
};

// Función para comparar si dos objetos son similares
function isMessageSimilar(msg1, msg2) {
  if (!msg1 || !msg2) return false;
  return JSON.stringify(msg1) === JSON.stringify(msg2);
}

  // Función centralizada para enviar mensajes sin duplicados (optimizada)
function sendMessage(messageData) {
  const now = Date.now();
  const messageType = messageData.type;
  
  // Evitar envío de mensajes muy frecuentes (menos de 500ms)
  if (now - messageBuffer.lastSentTime < 500) {
    return false;
  }
  
  // Verificar duplicados según el tipo de mensaje
  let isDuplicate = false;
  switch (messageType) {
    case 'VIDEO_DEBUG_ALL':
      isDuplicate = isMessageSimilar(messageData, messageBuffer.lastVideoDebugAll);
      if (!isDuplicate) messageBuffer.lastVideoDebugAll = { ...messageData };
      break;
    case 'AD_DETECTED':
      isDuplicate = isMessageSimilar(messageData, messageBuffer.lastAdDetected);
      if (!isDuplicate) messageBuffer.lastAdDetected = { ...messageData };
      break;
    case 'AD_ENDED':
      isDuplicate = isMessageSimilar(messageData, messageBuffer.lastAdEnded);
      if (!isDuplicate) messageBuffer.lastAdEnded = { ...messageData };
      break;
  }
  
  // Solo enviar si no es duplicado
  if (!isDuplicate && typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
    try {
      chrome.runtime.sendMessage(messageData);
      messageBuffer.lastSentTime = now;
      return true;
    } catch (e) {
      // Silenciar error si el service worker no está listo
      return false;
    }
  }
  
  return false;
}

// Función centralizada para obtener addebug_videoId (optimizado)
function getAdDebugVideoId() {
  let addebug_videoId = null;
  if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args && window.ytplayer.config.args.addebug_videoId) {
    addebug_videoId = window.ytplayer.config.args.addebug_videoId;
  } else if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.addebug_videoId) {
    addebug_videoId = window.ytInitialPlayerResponse.addebug_videoId;
  }
  return addebug_videoId;
}

  // Función optimizada para verificar anuncios
  function checkAdStatus() {
  try {
    // Usar función centralizada (optimizado)
    const addebug_videoId = getAdDebugVideoId();
    
    // Verificar si hay un cambio REAL en el estado
    const hasAd = !!addebug_videoId;
    const adIdChanged = addebug_videoId !== lastAdDebugId;
    const adStateChanged = hasAd !== lastAdState;
    
    // Solo notificar si hay un cambio significativo Y ha sido estable por al menos 1 verificación
    if (adStateChanged || adIdChanged) {
      stableAdCheckCount = 0; // Resetear contador en cambio
    } else {
      stableAdCheckCount++;
    }
    
    // Notificar cambios cuando hay un cambio significativo Y es estable
    // Para anuncios nuevos: notificar inmediatamente (stableAdCheckCount == 0 tras el cambio)
    // Para fin de anuncio: esperar 1 segundo de estabilidad
    if (adStateChanged || adIdChanged) {
      if (hasAd && addebug_videoId !== lastAdDebugId) {
        // Nuevo anuncio detectado - notificar inmediatamente
        lastAdDebugId = addebug_videoId;
        lastAdState = true;
        
        // NUEVO: Forzar actualización de debug info cuando se detecta un anuncio nuevo
        window.postMessage({ type: 'FORCE_DEBUG_TEXT' }, '*');
        
        // Usar función centralizada para evitar duplicados (optimizado)
        sendMessage({
          type: 'AD_DETECTED',
          addebug_videoId,
          tabId: (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.TAB_ID_NONE !== undefined && chrome.tabs.TAB_ID_NONE) ? chrome.tabs.TAB_ID_NONE : undefined
        });
      } else if (!hasAd && lastAdState && stableAdCheckCount >= 1) {
        // Fin del anuncio detectado - solo después de 1 segundo de estabilidad
        lastAdState = false;
        lastAdDebugId = null;
        
        // NUEVO: Forzar actualización cuando termina un anuncio
        window.postMessage({ type: 'FORCE_DEBUG_TEXT' }, '*');
        
        // Usar función centralizada para evitar duplicados (optimizado)
        sendMessage({
          type: 'AD_ENDED',
          tabId: (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.TAB_ID_NONE !== undefined && chrome.tabs.TAB_ID_NONE) ? chrome.tabs.TAB_ID_NONE : undefined
        });
      }
    }
  } catch (e) {
    // Silenciar errores
  }
  }

  // Nueva función: comprueba cada 2 segundos si hay un addebug_videoId nuevo o cambiado (optimizado)
  setInterval(() => {
    debounce(checkAdStatus, DEBOUNCE_DELAY, 'ad_status_check');
}, 2000); // Optimizado: reducido de 1000ms a 2000ms

// Listener de mensajes optimizado para procesar datos de debug (optimizado)
  window.addEventListener('message', optimizedMessageHandler(function(event) {
  if (event.source !== window) return;
  if (event.data && event.data.type === 'YTD_DEBUG_ALL') {
    // Solo envía el estado de anuncio si addebug_videoId existe
    const addebug_videoId = event.data.addebug_videoId;
    const adActive = !!addebug_videoId;
    
    // NUEVO: Forzar actualización cuando se detecta un anuncio
    if (adActive && addebug_videoId) {
      // Enviar FORCE_DEBUG_TEXT para asegurar que los datos estén actualizados
      window.postMessage({ type: 'FORCE_DEBUG_TEXT' }, '*');
    }
    
    // Solo enviar si hay cambios relevantes en los datos (optimizado)
    sendMessage({
      type: 'VIDEO_DEBUG_ALL',
      debugText: event.data.debugText,
      debugInfo: event.data.debugInfo,
      adActive,
      addebug_videoId,
      debug_videoId: event.data.debug_videoId,
      adTypeInfo: event.data.adTypeInfo // ← NUEVO: información del tipo de anuncio
    });
    
    // NO notificar cambios de anuncio aquí - se hace en el setInterval arriba
    // para evitar notificaciones duplicadas y parpadeos
  }
  }));

// Permite que el popup fuerce la obtención de la info de debug en tiempo real
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    let handledAsync = false;
    
  if (message && message.type === 'FORCE_DEBUG_INFO') {
    window.postMessage({ type: 'FORCE_DEBUG_TEXT' }, '*');
      try {
    sendResponse({ status: 'requested' });
      } catch (e) {
        console.warn('[AdHunt3r] Error enviando respuesta FORCE_DEBUG_INFO:', e.message);
      }
      return false; // No mantener canal abierto
    }
    
    // Listener para configuración de extracción del iframe
    if (message && message.type === 'ADHUNT3R_IFRAME_EXTRACTION_SETTING') {

      // Reenviar el mensaje al inject.js
      window.postMessage({ 
        type: 'ADHUNT3R_IFRAME_EXTRACTION_SETTING', 
        enabled: message.enabled 
      }, '*');
      
      // NUEVO: Manejo seguro de sendResponse con verificación
      try {
        if (typeof sendResponse === 'function') {
          sendResponse({ status: 'configured' });
        } else {
          console.warn('[AdHunt3r] sendResponse no es función, canal de mensajes cerrado');
        }
      } catch (e) {
        console.warn('[AdHunt3r] Error enviando respuesta ADHUNT3R_IFRAME_EXTRACTION_SETTING:', e.message);
      }
      return false; // No mantener canal abierto
    }
    
    // Listener para extracción de datos del iframe
  if (message && message.type === 'EXTRAER_DATOS_IFRAME') {

      window.postMessage({ type: 'ADHUNT3R_EXTRACT_IFRAME_DATA' }, '*');
      handledAsync = true;
      
      // Esperar la respuesta del inject.js con timeout
      let responseSent = false;
      const responseListener = function(event) {
        if (event.data && event.data.type === 'ADHUNT3R_IFRAME_DATA' && !responseSent) {

        window.removeEventListener('message', responseListener);
          responseSent = true;
          
          // NUEVO: Manejo seguro de sendResponse con timeout
          const sendResponseSafely = () => {
            try {
              if (typeof sendResponse === 'function') {
                sendResponse(event.data.spdata);
              } else {
                console.warn('[AdHunt3r] sendResponse no es función, canal cerrado');
              }
            } catch (e) {
              console.warn('[AdHunt3r] Error enviando respuesta del iframe:', e.message);
            }
          };
          
          // Usar setTimeout para asegurar que el canal esté abierto
          setTimeout(sendResponseSafely, 0);
        }
      };
      
      // Timeout de 10 segundos
      const timeoutId = setTimeout(() => {
        if (!responseSent) {
          window.removeEventListener('message', responseListener);
          responseSent = true;

          
          const sendResponseSafely = () => {
            try {
              if (typeof sendResponse === 'function') {
                sendResponse(null);
              } else {
                console.warn('[AdHunt3r] sendResponse no es función, canal cerrado');
              }
            } catch (e) {
              console.warn('[AdHunt3r] Error enviando respuesta timeout del iframe:', e.message);
            }
          };
          
          setTimeout(sendResponseSafely, 0);
      }
      }, 10000);
    
    window.addEventListener('message', responseListener);
      return true;
    }

    // Listener para extracción de datos del anuncio
    if (message && message.type === 'EXTRAER_DATOS_ANUNCIO') {
  
      window.postMessage({ type: 'ADHUNT3R_EXTRACT_AD_DATA' }, '*');
      handledAsync = true;
      
      let responseSent = false;
      const responseListener = function(event) {
        if (event.data && event.data.type === 'ADHUNT3R_AD_DATA' && !responseSent) {

          window.removeEventListener('message', responseListener);
          responseSent = true;
          
          // NUEVO: Manejo seguro de sendResponse con timeout
          const sendResponseSafely = () => {
            try {
              if (typeof sendResponse === 'function') {
                sendResponse(event.data.adData);
              } else {
                console.warn('[AdHunt3r] sendResponse no es función, canal cerrado');
              }
            } catch (e) {
              console.warn('[AdHunt3r] Error enviando respuesta del anuncio:', e.message);
            }
          };
          
          // Usar setTimeout para asegurar que el canal esté abierto
          setTimeout(sendResponseSafely, 0);
        }
      };
      
      // Timeout de 10 segundos
      const timeoutId = setTimeout(() => {
        if (!responseSent) {
      window.removeEventListener('message', responseListener);
          responseSent = true;

          
          const sendResponseSafely = () => {
            try {
              if (typeof sendResponse === 'function') {
                sendResponse(null);
              } else {
                console.warn('[AdHunt3r] sendResponse no es función, canal cerrado');
              }
            } catch (e) {
              console.warn('[AdHunt3r] Error enviando respuesta timeout del anuncio:', e.message);
            }
          };
          
          setTimeout(sendResponseSafely, 0);
      }
      }, 10000);
      
      window.addEventListener('message', responseListener);
      return true;
    }
    
    return handledAsync;
  });

  // Inyectar el script de debug en la página
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/inject.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
})();