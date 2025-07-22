// Inject script para YouTube AdHunt3r

// === [SISTEMA DE LOGGING OPTIMIZADO] ===
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Configuración de logging (en producción, cambiar a ERROR o WARN)
const CURRENT_LOG_LEVEL = LOG_LEVELS.WARN; // Solo errores y warnings en producción

function log(level, message, ...args) {
  const prefix = '[AdHunt3r]';
  
  if (level === 'debug') {
  
  } else if (level === 'info') {

  } else if (level === 'warn') {
    console.warn(prefix, message, ...args);
  } else if (level === 'error') {
    console.error(prefix, message, ...args);
  }
}

// Funciones de logging optimizadas
const logger = {
  error: (msg, ...args) => log(LOG_LEVELS.ERROR, msg, ...args),
  warn: (msg, ...args) => log(LOG_LEVELS.WARN, msg, ...args),
  info: (msg, ...args) => log(LOG_LEVELS.INFO, msg, ...args),
  debug: (msg, ...args) => log(LOG_LEVELS.DEBUG, msg, ...args)
};

// === [SISTEMA DE DEBOUNCING OPTIMIZADO] ===
const debounceCache = new Map();
const performanceThreshold = 16; // 16ms = 60fps

function debounce(func, delay, key = null) {
  const cacheKey = key || func.name || 'anonymous';
  
  if (debounceCache.has(cacheKey)) {
    clearTimeout(debounceCache.get(cacheKey));
  }
  
  const timeoutId = setTimeout(() => {
    // Usar requestAnimationFrame para evitar bloquear el hilo principal
    requestAnimationFrame(() => {
      const startTime = performance.now();
      func();
      const endTime = performance.now();
      
      // Log si la función toma demasiado tiempo
      if (endTime - startTime > performanceThreshold) {
        logger.warn(`Función ${func.name || 'anonymous'} tomó ${Math.round(endTime - startTime)}ms`);
      }
    });
    debounceCache.delete(cacheKey);
  }, delay);
  
  debounceCache.set(cacheKey, timeoutId);
}

// Función para limpiar todos los debounces pendientes
function clearAllDebounces() {
  debounceCache.forEach(timeoutId => clearTimeout(timeoutId));
  debounceCache.clear();
}

// === [SISTEMA DE CACHÉ DE SELECTORES DOM OPTIMIZADO] ===
const domCache = {
  cache: new Map(),
  maxAge: 3000, // Reducido a 3 segundos para mejor performance
  maxSize: 30, // Reducido para usar menos memoria
  
  get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.value;
    }
    return null;
  },
  
  set(key, value) {
    // Limpiar cache si excede el tamaño máximo
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  },
  
  clear() {
    this.cache.clear();
  }
};

// Función optimizada para querySelector con caché y performance monitoring
function cachedQuerySelector(selector, context = document) {
  const cacheKey = `${selector}_${context === document ? 'doc' : 'ctx'}`;
  let result = domCache.get(cacheKey);
  
  if (result === null) {
    const startTime = performance.now();
    result = context.querySelector(selector);
    const endTime = performance.now();
    
    // Log si la consulta DOM toma demasiado tiempo
    if (endTime - startTime > performanceThreshold) {
      logger.warn(`querySelector '${selector}' tomó ${Math.round(endTime - startTime)}ms`);
    }
    
    domCache.set(cacheKey, result);
  }
  
  return result;
}

// Función optimizada para querySelectorAll con caché
function cachedQuerySelectorAll(selector, context = document) {
  const cacheKey = `all_${selector}_${context === document ? 'doc' : 'ctx'}`;
  let result = domCache.get(cacheKey);
  
  if (result === null) {
    const startTime = performance.now();
    result = context.querySelectorAll(selector);
    const endTime = performance.now();
    
    // Log si la consulta DOM toma demasiado tiempo
    if (endTime - startTime > performanceThreshold) {
      logger.warn(`querySelectorAll '${selector}' tomó ${Math.round(endTime - startTime)}ms`);
    }
    
    domCache.set(cacheKey, result);
  }
  
  return result;
}

// === [OPTIMIZACIÓN DE HANDLERS DE PERFORMANCE] ===

// Función optimizada para manejar eventos de video sin bloquear
function optimizedVideoHandler(handler) {
  return function(...args) {
    requestAnimationFrame(() => {
      const startTime = performance.now();
      handler.apply(this, args);
      const endTime = performance.now();
      
      if (endTime - startTime > performanceThreshold) {
        logger.warn(`Video handler tomó ${Math.round(endTime - startTime)}ms`);
      }
    });
  };
}

// Función optimizada para manejar mensajes sin bloquear
function optimizedMessageHandler(handler) {
  return function(event) {
    // Usar requestIdleCallback si está disponible, sino requestAnimationFrame
    const scheduleFn = window.requestIdleCallback || requestAnimationFrame;
    
    scheduleFn(() => {
      const startTime = performance.now();
      handler.call(this, event);
      const endTime = performance.now();
      
      if (endTime - startTime > performanceThreshold) {
        logger.warn(`Message handler tomó ${Math.round(endTime - startTime)}ms`);
      }
    });
  };
}

// === [OPTIMIZACIÓN DE FUNCIONES CRÍTICAS] ===

// Función optimizada para detectar cambios de video
function detectVideoChange() {
  try {
    if (window.location.href.includes('/watch?v=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const videoIdFromUrl = urlParams.get('v');
      if (videoIdFromUrl && videoIdFromUrl.match(/^[\w-]{11}$/) && videoIdFromUrl !== lastDetectedVideoId) {
        lastDetectedVideoId = videoIdFromUrl;
        
        // === CORREGIDO: Resetear contexto de posición y secuencia al cambiar video ===
        videoPauseTime = 0;
        isVideoPaused = false;
        lastVideoCurrentTime = 0;
        lastVideoDuration = 0;
        consecutiveAdCount = 0;
        isInAdSequence = false;
        lastVideoContextTime = 0;
        lastVideoContextDuration = 0;
        lastVideoContextTimestamp = 0;
        logger.info(`[VIDEO] Cambio de video detectado: ${videoIdFromUrl}, reseteando contexto de posición y secuencia`);
        
        // Usar requestAnimationFrame para evitar bloquear
        requestAnimationFrame(() => {
          debounce(checkDebugInfoAndAdState, 300, 'debug_check');
        });
      }
    }
      } catch (e) {
    // Ignorar errores
  }
}

// Función optimizada para checkDebugInfoAndAdState
function checkDebugInfoAndAdState() {
  // Usar requestAnimationFrame para evitar bloquear el hilo principal
  requestAnimationFrame(() => {
    const startTime = performance.now();
    
    // Intenta varias ubicaciones posibles del reproductor
    let player = document.querySelector('.html5-video-player');
    if (!player && window.yt && yt.player && typeof yt.player.getPlayerByElement === 'function') {
      const moviePlayer = document.getElementById('movie_player');
      if (moviePlayer) {
        player = yt.player.getPlayerByElement(moviePlayer);
      }
    }

    // REFUERZO: Detectar si estamos en una página sin video de forma más robusta
    let isMainPage = false;
    // 1. No hay reproductor de video
    if (!player || !document.getElementById('movie_player')) {
      isMainPage = true;
    }
    // 2. Estamos en la página principal o una página sin video
    else if (
      window.location.pathname === '/' ||
      window.location.pathname === '/feed/subscriptions' ||
      window.location.pathname === '/feed/library' ||
      window.location.pathname === '/feed/history' ||
      window.location.pathname === '/feed/trending' ||
      window.location.pathname === '/playlist' ||
      document.querySelector('ytd-browse[role="main"]')
    ) {
      isMainPage = true;
    }

    // Si estamos en una página sin video, enviar estado vacío
    if (isMainPage) {
      window.postMessage({
        type: 'YTD_DEBUG_ALL',
        debugText: '',
        debugInfo: {},
        debug_videoId: null,
        adActive: false,
        addebug_videoId: null
      }, '*');
      return;
    }

    // NUEVO: Si hay videoId o addebug_videoId, forzar siempre el envío de la info de debug
    // Si no hay debug_videoId ni addebug_videoId, reintentar hasta 5 veces con retardo
    let retryCount = 0;
    function trySendDebugInfo() {
      // ...existing code for extracting debugText, debugInfo, debug_videoId, addebug_videoId...
      // (copiado de la función actual, pero dentro de este closure)
      let debugText = '';
      if (player && typeof player.getDebugText === 'function') {
        try {
          debugText = player.getDebugText();
        } catch (e) {
          debugText = '';
        }
      } else if (window.yt && typeof yt.getDebugText === 'function') {
        try {
          debugText = yt.getDebugText();
        } catch (e) {
          debugText = '';
        }
      }

      let debugInfo = {};
      if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        try {
          debugInfo = { ...window.ytplayer.config.args };
        } catch (e) {
          debugInfo = {};
        }
      }
      if (window.ytInitialPlayerResponse) {
        try {
          debugInfo.ytInitialPlayerResponse = window.ytInitialPlayerResponse;
        } catch (e) {}
      }

      let debug_videoId = null;
      if (debugInfo.debug_videoId) {
        debug_videoId = debugInfo.debug_videoId;
      }
      if (!debug_videoId && debugText) {
        try {
          const match = debugText.match(/debug_videoId["']?\s*[:=]\s*["']?([\w-]{5,})/);
          if (match && match[1]) debug_videoId = match[1];
        } catch (e) {}
      }
      if (!debug_videoId && debugInfo.ytInitialPlayerResponse && debugInfo.ytInitialPlayerResponse.videoDetails && debugInfo.ytInitialPlayerResponse.videoDetails.videoId) {
        try {
          debug_videoId = debugInfo.ytInitialPlayerResponse.videoDetails.videoId;
        } catch (e) {}
      }
      if (!debug_videoId && window.location.href.includes('/watch?v=')) {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const videoIdFromUrl = urlParams.get('v');
          if (videoIdFromUrl && videoIdFromUrl.match(/^[\w-]{11}$/)) {
            debug_videoId = videoIdFromUrl;
          }
        } catch (e) {}
      }
      if (!debug_videoId) {
        try {
          const metaVideoId = document.querySelector('meta[property="og:url"]');
          if (metaVideoId && metaVideoId.content) {
            const match = metaVideoId.content.match(/[?&]v=([\w-]{11})/);
            if (match && match[1]) debug_videoId = match[1];
          }
          if (!debug_videoId) {
            const player = document.querySelector('#movie_player');
            if (player && player.dataset && player.dataset.videoId) {
              debug_videoId = player.dataset.videoId;
            }
          }
        } catch (e) {}
      }

      let addebug_videoId = null;
      if (debugInfo.addebug_videoId) {
        addebug_videoId = debugInfo.addebug_videoId;
      } else if (debugText) {
        try {
          const match = debugText.match(/addebug_videoId["']?\s*[:=]\s*["']?([\w-]{5,})/);
          if (match && match[1]) addebug_videoId = match[1];
        } catch (e) {}
      } else if (debugInfo.ytInitialPlayerResponse && debugInfo.ytInitialPlayerResponse.addebug_videoId) {
        try {
          addebug_videoId = debugInfo.ytInitialPlayerResponse.addebug_videoId;
        } catch (e) {}
      }

      let adActive = !!addebug_videoId;
      let adTypeInfo = null;
      
      // OPTIMIZACIÓN: Solo logging cuando hay cambios reales
      const adStateChanged = adActive !== (!!lastAdDebugVideoId);
      const adIdChanged = addebug_videoId !== lastAdDebugVideoId;
      
      if (adStateChanged || adIdChanged) {
        logger.info('Estado de anuncio:', { adActive, addebug_videoId, lastAdDebugVideoId });
      }
      
      // OPTIMIZACIÓN: Solo tracking básico de duración, sin extracción de datos
      if (adActive && addebug_videoId !== lastAdDebugVideoId) {
        logger.info('Nuevo anuncio detectado:', addebug_videoId);
        
        // === NUEVO: Capturar tiempo del video inmediatamente al detectar anuncio ===
        const videoElement = document.querySelector('video');
        if (videoElement) {
          const currentTime = videoElement.currentTime || 0;
          let duration = videoElement.duration || 0;
          
          // Si no hay duración del video, intentar obtenerla de otras fuentes
          if (duration === 0) {
            if (window.ytInitialPlayerResponse?.videoDetails?.lengthSeconds) {
              duration = parseFloat(window.ytInitialPlayerResponse.videoDetails.lengthSeconds);
            } else {
              // Intentar obtener desde el progress bar
              const progressBar = document.querySelector('.ytp-progress-bar');
              if (progressBar) {
                const max = parseFloat(progressBar.getAttribute('aria-valuemax') || 0);
                if (max > 0) {
                  duration = max;
                }
              }
            }
          }
          
          // Capturar tiempo del video
          videoPauseTime = currentTime;
          lastVideoContextTime = currentTime;
          lastVideoContextDuration = duration;
          
          const percentage = duration > 0 ? (currentTime / duration * 100) : 0;
          logger.info(`[POSICIÓN] Porcentaje actual: ${percentage.toFixed(1)}%`);
          
          // === NUEVO: Categorización inmediata para debugging ===
          if (currentTime > 0 && duration > 0) {
            let immediatePosition = 'unknown';
            if (percentage <= 5) {
              immediatePosition = 'pre_roll';
            } else if (percentage >= 90) {
              immediatePosition = 'post_roll';
            } else {
              immediatePosition = 'mid_roll';
            }
            logger.info(`[POSICIÓN] Categorización inmediata: ${immediatePosition} (${percentage.toFixed(1)}%)`);
          }
        }
        
        startAdDurationTracking();
        // === NUEVO: Resetear variables para el nuevo anuncio ===
        resetAdDataVariables();
        logger.info('[SECUENCIA] Nuevo anuncio detectado, variables reseteadas para datos frescos');
      } else if (adActive && addebug_videoId === lastAdDebugVideoId) {
        // === NUEVO: Detectar cambios en anuncios consecutivos ===
        if (detectConsecutiveAdChange()) {
          logger.info('[CONSECUTIVE] Cambio detectado en anuncio consecutivo');
        }
      } else if (!adActive && lastAdDebugVideoId && adDurationTracker && adDurationTracker.isTracking) {
        logger.info('Anuncio terminado:', lastAdDebugVideoId);
        stopAdDurationTracking();
      }
      
      // NUEVO: Finalizar secuencia de anuncios cuando no hay anuncio activo
      if (!adActive && isInAdSequence) {
        endAdSequence();
        // === NUEVO: Resetear variables cuando termina un anuncio ===
        resetAdDataVariables();
        logger.info('[SECUENCIA] Anuncio terminado, variables reseteadas para el siguiente');
      }
      
      // OPTIMIZACIÓN: Solo detección básica de tipo, sin extracción de datos
      if (adActive) {
        // Detección mínima de tipo sin extraer datos del overlay
        adTypeInfo = detectAdTypeBasic();
        if (adTypeInfo.type === 'unknown' && addebug_videoId !== lastAdDebugVideoId) {
          setTimeout(() => {
            const retryResult = detectAdTypeBasic();
            if (retryResult.type !== 'unknown') {
              window.postMessage({
                type: 'YTD_DEBUG_ALL',
                debugText,
                debugInfo,
                debug_videoId,
                adActive: true,
                addebug_videoId,
                adTypeInfo: retryResult
              }, '*');
            }
          }, 1000);
        }
      }
      const videoIdChanged = debug_videoId && debug_videoId !== lastDebugVideoId;
      lastDebugVideoId = debug_videoId;
      const adIdChangedForSend = addebug_videoId !== lastAdDebugVideoId;

      // (Eliminada lógica de auto-click al detectar anuncio)
      lastAdDebugVideoId = addebug_videoId;

      // NUEVO: Si hay video o anuncio, enviar siempre la info de debug
      const hasVideo = !!debug_videoId;
      const hasAd = !!addebug_videoId;
      const debugInfoReady = debugText && Object.keys(debugInfo).length > 0;
      
      // OPTIMIZACIÓN: Solo logging cuando hay cambios en los datos
      const dataChanged = videoIdChanged || adIdChangedForSend || 
                         (hasVideo && debug_videoId !== lastDebugVideoId) ||
                         (hasAd && addebug_videoId !== lastAdDebugVideoId);
      
      if (dataChanged) {
        logger.info('Datos extraídos:', { 
          hasVideo, 
          hasAd, 
          debug_videoId, 
          addebug_videoId, 
          debugInfoReady,
          debugTextLength: debugText ? debugText.length : 0,
          debugInfoKeys: Object.keys(debugInfo).length
        });
      }

      // Reintentar si hay video o anuncio pero la info de depuración no está lista
      if ((hasVideo || hasAd) && !debugInfoReady && retryCount < 5) {
        retryCount++;
        setTimeout(trySendDebugInfo, 500);
        return;
      }
      // NO llamar a marcarDivsDeAnuncio() automáticamente
      // Solo se debe llamar cuando el usuario haga click en "Consultar datos del anuncio"
      
      // Enviar si hay video o anuncio y la info está lista
      if (hasVideo || hasAd) {
        window.postMessage({
          type: 'YTD_DEBUG_ALL',
          debugText,
          debugInfo,
          debug_videoId,
          adActive,
          addebug_videoId,
          adTypeInfo
        }, '*');
        lastMessageSent = Date.now();
      } else if (retryCount < 5) {
        // Si no hay ni video ni anuncio, reintentar
        retryCount++;
        setTimeout(trySendDebugInfo, 500);
      }
    }
    trySendDebugInfo();
    
    const endTime = performance.now();
    if (endTime - startTime > performanceThreshold) {
      logger.warn(`checkDebugInfoAndAdState tomó ${Math.round(endTime - startTime)}ms`);
    }
  });
}

// === [OPTIMIZACIÓN DE INTERVALOS] ===
// OPTIMIZACIÓN: Frecuencias ajustadas para mejor responsividad
// Ejecuta la comprobación cada 3 segundos (reducido de 5s)
setInterval(() => {
  debounce(checkDebugInfoAndAdState, 500, 'debug_check');
}, 3000);

// Ejecuta la detección de cambios de video cada 1 segundo (reducido de 3s)
setInterval(() => {
  debounce(detectVideoChange, 200, 'video_change');
}, 1000);

// Función unificada para manejar navegación (optimizado)
function handleNavigation() {
  
  
  // Resetear variables de tracking
  lastAdDebugVideoId = null;
  lastDebugVideoId = null;
  
  // Limpiar observers y timers
  if (adProgressObserver) {
    adProgressObserver.disconnect();
    adProgressObserver = null;
  }
  
  if (adDurationTracker) {
    clearInterval(adDurationTracker);
    adDurationTracker = null;
  }
  
  // Resetear datos del anuncio
  resetAdDataVariables();
  
  // Limpiar caché DOM
  domCache.clear();
  
  // Limpiar debounces pendientes
  clearAllDebounces();
  
  // Limpiar listener de iframe
  const videoElement = document.querySelector('video');
  if (videoElement && videoElement.hasAttribute('data-iframe-listener')) {
    videoElement.removeAttribute('data-iframe-listener');
  }
  
  requestAnimationFrame(() => {
    detectVideoChange();
    checkDebugInfoAndAdState();
  });
}

// Añadir listener para la navegación del historial (cuando se navega entre videos)
window.addEventListener('popstate', handleNavigation);
window.addEventListener('pushstate', handleNavigation);
window.addEventListener('replacestate', handleNavigation);

// Escucha los eventos de reproducción del video para detectar cambios
document.addEventListener('yt-navigate-start', () => {
  requestAnimationFrame(() => {
    detectVideoChange();
    checkDebugInfoAndAdState();
  });
});
document.addEventListener('yt-navigate-finish', () => {
  requestAnimationFrame(() => {
    detectVideoChange();
    setTimeout(checkDebugInfoAndAdState, 500);
  });
});

// Observar cambios en el DOM para detectar navegación (optimizado)
const observer = new MutationObserver((mutations) => {
  // Usar requestIdleCallback para evitar bloquear
  const scheduleFn = window.requestIdleCallback || requestAnimationFrame;
  
  scheduleFn(() => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Detectar si se cargó un nuevo video
        const videoElements = document.querySelectorAll('video');
        if (videoElements.length > 0) {
          detectVideoChange();
        }
      }
    });
  });
});

// Observar el contenedor del reproductor (optimizado - scope reducido)
const targetNode = document.querySelector('#movie_player') || document.querySelector('.html5-video-player') || document.querySelector('body');
if (targetNode) {
  observer.observe(targetNode, {
    childList: true,
    subtree: true,
    attributeFilter: ['src', 'class', 'aria-valuenow']
  });
}

// Optimizar el listener de mensajes
window.addEventListener('message', optimizedMessageHandler((event) => {
  if (event.data && event.data.type === 'FORCE_DEBUG_TEXT') {
    checkDebugInfoAndAdState();
  }
}));

// Listener para recibir cambios de configuración desde el content-script
window.addEventListener('message', optimizedMessageHandler((event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === 'ADHUNT3R_IFRAME_EXTRACTION_SETTING') {
    extractIframeDataEnabled = !!event.data.enabled;

  }
  // Listener para extracción de datos del anuncio bajo demanda
  if (event.data && event.data.type === 'ADHUNT3R_EXTRACT_AD_DATA') {

    
    try {
      // Ejecutar extracción completa de datos del anuncio
      const adData = executeFullAdDataExtraction();
      
      
      // Enviar respuesta con los datos extraídos
      window.postMessage({ type: 'ADHUNT3R_AD_DATA', adData: adData }, '*');
    } catch (error) {
      console.error('[AdHunt3r] Error extrayendo datos del anuncio:', error);
      window.postMessage({ type: 'ADHUNT3R_AD_DATA', adData: null }, '*');
    }
  }
  
  // Listener para extracción de datos del iframe bajo demanda
  if (event.data && event.data.type === 'ADHUNT3R_EXTRACT_IFRAME_DATA') {

    
    if (!extractIframeDataEnabled) {
      
      window.postMessage({ type: 'ADHUNT3R_IFRAME_DATA', spdata: null }, '*');
      return;
    }
    
    // NUEVO: Resetear variables al inicio para evitar mezcla de datos
    resetAdDataVariables();
    
    // Verificar si hay un anuncio activo usando múltiples métodos
    let hasActiveAd = false;
    let addebug_videoId = null;
    
    // Método 1: Verificar ytplayer.config.args
    if (window.ytplayer?.config?.args?.addebug_videoId) {
      addebug_videoId = window.ytplayer.config.args.addebug_videoId;
      hasActiveAd = true;
  
    }
    
    // Método 2: Verificar ytInitialPlayerResponse
    if (!hasActiveAd && window.ytInitialPlayerResponse?.addebug_videoId) {
      addebug_videoId = window.ytInitialPlayerResponse.addebug_videoId;
      hasActiveAd = true;
  
    }
    
    // Método 3: Verificar elementos DOM de anuncio
    if (!hasActiveAd) {
      const adElements = document.querySelectorAll([
        '.video-ads.ad-showing',
        '.ytp-ad-module',
        '.ytp-ad-text',
        '.ytp-ad-skip-button',
        '.ytp-ad-overlay-container',
        '.ytp-ad-player-overlay',
        '.ytp-ad-simple-ad-badge'
      ].join(', '));
      
      if (adElements.length > 0) {
        hasActiveAd = true;

      }
    }
    
    // Método 4: Verificar si el video actual es un anuncio
    if (!hasActiveAd) {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        const videoSrc = videoElement.currentSrc || videoElement.src || '';
        if (videoSrc.includes('googlevideo.com') && videoSrc.includes('&dur=')) {
          hasActiveAd = true;

        }
      }
    }
    


    
    if (!hasActiveAd) {

      // Enviar estructura vacía pero válida en lugar de null
      const emptyData = {
        _adhunt3r_data: {
          adtypeinfo: {
            type: 'unknown',
            isSkippable: false,
            duration: 0,
            durationDetected: false,
            durationSource: 'none',
            position: 'unknown',
            skipText: '',
            advertiserText: null,
            advertiserAvatarUrl: null,
            adHeadline: null,
            adDescription: null,
            adButtonText: null,
            detectedCategory: null,
            consecutiveAdNumber: 0,
            timestamp: Date.now()
          },
          sponsorinfo: {
            anunciante: null,
            ubicacion: null,
            link_anunciante: null,
            tema: null,
            marca: null,
            sponsoredBy: null
          }
        }
      };
      window.postMessage({ type: 'ADHUNT3R_IFRAME_DATA', spdata: emptyData }, '*');
      return;
    }
    
    // 1. Extraer datos del anuncio cuando el usuario lo solicita

    const adData = executeFullAdDataExtraction();
    
    // 2. Pulsar el botón "Mi centro de anuncios"

    const adButton = findAdCenterButton();
    // console.log('[AdHunt3r] Botón encontrado:', !!adButton);
    
    if (adButton) {
      // console.log('[AdHunt3r] Botón encontrado, verificando visibilidad...');
      const isVisible = isElementVisible(adButton);
      // console.log('[AdHunt3r] Botón visible:', isVisible);
      
      if (isVisible) {
        // console.log('[AdHunt3r] Haciendo clic en botón del centro de anuncios');
      simulateNaturalClick(adButton);
        
      setTimeout(async () => {
        // console.log('[AdHunt3r] Extrayendo datos del iframe...');
        const spdata = extraerDatosIframeCentroAnuncios();
        // console.log('[AdHunt3r] Datos extraídos del iframe:', spdata);
        
        // NUEVA FASE 1: Mejorar la lógica de detección de datos válidos
        const hasValidData = spdata && Object.values(spdata).some(val => 
          val !== null && 
          val !== '' && 
          val !== undefined && 
          typeof val === 'string' && 
          val.trim().length > 0 &&
          !val.includes('google.es') // Excluir links genéricos de Google
        );
        const closedAutomatically = spdata && spdata._closedAutomatically;
        
        // console.log('[AdHunt3r] Análisis de datos:', {
        //   hasValidData,
        //   closedAutomatically,
        //   spdata: spdata
        // });
        
        // NUEVA FASE 1: REPRODUCIR ANTES DE CERRAR EL IFRAME
        // console.log('[AdHunt3r] Reproduciendo anuncio antes de cerrar iframe...');
        
        // Configurar listener para detectar pausa automática (como respaldo)
        setupIframeCloseListener();
        
        // Método mejorado: Reproducir primero, luego cerrar iframe
        setTimeout(async () => {
          // console.log('[AdHunt3r] Reproduciendo anuncio antes de cerrar iframe...');
          
          // Activar flag para detectar pausa automática (como respaldo)
          justClosedIframe = true;
          
          // PASO 1: Reproducir el anuncio ANTES de cerrar el iframe
          await resumeVideoPlayback();
          
          // PASO 2: Ahora cerrar el iframe
          setTimeout(() => {
            // console.log('[AdHunt3r] Cerrando iframe después de reproducir...');
            
            // Método 1: Hacer clic en el área del video (fuera del iframe)
            const videoElement = document.querySelector('video');
            if (videoElement) {
              const rect = videoElement.getBoundingClientRect();
              // Hacer clic en la esquina superior izquierda del video (fuera del iframe)
              const clickX = rect.left + 50; // 50px desde el borde izquierdo
              const clickY = rect.top + 50;  // 50px desde el borde superior
              simulateClickAtCoordinates(clickX, clickY);
              // console.log('[AdHunt3r] Clic realizado en área del video:', { clickX, clickY });
            }
          }, 100); // Delay para cerrar iframe después de reproducir
          
          // Método 2: Si el iframe sigue abierto, intentar con ESC
          setTimeout(() => {
            const iframes = document.querySelectorAll('iframe');
            if (iframes.length > 0) {
              // console.log('[AdHunt3r] Iframe sigue abierto, enviando tecla ESC...');
              // Simular tecla ESC para cerrar el iframe
              const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                keyCode: 27,
                which: 27,
                bubbles: true,
                cancelable: true
              });
              document.dispatchEvent(escEvent);
            }
          }, 200);
          
          // Método 3: Si aún no se cierra, hacer clic en el centro del reproductor
          setTimeout(() => {
            const iframes = document.querySelectorAll('iframe');
            if (iframes.length > 0) {
              // console.log('[AdHunt3r] Iframe aún abierto, clic en centro del reproductor...');
              const videoPlayer = document.querySelector('#movie_player');
              if (videoPlayer) {
                const rect = videoPlayer.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                simulateClickAtCoordinates(centerX, centerY);
              }
            }
          }, 400);
          
        }, 50); // Delay mínimo para asegurar que los datos se han extraído
        
        // Combinar datos del anuncio con datos del iframe
        const combinedData = {
          // Datos del iframe del centro de anuncios (sponsorInfo)
          ...spdata,
          
          // Datos del overlay del anuncio (sponsorInfo adicional)
          advertiserText: adData.advertiserText,
          advertiserAvatarUrl: adData.advertiserAvatarUrl,
          adHeadline: adData.adHeadline,
          adDescription: adData.adDescription,
          adButtonText: adData.adButtonText,
          
          // Datos del tipo de anuncio (adTypeInfo)
          adTypeInfo: adData.adTypeInfo
        };
        
        // Limpiar marca interna antes de enviar
        if (combinedData._closedAutomatically) {
          delete combinedData._closedAutomatically;
        }
        
        // Organizar datos en la estructura correcta
        const datosOrganizados = {
          _adhunt3r_data: {
            adtypeinfo: {
              type: adData.adTypeInfo?.type || 'unknown',
              isSkippable: adData.adTypeInfo?.isSkippable || false,
              duration: adData.adTypeInfo?.duration || 0,
              durationDetected: adData.adTypeInfo?.durationDetected || false,
              durationSource: adData.adTypeInfo?.durationSource || 'none',
              position: adData.adTypeInfo?.position || 'unknown',
              skipText: adData.adTypeInfo?.skipText || '',
              advertiserText: adData.advertiserText || null,
              advertiserAvatarUrl: adData.advertiserAvatarUrl || null,
              adHeadline: adData.adHeadline || null,
              adDescription: adData.adDescription || null,
              adButtonText: adData.adButtonText || null,
              // === NUEVO: La categoría se extraerá en apiManager.js desde la API de YouTube ===
              detectedCategory: null, // Se llenará en apiManager.js
              consecutiveAdNumber: adData.adTypeInfo?.consecutiveAdNumber || 0,
              timestamp: adData.adTypeInfo?.timestamp || Date.now()
            },
            sponsorinfo: {
              anunciante: spdata?.anunciante || null,
              ubicacion: spdata?.ubicacion || null,
              link_anunciante: spdata?.link_anunciante || null,
              tema: spdata?.tema || null,
              marca: spdata?.marca || null,
              sponsoredBy: spdata?.sponsoredBy || null
            }
          }
        };
        
        // console.log('[AdHunt3r] Datos organizados a enviar:', datosOrganizados);
        // console.log('[AdHunt3r] ✓ Datos del iframe organizados correctamente:', datosOrganizados._adhunt3r_data.sponsorinfo);
        
        // Enviar la estructura completa organizada
        window.postMessage({ type: 'ADHUNT3R_IFRAME_DATA', spdata: datosOrganizados }, '*');
      }, 2000); // Reducir timeout a 2 segundos ya que ahora cerramos automáticamente
    } else {
        // console.log('[AdHunt3r] Botón encontrado pero no es visible');
        // Enviar estructura vacía pero válida en lugar de null
        const emptyData = {
          _adhunt3r_data: {
            adtypeinfo: {
              type: 'unknown',
              isSkippable: false,
              duration: 0,
              durationDetected: false,
              durationSource: 'none',
              position: 'unknown',
              skipText: '',
              advertiserText: null,
              advertiserAvatarUrl: null,
              adHeadline: null,
              adDescription: null,
              adButtonText: null,
              detectedCategory: null,
              consecutiveAdNumber: 0,
              timestamp: Date.now()
            },
            sponsorinfo: {
              anunciante: null,
              ubicacion: null,
              link_anunciante: null,
              tema: null,
              marca: null,
              sponsoredBy: null
            }
          }
        };
        window.postMessage({ type: 'ADHUNT3R_IFRAME_DATA', spdata: emptyData }, '*');
      }
    } else {
      // console.log('[AdHunt3r] No se encontró el botón del centro de anuncios');
      // Enviar estructura vacía pero válida en lugar de null
      const emptyData = {
        _adhunt3r_data: {
          adtypeinfo: {
            type: 'unknown',
            isSkippable: false,
            duration: 0,
            durationDetected: false,
            durationSource: 'none',
            position: 'unknown',
            skipText: '',
            advertiserText: null,
            advertiserAvatarUrl: null,
            adHeadline: null,
            adDescription: null,
            adButtonText: null,
            detectedCategory: null,
            consecutiveAdNumber: 0,
            timestamp: Date.now()
          },
          sponsorinfo: {
            anunciante: null,
            ubicacion: null,
            link_anunciante: null,
            tema: null,
            marca: null,
            sponsoredBy: null
          }
        }
      };
      window.postMessage({ type: 'ADHUNT3R_IFRAME_DATA', spdata: emptyData }, '*');
    }
  }
  // ...otros listeners existentes...
}));

// Para compatibilidad con el flujo anterior
function getDebugInfoForExtension() {
  checkDebugInfoAndAdState();
}

// === [OPTIMIZACIÓN DE FUNCIONES DE VIDEO] ===

// Optimizar la función resumeVideoPlayback para evitar bloquear
async function resumeVideoPlayback() {
  return new Promise((resolve) => {
    // Usar setTimeout en lugar de requestAnimationFrame para mayor velocidad
    setTimeout(async () => {
      const startTime = performance.now();
      
      // console.log('[AdHunt3r] Intentando reanudar reproducción del video...');
      
      // Método 1: Buscar el elemento video y reproducir directamente
      const videoElement = document.querySelector('video');
      if (videoElement) {
        // console.log('[AdHunt3r] Elemento video encontrado, estado:', {
        //   paused: videoElement.paused,
        //   currentTime: videoElement.currentTime,
        //   duration: videoElement.duration,
        //   readyState: videoElement.readyState,
        //   playbackRate: videoElement.playbackRate
        // });
        
        if (videoElement.paused) {
          try {
            const playPromise = videoElement.play();
            if (playPromise && playPromise.then) {
              playPromise.then(() => {
                logger.debug('Video reproducido directamente con éxito');
                resolve(true);
              }).catch(e => {
                logger.warn('Error en promesa de reproducción:', e.message);
                resolve(false);
              });
            } else {
              resolve(true);
            }
          } catch (e) {
            logger.warn('Error reproduciendo video directamente:', e.message);
            resolve(false);
          }
        } else {
          // console.log('[AdHunt3r] El video ya está reproduciéndose');
          resolve(true);
        }
      } else {
        // Método 2: Si no hay elemento video, intentar hacer clic en el botón de play
        const playButton = document.querySelector('.ytp-play-button');
        if (playButton && playButton.getAttribute('aria-label')?.includes('Reproducir')) {
          try {
            simulateNaturalClick(playButton);
            // console.log('[AdHunt3r] Clic en botón de play realizado');
            resolve(true);
          } catch (e) {
            logger.warn('Error haciendo clic en botón de play:', e.message);
            resolve(false);
          }
        } else {
          // console.log('[AdHunt3r] No se encontró elemento video ni botón de play');
          resolve(false);
        }
      }
      
      const endTime = performance.now();
      if (endTime - startTime > performanceThreshold) {
        logger.warn(`resumeVideoPlayback tomó ${Math.round(endTime - startTime)}ms`);
      }
    }, 0); // Delay mínimo para evitar bloqueo
  });
}

// === [CONTROL DE EXTRACCIÓN DE DATOS DEL IFRAME] ===
let extractIframeDataEnabled = true; // Se controla desde el popup

// Variable para controlar si acabamos de cerrar un iframe
let justClosedIframe = false;
let iframeCloseTimeout = null;

// Variables globales para los datos del anuncio (RESETEADAS POR CONSULTA)
let currentAdData = {
  // Datos del overlay del anuncio (sponsorInfo)
  advertiserText: '',
  advertiserAvatarUrl: '',
  adHeadline: '',
  adDescription: '',
  adButtonText: '',
  
  // Datos del tipo de anuncio (adTypeInfo)
  adTypeInfo: null,
  
  // Timestamp de la consulta actual
  extractionTimestamp: null
};

// Variables para tracking de anuncios
let lastAdDebugVideoId = null;
let lastDebugVideoId = null;
let adDurationTracker = null;
let adProgressObserver = null;

// Variables globales para los datos del anuncio (RESETEADAS POR CONSULTA)
let lastAdvertiserText = '';         // Texto del enlace del anunciante
let lastAdvertiserAvatarUrl = '';    // URL de la imagen avatar del anunciante
let lastAdHeadline = '';             // Titular del anuncio
let lastAdDescription = '';          // Descripción del anuncio
let lastAdButtonText = '';           // Texto del botón del anuncio
let lastAdContent = '';              // === NUEVO: Hash del contenido del anuncio para detectar cambios ===

// NUEVA FUNCIÓN: Resetear todas las variables de datos del anuncio
function resetAdDataVariables() {
  // Resetear variables de datos del anuncio
  lastAdvertiserText = '';
  lastAdvertiserAvatarUrl = '';
  lastAdHeadline = '';
  lastAdDescription = '';
  lastAdButtonText = '';
  
  // Resetear variables de tracking de anuncios
  lastAdStartTime = 0;
  lastAdEndTime = 0;
  lastAdPosition = 'unknown';
  
  // === NUEVO: Resetear contexto de posición ===
  videoPauseTime = 0;
  isVideoPaused = false;
  
  // === NUEVO: Resetear variables del video base ===
  videoBaseTime = 0;
  adSequenceStartTime = 0;
  isInAdSequence = false;
  
  // === NUEVO: Resetear hash de contenido del anuncio ===
  lastAdContent = '';
  
  // Resetear objeto currentAdData
  currentAdData = {
    advertiserText: '',
    advertiserAvatarUrl: '',
    adHeadline: '',
    adDescription: '',
    adButtonText: '',
    adTypeInfo: null
  };
  
  logger.info('[RESET] Variables de datos de anuncio reseteadas');
}

// === [FUNCIONES DE EXTRACCIÓN DE DATOS DEL IFRAME] ===

// Función para detectar pausa automática después de cerrar iframe
function setupIframeCloseListener() {
  const videoElement = document.querySelector('video');
  if (videoElement && !videoElement.hasAttribute('data-iframe-listener')) {
    videoElement.setAttribute('data-iframe-listener', 'true');
    
    videoElement.addEventListener('pause', async (event) => {
      if (justClosedIframe) {
        // console.log('[AdHunt3r] Video pausado después de cerrar iframe, reanudando...');
        
        // Limpiar el flag después de un breve delay
        if (iframeCloseTimeout) {
          clearTimeout(iframeCloseTimeout);
        }
        iframeCloseTimeout = setTimeout(() => {
          justClosedIframe = false;
        }, 800);
        
        // Reanudar reproducción inmediatamente
        await resumeVideoPlayback();
      }
    });
  }
}

// Función para extraer datos usando múltiples selectores
function extraerDatoConSelectores(doc, selectores, nombreCampo) {
  for (const selector of selectores) {
    try {
      let elemento = null;
      
      // Manejar selectores :contains (no estándar en querySelector)
      if (selector.includes(':contains(')) {
        const texto = selector.match(/:contains\("([^"]+)"\)/)?.[1];
        if (texto) {
          const tagName = selector.split(':')[0];
          const elementos = doc.querySelectorAll(tagName);
          for (const el of elementos) {
            if (el.textContent && el.textContent.toLowerCase().includes(texto.toLowerCase())) {
              elemento = el;
              break;
            }
          }
        }
      } else {
        // Selector CSS estándar
        elemento = doc.querySelector(selector);
      }
      
      if (elemento) {
        const texto = elemento.textContent?.trim() || elemento.getAttribute('aria-label') || elemento.getAttribute('title') || '';
        if (texto && texto.length > 0) {
          // console.log(`[AdHunt3r][iframe] ${nombreCampo} encontrado con selector "${selector}": "${texto}"`);
          return texto;
        }
      }
    } catch (error) {
      // console.log(`[AdHunt3r][iframe] Error con selector "${selector}" para ${nombreCampo}:`, error.message);
    }
  }
  
  // console.log(`[AdHunt3r][iframe] No se encontró ${nombreCampo} con ningún selector`);
  return null;
}

// Función para extraer enlaces usando múltiples selectores
function extraerEnlaceConSelectores(doc, selectores, nombreCampo) {
  for (const selector of selectores) {
    try {
      let elemento = null;
      
      // Manejar XPath (si empieza con /)
      if (selector.startsWith('/')) {
        try {
          const result = doc.evaluate(selector, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          elemento = result.singleNodeValue;
        } catch (xpathError) {
          // console.log(`[AdHunt3r] Error con XPath ${selector}:`, xpathError.message);
          continue;
        }
      } else {
        // Manejar selectores CSS normales
        elemento = doc.querySelector(selector);
      }
      
      if (elemento && elemento.tagName === 'A') {
        const href = elemento.getAttribute('href');
        if (href && href.trim().length > 0) {
          // console.log(`[AdHunt3r] Enlace encontrado en ${nombreCampo}:`, href);
          return href;
        }
      }
    } catch (error) {
      // console.log(`[AdHunt3r] Error extrayendo enlace con selector ${selector}:`, error.message);
    }
  }
  return null;
}

function extraerDatosIframeCentroAnuncios() {
  // console.log('[AdHunt3r][iframe] Iniciando extracción optimizada de datos del iframe...');
  
  // Inicializar objeto de datos
  const datos = {
    anunciante: null,
    ubicacion: null,
    link_anunciante: null,
    tema: null,
    marca: null,
    sponsoredBy: null,
    _closedAutomatically: false
  };
  
  // Buscar todos los iframes en la página
  const iframes = document.querySelectorAll('iframe');
  // console.log(`[AdHunt3r][iframe] Encontrados ${iframes.length} iframes`);
  
  // Selectores exactos indicados en selectores.md
  const selectoresOptimizados = {
    anunciante: [
      '#ucj-2 > div:nth-child(2) > div.ieH75d-fmcmS',
      '[data-testid="advertiser-name"]',
      '.advertiser-name'
    ],
    ubicacion: [
      '#ucj-2 > div:nth-child(3) > div.ieH75d-fmcmS',
      '[data-testid="location"]',
      '.location-info'
    ],
    link_anunciante: [
      // XPath específico para el link del anunciante
      '/html/body/c-wiz/div/div[3]/div/div/div/div/div[3]/div/div/div[2]/div[4]/a',
      // Selectores CSS como fallback
      '#ucj-2 > div.ZSvcT-uQPRwe-hSRGPd-haAclf > a',
      'a[href*="googleadservices"]',
      // Selectores genéricos para enlaces
      'a[href*="http"]',
      'a[href*="www"]'
    ],
    tema: [
      '#yDmH0d > c-wiz > div > div:nth-child(3) > div > div > div > div > div:nth-child(3) > div:nth-child(1) > div > div > div > div > div > div:nth-child(1) > div.vuVBLb-J42Xof-V1ur5d-haAclf > div > div.PErocb',
      '[data-testid="ad-topic"]'
    ],
    marca: [
      '#yDmH0d > c-wiz > div > div:nth-child(3) > div > div > div > div > div:nth-child(3) > div:nth-child(1) > div > div > div > div > div > div:nth-child(2) > div.vuVBLb-J42Xof-V1ur5d-haAclf > div.rwCxFc-fmcmS-haAclf > div.PErocb',
      '[data-testid="brand-name"]'
    ],
    sponsoredBy: [
      '#ucj-2 > div:nth-child(7) > div.ieH75d-fmcmS',
      '[data-testid="sponsored-by"]'
    ]
  };
  
  let datosEncontrados = 0;
  let iframesRevisados = 0;
  
  // Revisar cada iframe
  for (let i = 0; i < iframes.length; i++) {
    const iframe = iframes[i];
    iframesRevisados++;
    // console.log(`[AdHunt3r][iframe] Procesando iframe ${i + 1}/${iframes.length}`);
    
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      // console.log(`[AdHunt3r][iframe] Acceso exitoso al documento del iframe ${i + 1}`);
      
      // Extraer datos de cada campo
      let datosEnIframe = 0;
      
      for (const [campo, selectores] of Object.entries(selectoresOptimizados)) {
        if (datos[campo] === null) { // Solo extraer si no se ha encontrado ya
          let valor = null;
          
          // Usar extraerEnlaceConSelectores para link_anunciante
          if (campo === 'link_anunciante') {
            valor = extraerEnlaceConSelectores(iframeDoc, selectores, campo);
          } else {
            valor = extraerDatoConSelectores(iframeDoc, selectores, campo);
          }
          
          if (valor) {
            datos[campo] = valor;
            datosEnIframe++;
            datosEncontrados++;
          }
        }
      }
      
      // console.log(`[AdHunt3r][iframe] Datos encontrados en iframe ${i + 1}: ${datosEnIframe} campos`);
      
      // Contar datos importantes encontrados
      const datosImportantes = Object.values(datos).filter(val => 
        val !== null && 
        val !== '' && 
        typeof val === 'string' && 
        val.trim().length > 0 &&
        !val.includes('google.es') && // Excluir links genéricos de Google
        !val.includes('google.com')
      ).length;
      
      // console.log(`[AdHunt3r][iframe] Datos importantes encontrados: ${datosImportantes}/5`);
      
      // Si encontramos suficientes datos importantes, podemos terminar
      if (datosImportantes >= 3) {
        // console.log(`[AdHunt3r][iframe] Datos suficientes encontrados, terminando búsqueda`);
        break;
      }
      
    } catch (error) {
      // console.log(`[AdHunt3r][iframe] Error accediendo al iframe ${i + 1}: ${error.message}`);
    }
  }
  
  // console.log(`[AdHunt3r][iframe] Extracción completada. Datos encontrados: ${datosEncontrados > 0}`);
  // console.log(`[AdHunt3r][iframe] Datos extraídos:`, datos);
  
  return datos;
}

function findAdCenterButton() {
  // console.log('[AdHunt3r] Iniciando búsqueda del botón del centro de anuncios...');
  
  // NUEVA FASE 1: Usar los selectores XPath exactos
  const exactXPaths = [
    '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[2]/span[2]',
    '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[2]/span[2]/button',
    '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[2]/span[2]/button/span'
  ];
  
  // NUEVA FASE 1: Probar los XPath exactos primero (prioridad alta)
  for (let i = 0; i < exactXPaths.length; i++) {
    const xpath = exactXPaths[i];
    // console.log(`[AdHunt3r] Probando XPath exacto ${i + 1}/${exactXPaths.length}: ${xpath}`);
    
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result.singleNodeValue) {
        // console.log(`[AdHunt3r] ✓ Botón encontrado con XPath exacto ${i + 1}`);
        
        let button = result.singleNodeValue;
        // console.log('[AdHunt3r] Elemento encontrado:', {
        //   tagName: button.tagName,
        //   id: button.id,
        //   className: button.className,
        //   ariaLabel: button.getAttribute('aria-label'),
        //   textContent: button.textContent?.trim()
        // });
        
        // NUEVA FASE 1: Lógica mejorada para encontrar el botón correcto
        if (button.tagName === 'SPAN') {
          // Buscar el botón padre más cercano
          button = button.closest('button');
          if (button) {
            // console.log('[AdHunt3r] ✓ Botón padre encontrado desde span');
          } else {
            // Si no hay botón padre, buscar en el span mismo
            // console.log('[AdHunt3r] No hay botón padre, usando span directamente');
          }
        } else if (button.tagName === 'DIV' || button.tagName === 'SPAN') {
          // Buscar botón hijo
          const childButton = button.querySelector('button');
          if (childButton) {
            button = childButton;
            // console.log('[AdHunt3r] ✓ Botón hijo encontrado');
          } else {
            // console.log('[AdHunt3r] No hay botón hijo, usando elemento directamente');
          }
        }
        
        // NUEVA FASE 1: Verificar que el elemento sea clickeable
        if (button && (button.tagName === 'BUTTON' || button.onclick || button.getAttribute('role') === 'button')) {
          // console.log('[AdHunt3r] ✓ Elemento clickeable encontrado:', {
          //   tagName: button.tagName,
          //   id: button.id,
          //   className: button.className,
          //   ariaLabel: button.getAttribute('aria-label'),
          //   textContent: button.textContent?.trim(),
          //   onclick: !!button.onclick,
          //   role: button.getAttribute('role')
          // });
          return button;
        } else if (button) {
          // console.log('[AdHunt3r] Elemento encontrado pero no es clickeable, buscando botón cercano...');
          // Buscar botón cercano
          const nearbyButton = button.querySelector('button') || button.closest('button');
          if (nearbyButton) {
            // console.log('[AdHunt3r] ✓ Botón cercano encontrado');
            return nearbyButton;
          }
        }
      }
    } catch (e) {
      // console.log(`[AdHunt3r] Error con XPath exacto ${i + 1}:`, e.message);
    }
  }
  
  // NUEVA FASE 1: Lista de selectores CSS mejorada
  const selectors = [
    '#button\\:d',
    'button[id="button:d"]',
    'button[aria-label="Mi centro de anuncios"]',
    'button[aria-label*="centro de anuncios"]',
    '.ytp-ad-button.ytp-ad-button-link[aria-label="Mi centro de anuncios"]',
    '.ytp-ad-button.ytp-ad-button-link[aria-label*="centro de anuncios"]',
    '.ytp-ad-button[aria-label*="centro"]',
    '.ytp-ad-button[aria-label*="anuncios"]',
    // NUEVOS: Selectores más específicos
    '[aria-label*="centro de anuncios"]',
    '[aria-label*="Mi centro de anuncios"]',
    'button[class*="ad"]',
    'button[class*="center"]'
  ];
  
  // Probar cada selector CSS como respaldo
  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    // console.log(`[AdHunt3r] Probando selector CSS ${i + 1}/${selectors.length}: ${selector}`);
    
    try {
      const button = document.querySelector(selector);
      if (button) {
        // console.log(`[AdHunt3r] ✓ Botón encontrado con selector CSS: ${selector}`);
        // console.log(`[AdHunt3r] Botón info:`, {
        //   tagName: button.tagName,
        //   id: button.id,
        //   className: button.className,
        //   ariaLabel: button.getAttribute('aria-label'),
        //   textContent: button.textContent?.trim()
        // });
        return button;
      }
    } catch (e) {
      // console.log(`[AdHunt3r] Error con selector CSS ${selector}:`, e.message);
    }
  }
  
  // NUEVA FASE 1: Buscar en el contenedor del reproductor como último recurso
  // console.log('[AdHunt3r] Buscando en el contenedor del reproductor...');
  const playerContainer = document.querySelector('#movie_player');
  if (playerContainer) {
    // console.log('[AdHunt3r] Contenedor del reproductor encontrado');
    const button = playerContainer.querySelector('button[aria-label*="centro de anuncios"]');
    if (button) {
      // console.log('[AdHunt3r] ✓ Botón encontrado en contenedor del reproductor');
      return button;
  }
  } else {
    // console.log('[AdHunt3r] No se encontró el contenedor del reproductor');
  }
  
  // NUEVA FASE 1: Búsqueda más amplia como último recurso
  // console.log('[AdHunt3r] Búsqueda amplia de botones con "centro" o "anuncios"...');
  const allButtons = document.querySelectorAll('button');
  // console.log(`[AdHunt3r] Total de botones encontrados: ${allButtons.length}`);
  
  for (const button of allButtons) {
    const ariaLabel = button.getAttribute('aria-label') || '';
    const textContent = button.textContent || '';
    
    if (ariaLabel.toLowerCase().includes('centro') && ariaLabel.toLowerCase().includes('anuncios')) {
              // console.log('[AdHunt3r] ✓ Botón encontrado por contenido de texto:', ariaLabel);
      return button;
    }
    
    if (textContent.toLowerCase().includes('centro') && textContent.toLowerCase().includes('anuncios')) {
              // console.log('[AdHunt3r] ✓ Botón encontrado por contenido de texto:', textContent);
      return button;
    }
  }
  
  // console.log('[AdHunt3r] ✗ No se encontró el botón del centro de anuncios');
  return null;
}

function isElementVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.top >= 0 &&
    rect.left >= 0
  );
}

function simulateNaturalClick(element) {
  // NUEVA FASE 1: Comentado logs innecesarios para reducir spam
  // console.log('[AdHunt3r] Simulando click natural en elemento:', element);
  
  if (!element) {
      logger.warn('Elemento nulo para simular click');
  return false;
}

  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

// NUEVA FASE 1: Verificar que el elemento esté en pantalla
if (rect.width === 0 || rect.height === 0) {
  logger.warn('Elemento sin dimensiones, no se puede hacer click');
  return false;
}

// NUEVA FASE 1: Método mejorado con múltiples intentos
let clickSuccess = false;

// Método 1: Eventos de mouse naturales
try {
  const events = ['mousedown', 'mouseup', 'click'];
  events.forEach(eventType => {
    const event = new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0
    });
    element.dispatchEvent(event);
  });
  clickSuccess = true;
} catch (e) {
  logger.warn('Error en eventos de mouse:', e.message);
}

// Método 2: Enfocar y click directo
try {
  if (element.focus) {
    element.focus();
  }
  
  element.click();
  clickSuccess = true;
} catch (e) {
  logger.warn('Error en click directo:', e.message);
}

// Método 3: Si es un span, intentar con el botón padre
if (!clickSuccess && element.tagName === 'SPAN') {
  const parentButton = element.closest('button');
  if (parentButton) {
    try {
      parentButton.click();
      clickSuccess = true;
    } catch (e) {
      logger.warn('Error en click del botón padre:', e.message);
  }
  }
}

// Método 4: Usar coordenadas como último recurso
if (!clickSuccess) {
  try {
    const target = document.elementFromPoint(x, y);
    if (target && target !== element) {
      target.click();
      clickSuccess = true;
      logger.debug('Click exitoso en elemento en coordenadas');
    }
  } catch (e) {
    logger.warn('Error en click por coordenadas:', e.message);
  }
}
  
  return clickSuccess;
}

function simulateClickAtCoordinates(x, y) {
  // console.log('[AdHunt3r] Simulando click en coordenadas:', { x, y });
  const target = document.elementFromPoint(x, y);
  // console.log('[AdHunt3r] Elemento encontrado en coordenadas:', target);
  
  if (target) {
    // Simular secuencia completa de eventos de mouse
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach(eventType => {
      const event = new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
        clientY: y,
        button: 0
    });
      // console.log('[AdHunt3r] Disparando evento:', eventType, 'en elemento:', target.tagName);
      target.dispatchEvent(event);
    });
    
    // Intentar enfocar el elemento
    if (target.focus) {
      target.focus();
    }
  }
}

// Función para crear el observador de progreso del anuncio
function createAdProgressObserver() {
  if (adProgressObserver) {
    adProgressObserver.disconnect();
  }
  
  adProgressObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        // Buscar elementos de progreso del anuncio
        const progressElements = document.querySelectorAll([
          '.ytp-ad-duration-remaining',
          '.ytp-ad-skip-button-text',
          '.ytp-ad-text',
          '.ytp-ad-simple-ad-badge'
        ].join(', '));
        
        progressElements.forEach(element => {
          const text = element.textContent || '';
          const timeMatch = text.match(/(\d+)/);
          if (timeMatch) {
            const remainingTime = parseInt(timeMatch[1]);
            const progressInfo = {
              remainingTime,
              timestamp: Date.now(),
              text: text.trim()
            };
            
            if (adDurationTracker && adDurationTracker.progressUpdates) {
              adDurationTracker.progressUpdates.push(progressInfo);
              // Mantener solo las últimas 10 actualizaciones
              if (adDurationTracker.progressUpdates.length > 10) {
                adDurationTracker.progressUpdates.shift();
              }
            }
          }
        });
      }
    });
  });
  
  // Observar el contenedor del reproductor
  const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  if (playerContainer) {
    adProgressObserver.observe(playerContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'textContent']
    });
  }
}

// Función para iniciar el seguimiento de duración del anuncio
function startAdDurationTracking() {
    
  adDurationTracker = {
    startTime: Date.now(),
    endTime: null,
    realDuration: null,
    progressUpdates: [],
    isTracking: true
  };
  
  createAdProgressObserver();
}

// Función para finalizar el seguimiento y calcular la duración real
function stopAdDurationTracking() {
  if (!adDurationTracker.isTracking) return null;
  
  adDurationTracker.endTime = Date.now();
  adDurationTracker.isTracking = false;
  
  if (adDurationTracker.startTime && adDurationTracker.endTime) {
    adDurationTracker.realDuration = Math.round((adDurationTracker.endTime - adDurationTracker.startTime) / 1000);
  }
  
  if (adProgressObserver) {
    adProgressObserver.disconnect();
    adProgressObserver = null;
  }
  
  return adDurationTracker.realDuration;
}

// Función para obtener la mejor estimación de duración del anuncio
function getBestAdDuration() {
  let duration = 0;
  let isDetected = false;
  let source = 'none';
  
  // 1. Prioridad: Duración real medida por el tracker
  if (adDurationTracker.realDuration && adDurationTracker.realDuration > 0) {
    duration = adDurationTracker.realDuration;
    isDetected = true;
    source = 'real-tracking';
    return { duration, isDetected, source };
  }
  
  // 2. Verificar duración desde el elemento video (cuando estamos en un anuncio)
  const videoElement = document.querySelector('video');
  if (videoElement && !isNaN(videoElement.duration) && videoElement.duration > 0 && videoElement.duration < 300) {
    // Si la duración del video es razonable (menos de 5 minutos), es probablemente la duración del anuncio
    duration = Math.round(videoElement.duration);
    isDetected = true;
    source = 'video-element';
    return { duration, isDetected, source };
  }
  
  // 3. Análisis de las actualizaciones de progreso para inferir duración total
  if (adDurationTracker.progressUpdates.length > 0) {
    const updates = adDurationTracker.progressUpdates;
    
    // Buscar actualizaciones con información de total
    const totalUpdates = updates.filter(u => u.total && u.total > 0);
    if (totalUpdates.length > 0) {
      // Usar la duración total más reciente y consistente
      const latestTotal = totalUpdates[totalUpdates.length - 1].total;
      duration = Math.round(latestTotal);
      isDetected = true;
      source = 'progress-total';
      return { duration, isDetected, source };
    }
    
    // Buscar actualizaciones con countdown de skip
    const skipUpdates = updates.filter(u => u.remainingTime !== undefined);
    if (skipUpdates.length >= 2) {
      // Intentar calcular duración total basada en el countdown
      const firstSkip = skipUpdates[0];
      const lastSkip = skipUpdates[skipUpdates.length - 1];
      const timeDiff = (lastSkip.timestamp - firstSkip.timestamp) / 1000;
      const skipDiff = firstSkip.remainingTime - lastSkip.remainingTime;
      
      if (skipDiff > 0 && timeDiff > 0) {
        // Estimar cuando comenzó el countdown (tiempo total del anuncio)
        const estimatedTotal = firstSkip.remainingTime + (timeDiff * firstSkip.remainingTime / skipDiff);
        if (estimatedTotal > 0 && estimatedTotal < 300) { // Máximo 5 minutos
          duration = Math.round(estimatedTotal);
          isDetected = true;
          source = 'skip-calculation';
          return { duration, isDetected, source };
        }
      }
    }
  }
  
  return { duration: 0, isDetected: false, source: 'none' };
}

// Variables para mantener el contexto del video durante anuncios consecutivos
let lastVideoContextTime = 0;
let lastVideoContextDuration = 0;
let lastVideoContextTimestamp = 0;
let consecutiveAdCount = 0;
let isInAdSequence = false;
    
// Constantes globales para selectores de anuncios (OPTIMIZACIÓN: Evitar duplicación)
const AD_SELECTORS = {
  skipButton: [
      '.ytp-ad-skip-button',
      '.ytp-skip-ad-button', 
      '.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-container .ytp-button',
      '.video-ads .ytp-ad-skip-button',
      'button[class*="skip"]',
      '[class*="skip"][class*="button"]',
      '.videoAdUiSkipButton',
      '.ytp-ad-action-interstitial-skip-button'
  ],
  container: [
      '.video-ads',
      '.ytp-ad-module',
      '.ad-showing',
      '.ytp-ad-overlay-container',
      '.ytp-ad-player-overlay',
      '[class*="ad-"]',
      '.html5-video-container .video-ads'
  ],
  time: [
    '.ytp-ad-duration-remaining',
    '.ytp-ad-simple-ad-badge', 
    '.ytp-ad-text',
    '.ytp-ad-skip-button-text',
    '.ytp-ad-preview-text',
    '.videoAdUiSkipButton',
    '.video-ads .ad-showing .ad-text',
    '.ytp-ad-button-text',
    '.ytp-ad-overlay-text',
    '[class*="ad-duration"]',
    '[class*="ad-time"]'
  ],
  skipText: [
    '.ytp-ad-skip-button-text',
    '.ytp-ad-text',
    '.ytp-ad-skip-button-container',
    '.ytp-ad-action-interstitial-skip-button-text',
    '.videoAdUiSkipButton span',
    '[class*="skip"][class*="text"]'
  ],
  nonSkippable: [
    '.ytp-ad-bumper-image',
    '.video-ads.ad-showing:not(:has(.ytp-ad-skip-button))',
    '.ytp-ad-module:not(:has(.ytp-ad-skip-button))',
    '.ytp-ad-simple-ad-badge',
    '.ytp-ad-text:not(:contains("saltar")):not(:contains("omitir")):not(:contains("skip"))'
  ]
};

// Función para actualizar el contexto del video principal
function updateVideoContext(currentTime, totalDuration) {
  const now = Date.now();
  
  // === NUEVO: Actualizar contexto del video base ===
  const videoElement = document.querySelector('video');
  if (videoElement) {
    // Guardar el tiempo actual del video base
    lastVideoCurrentTime = currentTime;
    lastVideoDuration = totalDuration;
    
    // === NUEVO: Detectar si el video base se pausó por un anuncio ===
    if (videoElement.paused && !isVideoPaused && currentTime > 0) {
      isVideoPaused = true;
      videoPauseTime = currentTime;
      logger.info(`[CONTEXTO] Video base pausado en ${videoPauseTime}s por anuncio`);
    }
    
    // === NUEVO: Detectar si el video base se reanudó ===
    if (!videoElement.paused && isVideoPaused) {
      isVideoPaused = false;
      logger.info(`[CONTEXTO] Video base reanudado después de anuncio`);
    }
  }
  
  // === CORREGIDO: Actualizar contexto global con lógica mejorada ===
  // Para el primer anuncio de una secuencia, siempre actualizar el contexto
  // Para anuncios consecutivos, mantener el contexto del primer anuncio
  if (!isInAdSequence) {
    // No estamos en una secuencia: actualizar normalmente
    lastVideoContextTime = currentTime;
    lastVideoContextDuration = totalDuration;
    lastVideoContextTimestamp = now;
    logger.info(`[CONTEXTO] Contexto de video actualizado (fuera de secuencia): ${currentTime}s / ${totalDuration}s`);
  } else if (consecutiveAdCount === 1) {
    // Primer anuncio de la secuencia: establecer el contexto base
    lastVideoContextTime = currentTime;
    lastVideoContextDuration = totalDuration;
    lastVideoContextTimestamp = now;
    logger.info(`[CONTEXTO] Contexto de video establecido para secuencia: ${currentTime}s / ${totalDuration}s`);
  } else {
    // Anuncios consecutivos: mantener el contexto del primer anuncio
    logger.info(`[CONTEXTO] Manteniendo contexto de secuencia: ${lastVideoContextTime}s / ${lastVideoContextDuration}s`);
  }
}

// Función para iniciar una secuencia de anuncios
function startAdSequence() {
  if (!isInAdSequence) {
    isInAdSequence = true;
    consecutiveAdCount = 0;
    // === NUEVO: Resetear variables al inicio de una nueva secuencia ===
    resetAdDataVariables();
    logger.info('[SECUENCIA] Nueva secuencia de anuncios iniciada, variables reseteadas');
  } else {
    // === NUEVO: Si ya estamos en una secuencia, es un anuncio consecutivo ===
    consecutiveAdCount++;
    // === NUEVO: Resetear variables para el nuevo anuncio consecutivo ===
    resetAdDataVariables();
    logger.info(`[SECUENCIA] Anuncio consecutivo #${consecutiveAdCount}, variables reseteadas para datos frescos`);
  }
}

// Función para finalizar una secuencia de anuncios
function endAdSequence() {
  isInAdSequence = false;
  consecutiveAdCount = 0;
  // === NUEVO: Resetear variables al finalizar secuencia ===
  resetAdDataVariables();
  logger.info('[SECUENCIA] Secuencia de anuncios finalizada, variables reseteadas');
}

// === NUEVA FUNCIÓN: Detectar cambios entre anuncios consecutivos ===
function detectConsecutiveAdChange() {
  const currentAdElements = document.querySelectorAll([
    '.ytp-ad-player-overlay .ytp-ad-text',
    '.ytp-ad-overlay-container .ytp-ad-text',
    '.video-ads .ad-showing .ad-text',
    '[class*="advertiser"]',
    '[class*="sponsor"]'
  ].join(', '));
  
  // Crear un hash del contenido actual del anuncio
  const currentAdContent = Array.from(currentAdElements)
    .map(el => el.textContent?.trim() || '')
    .filter(text => text.length > 0)
    .join('|');
  
  // Si el contenido cambió, es un nuevo anuncio
  if (currentAdContent !== lastAdContent) {
    lastAdContent = currentAdContent;
    if (currentAdContent.length > 0) {
      logger.info('[CONSECUTIVE] Contenido del anuncio cambió, reseteando variables');
      resetAdDataVariables();
      return true;
    }
  }
  
  return false;
}
    
// Función para extraer datos del overlay del anuncio
function extraerDatosOverlayAnuncio() {
  try {
    // === USAR EXACTAMENTE LOS SELECTORES DE selectores2.md ===
    
    // 1. Skip text
    const skipTextSelector = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[3]/div/button/div';
    const skipTextElement = document.evaluate(skipTextSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const skipText = skipTextElement ? (skipTextElement.textContent || skipTextElement.innerText || '').trim() : '';
    
    // 2. Texto anunciante (advertisertext)
    const advertiserTextSelector = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[1]/div/div/div/div[2]';
    const advertiserTextElement = document.evaluate(advertiserTextSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const advertiserText = advertiserTextElement ? (advertiserTextElement.textContent || advertiserTextElement.innerText || '').trim() : '';
    
    // 3. Avatar URL (advertiseravatarurl) - extraer el src
    const advertiserAvatarSelector = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[1]/div/img';
    const advertiserAvatarElement = document.evaluate(advertiserAvatarSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const advertiserAvatarUrl = advertiserAvatarElement ? (advertiserAvatarElement.src || '') : '';
    
    // 4. Cabecera anuncio (adheadline)
    const adHeadlineSelector = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[1]/div/div/div/div[1]';
    const adHeadlineElement = document.evaluate(adHeadlineSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const adHeadline = adHeadlineElement ? (adHeadlineElement.textContent || adHeadlineElement.innerText || '').trim() : '';
    
    // 5. Descripción/link (addescription)
    const adDescriptionSelector = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[2]/div';
    const adDescriptionElement = document.evaluate(adDescriptionSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const adDescription = adDescriptionElement ? (adDescriptionElement.textContent || adDescriptionElement.innerText || '').trim() : '';
    
    // 6. Ad button text
    const adButtonTextSelector = '/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[1]/div[2]/div/div[2]/ytd-player/div/div/div[7]/div/div[1]/div/button/span';
    const adButtonTextElement = document.evaluate(adButtonTextSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const adButtonText = adButtonTextElement ? (adButtonTextElement.textContent || adButtonTextElement.innerText || '').trim() : '';
    
    // Actualizar datos globales
    currentAdData.skipText = skipText;
    currentAdData.advertiserText = advertiserText;
    currentAdData.advertiserAvatarUrl = advertiserAvatarUrl;
    currentAdData.adHeadline = adHeadline;
    currentAdData.adDescription = adDescription;
    currentAdData.adButtonText = adButtonText;
    
    logger.info('Datos del overlay extraídos con selectores específicos:', {
      skipText,
      advertiserText,
      advertiserAvatarUrl,
      adHeadline,
      adDescription,
      adButtonText
    });
    
  } catch (error) {
    logger.warn('Error extrayendo datos del overlay con selectores específicos:', error.message);
  }
}

// Función común para detectar el tipo de anuncio (OPTIMIZACIÓN: Unificar lógica)
function detectAdTypeCommon(extractData = false) {
  // Solo extraer datos del overlay si se solicita explícitamente
  if (extractData) {
    extraerDatosOverlayAnuncio();
  }
  
  // Marcar que estamos en una secuencia de anuncios
  startAdSequence();
  try {
    const player = document.querySelector('#movie_player');
    // OPTIMIZACIÓN: Usar selectores globales
    let skipButton = null;
    for (const selector of AD_SELECTORS.skipButton) {
      skipButton = document.querySelector(selector);
      if (skipButton) break;
    }
    let adContainer = null;
    for (const selector of AD_SELECTORS.container) {
      adContainer = document.querySelector(selector);
      if (adContainer && isElementVisible(adContainer)) break;
    }
    // Detección alternativa si no se encontró contenedor
    if (!adContainer) {
      const adTextElements = document.querySelectorAll('*');
      for (const element of adTextElements) {
        if (element.textContent && element.textContent.toLowerCase().includes('anuncio') && isElementVisible(element)) {
          adContainer = element;
          break;
        }
      }
    }
    let isSkippable = false;
    if (skipButton) isSkippable = true;
    if (skipButton && !isSkippable) {
      const style = window.getComputedStyle(skipButton);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') isSkippable = true;
      }
    if (!isSkippable) {
      const skipTexts = ['skip ad', 'omitir', 'saltar', 'skip in', 'omitir en', 'saltar en'];
      const allText = document.body.innerText.toLowerCase();
      for (const text of skipTexts) {
        if (allText.includes(text)) {
          isSkippable = true;
          break;
        }
      }
    }
    if (!isSkippable) {
      for (const selector of AD_SELECTORS.nonSkippable) {
        if (document.querySelector(selector)) {
          isSkippable = false;
          break;
        }
      }
    }
    let skipText = '';
    if (skipButton) skipText = (skipButton.textContent || skipButton.innerText || '').trim();
    if (!skipText) {
      for (const selector of AD_SELECTORS.skipText) {
        const element = document.querySelector(selector);
        if (element) {
          const text = (element.textContent || element.innerText || '').trim();
          if (text && text.length > 0) {
            skipText = text;
            break;
          }
        }
      }
    }
    if (!isSkippable && skipText) {
      const countdownMatch = skipText.match(/\d+/);
      if (countdownMatch) isSkippable = true;
    }
    let adDuration = 0;
    let durationDetected = false;
    let durationSource = 'none';
    const bestDuration = getBestAdDuration();
    if (bestDuration.duration > 0) {
      adDuration = bestDuration.duration;
      durationDetected = bestDuration.isDetected;
      durationSource = bestDuration.source;
    }
    if (adDuration === 0) {
      for (const selector of AD_SELECTORS.time) {
        const adTimeDisplay = document.querySelector(selector);
        if (adTimeDisplay && !durationDetected) {
          const timeText = adTimeDisplay.textContent || adTimeDisplay.innerText || '';
          const timeMatch = timeText.match(/(\d+):(\d+)|(\d+)s|(\d+)\s*segundos?|\((\d+)s?\)|Ad\s*·?\s*(\d+)s?|Anuncio\s*·?\s*(\d+)s?|(\d+)\s*sec/i);
          if (timeMatch) {
            durationDetected = true;
            durationSource = 'dom-text';
            if (timeMatch[1] && timeMatch[2]) {
              adDuration = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
            } else {
              const duration = parseInt(timeMatch[3] || timeMatch[5] || timeMatch[6] || timeMatch[7] || timeMatch[8]);
              if (duration > 0 && duration < 300) adDuration = duration;
            }
            break;
          }
        }
      }
    }
    if (adDuration === 0) {
      const adProgressBar = document.querySelector('.ytp-ad-progress-list .ytp-progress-list-duration');
      if (adProgressBar) {
        const progressText = adProgressBar.textContent || adProgressBar.innerText || '';
        const progressMatch = progressText.match(/(\d+):(\d+)/);
        if (progressMatch) {
          durationDetected = true;
          durationSource = 'progress-bar';
          adDuration = parseInt(progressMatch[1]) * 60 + parseInt(progressMatch[2]);
        }
      }
    }
    if (adDuration === 0 && skipText) {
      const skipMatch = skipText.match(/(\d+)/);
      if (skipMatch) {
        const remainingTime = parseInt(skipMatch[1]);
        if (remainingTime <= 6) {
          durationDetected = true;
          durationSource = 'skip-inference';
          adDuration = 6;
          if (!isSkippable) isSkippable = true;
        } else if (remainingTime <= 15) {
          durationDetected = true;
          durationSource = 'skip-inference';
          adDuration = 15;
          if (!isSkippable) isSkippable = true;
        } else if (remainingTime <= 20) {
          durationDetected = true;
          durationSource = 'skip-inference';
          adDuration = 20;
          if (!isSkippable) isSkippable = true;
          }
        }
      }
    if (adDuration === 0) {
      durationSource = 'estimation';
      if (!isSkippable && adContainer) {
        adDuration = 6;
        durationDetected = false;
      } else if (isSkippable) {
        adDuration = 30;
        durationDetected = false;
      }
    }
    let adType = 'unknown';
    if (isSkippable) {
      adType = 'skippable';
    } else if (adDuration > 0) {
      if (adDuration <= 6) adType = 'bumper';
      else if (adDuration <= 15) adType = 'non_skippable_short';
      else if (adDuration <= 30) adType = 'non_skippable_medium';
      else adType = 'non_skippable_long';
    } else if (adContainer) {
      adType = 'non_skippable';
    }
    let adPosition = 'unknown';
    const videoElement = document.querySelector('video');
    if (videoElement) {
      let videoCurrentTime = 0;
      let totalDuration = 0;
      let videoProgress = 0;
      if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
        const videoDetails = window.ytInitialPlayerResponse.videoDetails;
        if (videoDetails.lengthSeconds) totalDuration = parseFloat(videoDetails.lengthSeconds);
      }
      const progressBar = cachedQuerySelector('.ytp-progress-bar');
      if (progressBar && progressBar.getAttribute('aria-valuenow') && progressBar.getAttribute('aria-valuemax')) {
        const progress = parseFloat(progressBar.getAttribute('aria-valuenow'));
        const max = parseFloat(progressBar.getAttribute('aria-valuemax'));
        if (!isNaN(progress) && !isNaN(max) && max > 0) {
          videoCurrentTime = progress;
          if (totalDuration === 0) totalDuration = max;
          videoProgress = progress / max;
        }
      }
      if (videoCurrentTime === 0 && window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        const args = window.ytplayer.config.args;
        if (args.t && !isNaN(args.t)) videoCurrentTime = parseFloat(args.t);
      }
      if (videoCurrentTime === 0) {
        const currentTime = videoElement.currentTime || 0;
        const elementDuration = videoElement.duration || 0;
        if (elementDuration > 60) {
        videoCurrentTime = currentTime;
          if (totalDuration === 0) totalDuration = elementDuration;
        }
      }
      if (videoCurrentTime > 0 && totalDuration > 0) updateVideoContext(videoCurrentTime, totalDuration);
      if (consecutiveAdCount > 1 && lastVideoContextTime > 0 && lastVideoContextDuration > 0) {
        videoCurrentTime = lastVideoContextTime;
        totalDuration = lastVideoContextDuration;
        videoProgress = videoCurrentTime / totalDuration;
      }
      const START_TOLERANCE_SEC = 10;
      const END_TOLERANCE_PERCENT = 0.9;
      if (totalDuration > 0) videoProgress = videoCurrentTime / totalDuration;
      // --- NUEVA LÓGICA POST-ROLL ---
      const POSTROLL_TOLERANCE_SEC = 3; // Tolerancia de 3 segundos para final
      if (totalDuration > 0) {
        if (
          (videoElement.ended || Math.abs(videoCurrentTime - totalDuration) < POSTROLL_TOLERANCE_SEC || videoProgress >= END_TOLERANCE_PERCENT)
          && !videoElement.paused // Si está pausado pero no ended, puede ser pre-roll
        ) {
          adPosition = 'post_roll';
        } else if (videoCurrentTime <= START_TOLERANCE_SEC || videoProgress <= 0.05) {
          adPosition = 'pre_roll';
        } else {
          adPosition = 'mid_roll';
        }
      } else {
        if (videoElement.ended || videoCurrentTime >= 300) {
          adPosition = 'post_roll';
        } else if (videoCurrentTime <= START_TOLERANCE_SEC) {
          adPosition = 'pre_roll';
        } else {
          adPosition = 'mid_roll';
        }
      }
    } // <-- CIERRE DEL if (videoElement)
    return {
      type: adType,
      isSkippable: isSkippable,
      duration: adDuration,
      durationDetected: durationDetected,
      durationSource: durationSource,
      position: adPosition,
      skipText: skipText,
      advertiserText: currentAdData.advertiserText,
      advertiserAvatarUrl: currentAdData.advertiserAvatarUrl,
      adHeadline: currentAdData.adHeadline,
      adDescription: currentAdData.adDescription,
      adButtonText: currentAdData.adButtonText,
      consecutiveAdNumber: consecutiveAdCount,
      timestamp: Date.now()
    };
  } catch (e) {
    return { 
      type: 'unknown', 
      isSkippable: false, 
      duration: 0, 
      durationDetected: false,
      durationSource: 'none',
      position: 'unknown',
      skipText: '',
      consecutiveAdNumber: consecutiveAdCount,
      timestamp: Date.now()
    };
  }
}

// Función básica para detectar el tipo de anuncio (SIN extracción de datos)
function detectAdTypeBasic() {
  return detectAdTypeCommon(false);
}

// Función completa para detectar el tipo de anuncio (CON extracción de datos)
function detectAdType() {
  return detectAdTypeCommon(true);
}

let lastMessageSent = 0;
let lastDetectedVideoId = null; // Nueva variable para tracking independiente

// Función para detectar cambios de video por URL
function detectVideoChange() {
  try {
    if (window.location.href.includes('/watch?v=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const videoIdFromUrl = urlParams.get('v');
      if (videoIdFromUrl && videoIdFromUrl.match(/^[\w-]{11}$/) && videoIdFromUrl !== lastDetectedVideoId) {
        lastDetectedVideoId = videoIdFromUrl;
        
        // === NUEVO: Resetear contexto de posición al cambiar video ===
        videoPauseTime = 0;
        isVideoPaused = false;
        lastVideoCurrentTime = 0;
        lastVideoDuration = 0;
        logger.info(`[VIDEO] Cambio de video detectado: ${videoIdFromUrl}, reseteando contexto de posición`);
        
        // Usar requestAnimationFrame para evitar bloquear
        requestAnimationFrame(() => {
          debounce(checkDebugInfoAndAdState, 300, 'debug_check');
        });
      }
    }
      } catch (e) {
    // Ignorar errores
  }
}

// NUEVA FUNCIÓN: Ejecutar extracción completa de datos cuando el usuario lo solicite
function executeFullAdDataExtraction() {
  logger.info('[FASE 2] Ejecutando extracción completa de datos del anuncio...');
  
  try {
    // 0. RESETEAR VARIABLES AL INICIO (CRÍTICO)
    resetAdDataVariables();
    
    // 1. Extraer datos del overlay del anuncio
    logger.info('[FASE 2] Paso 1: Extrayendo datos del overlay del anuncio...');
    marcarDivsDeAnuncio();
    
    // 2. Detectar tipo completo del anuncio
    logger.info('[FASE 2] Paso 2: Detectando tipo del anuncio...');
    
    // === CORREGIDO: Asegurar que se inicie la secuencia de anuncios ===
    if (consecutiveAdCount === 0) {
      startAdSequence();
      logger.info('[FASE 2] Secuencia de anuncios iniciada, consecutiveAdCount = 1');
    } else {
      consecutiveAdCount++;
      logger.info(`[FASE 2] Anuncio consecutivo #${consecutiveAdCount}`);
    }
    
    let adTypeInfo = detectAdType();
    logger.info('[FASE 2] Tipo de anuncio detectado:', adTypeInfo);

    // === NUEVA LÓGICA: Usar información de debug para posición ===
    const videoElement = document.querySelector('video');
    let videoDuration = 0;
    let adStartTime = 0;
    
    if (videoElement) {
      // Prioridad 1: Usar duración capturada al detectar el anuncio
      if (lastVideoContextDuration > 0) {
        videoDuration = lastVideoContextDuration;
      }
      // Prioridad 2: Usar duración actual del video
      else {
      videoDuration = videoElement.duration || 0;
      }
      
      // Prioridad 1: Usar tiempo capturado al detectar el anuncio
      if (videoPauseTime > 0) {
        adStartTime = videoPauseTime;
      }
      // Prioridad 2: Usar tiempo de contexto del video
      else if (lastVideoContextTime > 0) {
        adStartTime = lastVideoContextTime;
      }
      // Prioridad 3: Usar tiempo actual del video
      else {
        adStartTime = videoElement.currentTime || 0;
      }
      }
      
    // === NUEVO: Logging de información de debug usada ===
    logger.info(`[DEBUG] Información de debug usada:`, {
      videoPauseTime,
      lastVideoContextTime,
      lastVideoContextDuration,
      adStartTime,
      videoDuration,
      percentage: videoDuration > 0 && adStartTime > 0 ? (adStartTime / videoDuration * 100).toFixed(1) + '%' : 'N/A'
    });
    
    // === NUEVO: Verificación adicional antes de categorizar ===
    if (adStartTime > 0 && videoDuration > 0) {
      const percentage = (adStartTime / videoDuration) * 100;
      logger.info(`[POSICIÓN] Verificación: ${adStartTime}s / ${videoDuration}s = ${percentage.toFixed(1)}%`);
    
    const posicionAvanzada = detectarPosicionAnuncio(adStartTime, videoDuration);
    adTypeInfo.position = posicionAvanzada;
    
      logger.info(`[POSICIÓN] Posición detectada: ${posicionAvanzada} (tiempo: ${adStartTime}s, duración: ${videoDuration}s, ${percentage.toFixed(1)}%)`);
    } else {
      logger.warn(`[POSICIÓN] Tiempo o duración inválidos: tiempo=${adStartTime}s, duración=${videoDuration}s`);
      adTypeInfo.position = 'unknown';
    }
    
    // 3. Preparar datos combinados con datos FRESCOS del DOM actual
    const extractedData = {
      advertiserText: '',
      advertiserAvatarUrl: '',
      adHeadline: '',
      adDescription: '',
      adButtonText: '',
      adTypeInfo: adTypeInfo
    };
    
    // === NUEVO: Usar la función corregida con selectores específicos ===
    extraerDatosOverlayAnuncio();
    
    // Usar los datos extraídos por la función corregida
    extractedData.skipText = currentAdData.skipText || '';
    extractedData.advertiserText = currentAdData.advertiserText || '';
    extractedData.advertiserAvatarUrl = currentAdData.advertiserAvatarUrl || '';
    extractedData.adHeadline = currentAdData.adHeadline || '';
    extractedData.adDescription = currentAdData.adDescription || '';
    extractedData.adButtonText = currentAdData.adButtonText || '';
    
    // === NUEVO: Logging detallado de los datos extraídos con selectores específicos ===
    logger.info('[SELECTORES ESPECÍFICOS] Datos extraídos:', {
      skipText: extractedData.skipText ? extractedData.skipText.substring(0, 50) + '...' : 'NO ENCONTRADO',
      advertiserText: extractedData.advertiserText ? extractedData.advertiserText.substring(0, 50) + '...' : 'NO ENCONTRADO',
      advertiserAvatarUrl: extractedData.advertiserAvatarUrl ? 'ENCONTRADO' : 'NO ENCONTRADO',
      adHeadline: extractedData.adHeadline ? extractedData.adHeadline.substring(0, 50) + '...' : 'NO ENCONTRADO',
      adDescription: extractedData.adDescription ? extractedData.adDescription.substring(0, 50) + '...' : 'NO ENCONTRADO',
      adButtonText: extractedData.adButtonText || 'NO ENCONTRADO',
      source: 'SELECTORES_ESPECÍFICOS'
    });
    
    // === FALLBACK: Si no se encontraron datos frescos, usar los globales ===
    if (!extractedData.advertiserText && lastAdvertiserText) {
      extractedData.advertiserText = lastAdvertiserText;
      logger.info('[FALLBACK] Usando datos globales para advertiserText');
    }
    if (!extractedData.advertiserAvatarUrl && lastAdvertiserAvatarUrl) {
      extractedData.advertiserAvatarUrl = lastAdvertiserAvatarUrl;
      logger.info('[FALLBACK] Usando datos globales para advertiserAvatarUrl');
    }
    if (!extractedData.adHeadline && lastAdHeadline) {
      extractedData.adHeadline = lastAdHeadline;
      logger.info('[FALLBACK] Usando datos globales para adHeadline');
    }
    if (!extractedData.adDescription && lastAdDescription) {
      extractedData.adDescription = lastAdDescription;
      logger.info('[FALLBACK] Usando datos globales para adDescription');
    }
    if (!extractedData.adButtonText && lastAdButtonText) {
      extractedData.adButtonText = lastAdButtonText;
      logger.info('[FALLBACK] Usando datos globales para adButtonText');
    }
    
    // === NUEVO: Logging detallado de los datos extraídos ===
    logger.info('[EXTRACCIÓN] Datos extraídos del anuncio actual:', {
      advertiserText: extractedData.advertiserText ? extractedData.advertiserText.substring(0, 50) + '...' : 'NO ENCONTRADO',
      adHeadline: extractedData.adHeadline ? extractedData.adHeadline.substring(0, 50) + '...' : 'NO ENCONTRADO',
      adDescription: extractedData.adDescription ? extractedData.adDescription.substring(0, 50) + '...' : 'NO ENCONTRADO',
      adButtonText: extractedData.adButtonText || 'NO ENCONTRADO',
      hasAvatar: !!extractedData.advertiserAvatarUrl,
      source: 'FRESH_DOM'
    });
    
    // 4. Verificar si se extrajeron datos
    const hasData = extractedData.advertiserText || 
                   extractedData.adHeadline || 
                   extractedData.adDescription || 
                   extractedData.adButtonText ||
                   (adTypeInfo && adTypeInfo.type !== 'unknown');
    
    if (hasData) {
      logger.info('[FASE 2] Extracción completada con datos:', {
        advertiserText: extractedData.advertiserText,
        adHeadline: extractedData.adHeadline,
        adDescription: extractedData.adDescription ? extractedData.adDescription.substring(0, 100) + '...' : '',
        adButtonText: extractedData.adButtonText,
        adType: adTypeInfo?.type || 'unknown'
      });
    } else {
      logger.warn('[FASE 2] No se pudieron extraer datos del anuncio');
    }
    
    return extractedData;
    
  } catch (error) {
    logger.error('[FASE 2] Error en extracción completa de datos:', error.message);
    
    // Devolver datos mínimos en caso de error
    return {
      advertiserText: '',
      advertiserAvatarUrl: '',
      adHeadline: '',
      adDescription: '',
      adButtonText: '',
      adTypeInfo: { type: 'unknown', isSkippable: false, duration: 0, position: 'unknown' },
      extractionTimestamp: Date.now(),
      error: error.message
    };
  }
}

// FASE 2: Función mejorada para extraer datos de overlays de anuncios (OPTIMIZADA)
function marcarDivsDeAnuncio() {
  logger.info('[FASE 2] Iniciando extracción de datos del anuncio...');
  
  // NOTA: Las variables ya están reseteadas por executeFullAdDataExtraction
  
  // FASE 2: Selectores originales para detección de overlays de anuncios
  const overlayDetectionSelectors = [
    '.ytp-ad-overlay-container',
    '.ytp-ad-player-overlay',
    '.ytp-ad-overlay-slot',
    '.video-ads.ad-showing',
    '.ytp-ad-module',
    '.ytp-ad-simple-ad-badge',
    '.ytp-ad-text',
    '.ytp-ad-skip-button',
    '.ytp-ad-progress',
    '.ytp-ad-duration-remaining'
  ];
  
  // FASE 2: Verificar si hay overlays de anuncios activos
  let hasActiveOverlay = false;
  let foundOverlaySelector = '';
  
  for (const selector of overlayDetectionSelectors) {
    const overlay = document.querySelector(selector);
    if (overlay && isElementVisible(overlay)) {
      hasActiveOverlay = true;
      foundOverlaySelector = selector;
      logger.info(`[FASE 2] Overlay activo encontrado con selector: ${selector}`);
      break;
    }
  }
  
  // FASE 2: Si no hay overlay activo, intentar detección alternativa
  if (!hasActiveOverlay) {
    logger.warn('[FASE 2] No se encontró overlay con selectores específicos, buscando elementos con texto de anuncio...');
    
    // Buscar elementos con texto relacionado con anuncios
    const adTextElements = document.querySelectorAll('*');
    for (const element of adTextElements) {
      if (element.textContent && element.textContent.toLowerCase().includes('anuncio')) {
        hasActiveOverlay = true;
        logger.info('[FASE 2] Elemento con texto de anuncio encontrado:', element.textContent.substring(0, 100));
        break;
      }
    }
  }
  
  // FASE 2: Solo extraer datos si hay overlay activo
  if (!hasActiveOverlay) {
    logger.warn('[FASE 2] No se encontró overlay activo para extraer datos');
    return;
  }
  
  logger.info(`[FASE 2] Overlay detectado: ${foundOverlaySelector || 'por texto alternativo'}`);
  
  // FASE 2: Selectores originales optimizados con debug
  
  // 1. Texto del enlace del anunciante (selectores originales)
  const advertiserSelectors = [
    '.ytp-visit-advertiser-link__text',
    '.ytp-ad-text',
    '.ytp-ad-simple-ad-badge',
    '.ytp-ad-overlay-text',
    '.ytp-ad-advertiser-name',
    '.ytp-ad-advertiser-text'
  ];
  
  logger.info('[FASE 2] Buscando texto del anunciante...');
  for (const selector of advertiserSelectors) {
    const advertiserEl = document.querySelector(selector);
    if (advertiserEl && advertiserEl.textContent && advertiserEl.textContent.trim()) {
      lastAdvertiserText = advertiserEl.textContent.trim();
      logger.info(`[FASE 2] Texto del anunciante encontrado con selector ${selector}: "${lastAdvertiserText}"`);
      break;
    }
  }

  // 2. Imagen avatar del anunciante (selectores originales)
  const avatarSelectors = [
    '.ytp-ad-avatar--circular',
    '.ytp-ad-avatar img',
    '.ytp-ad-image img',
    '.ytp-ad-overlay-image img',
    '.ytp-ad-thumbnail img'
  ];
  
  logger.info('[FASE 2] Buscando avatar del anunciante...');
  for (const selector of avatarSelectors) {
    const avatarImg = document.querySelector(selector);
    if (avatarImg && avatarImg.src && avatarImg.src.trim()) {
      lastAdvertiserAvatarUrl = avatarImg.src.trim();
      logger.info(`[FASE 2] Avatar del anunciante encontrado con selector ${selector}: "${lastAdvertiserAvatarUrl}"`);
      break;
    }
  }

  // 3. Titular del anuncio (selectores originales)
  const headlineSelectors = [
    '.ytp-ad-avatar-lockup-card__headline',
    '.ytp-ad-headline',
    '.ytp-ad-title',
    '.ytp-ad-text-overlay h2',
    '.ytp-ad-text-overlay h3',
    '.ytp-ad-overlay-title'
  ];
  
  logger.info('[FASE 2] Buscando titular del anuncio...');
  for (const selector of headlineSelectors) {
    const headlineEl = document.querySelector(selector);
    if (headlineEl && headlineEl.textContent && headlineEl.textContent.trim()) {
      lastAdHeadline = headlineEl.textContent.trim();
      logger.info(`[FASE 2] Titular del anuncio encontrado con selector ${selector}: "${lastAdHeadline}"`);
      break;
    }
  }

  // 4. Descripción del anuncio (selectores originales)
  const descSelectors = [
    '.ytp-ad-avatar-lockup-card__description',
    '.ytp-ad-description',
    '.ytp-ad-text-overlay p',
    '.ytp-ad-overlay-description',
    '.ytp-ad-content-text'
  ];
  
  logger.info('[FASE 2] Buscando descripción del anuncio...');
  for (const selector of descSelectors) {
    const descEl = document.querySelector(selector);
    if (descEl && descEl.textContent && descEl.textContent.trim()) {
      lastAdDescription = descEl.textContent.trim();
      logger.info(`[FASE 2] Descripción del anuncio encontrada con selector ${selector}: "${lastAdDescription.substring(0, 100)}..."`);
      break;
    }
  }

  // 5. Texto del botón del anuncio (selectores originales)
  const buttonSelectors = [
    '.ytp-ad-button-vm__text',
    '.ytp-ad-button-text',
    '.ytp-ad-cta-button',
    '.ytp-ad-action-button',
    '.ytp-ad-overlay-button',
    '.ytp-ad-call-to-action'
  ];
  
  logger.info('[FASE 2] Buscando texto del botón del anuncio...');
  for (const selector of buttonSelectors) {
    const btnEl = document.querySelector(selector);
    if (btnEl && btnEl.textContent && btnEl.textContent.trim()) {
      lastAdButtonText = btnEl.textContent.trim();
      logger.info(`[FASE 2] Texto del botón del anuncio encontrado con selector ${selector}: "${lastAdButtonText}"`);
      break;
    }
  }
  
  // FASE 2: Validación y limpieza de datos extraídos
  const extractedData = {
    advertiserText: lastAdvertiserText,
    advertiserAvatarUrl: lastAdvertiserAvatarUrl,
    adHeadline: lastAdHeadline,
    adDescription: lastAdDescription,
    adButtonText: lastAdButtonText
  };
  
  // Limpiar datos de caracteres no deseados
  Object.keys(extractedData).forEach(key => {
    if (extractedData[key] && typeof extractedData[key] === 'string') {
      // Eliminar caracteres de control y espacios múltiples
      extractedData[key] = extractedData[key]
        .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control
        .replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
        .trim();
    }
  });
  
  // === NUEVO: Actualizar variables globales SOLO si se encontraron datos frescos ===
  // Esto evita que se sobrescriban con datos vacíos
  if (extractedData.advertiserText) {
    lastAdvertiserText = extractedData.advertiserText;
  }
  if (extractedData.advertiserAvatarUrl) {
    lastAdvertiserAvatarUrl = extractedData.advertiserAvatarUrl;
  }
  if (extractedData.adHeadline) {
    lastAdHeadline = extractedData.adHeadline;
  }
  if (extractedData.adDescription) {
    lastAdDescription = extractedData.adDescription;
  }
  if (extractedData.adButtonText) {
    lastAdButtonText = extractedData.adButtonText;
  }
  
  logger.info('[FASE 2] Datos extraídos del overlay:', extractedData);
  
  // NUEVO: Intentar extracción alternativa si no se encontraron datos
  if (!lastAdvertiserText && !lastAdHeadline && !lastAdDescription) {
    logger.warn('[FASE 2] No se encontraron datos con selectores específicos, intentando extracción alternativa...');
    
    // Buscar cualquier texto que parezca ser del anuncio
    const allTextElements = document.querySelectorAll('*');
    for (const element of allTextElements) {
      const text = element.textContent?.trim();
      if (text && text.length > 5 && text.length < 1000) { // Aumentado de 200 a 1000
        // Buscar patrones que indiquen que es texto del anuncio
        if (text.toLowerCase().includes('anuncio') || 
            text.toLowerCase().includes('patrocinado') ||
            text.toLowerCase().includes('sponsored') ||
            text.toLowerCase().includes('ad') ||
            text.toLowerCase().includes('publicidad')) {
          
          if (!lastAdvertiserText) {
            lastAdvertiserText = text;
            logger.info(`[FASE 2] Texto alternativo del anunciante encontrado: "${text}"`);
          } else if (!lastAdHeadline) {
            lastAdHeadline = text;
            logger.info(`[FASE 2] Titular alternativo del anuncio encontrado: "${text}"`);
          } else if (!lastAdDescription) {
            lastAdDescription = text;
            logger.info(`[FASE 2] Descripción alternativa del anuncio encontrada: "${text}"`);
          }
          
          if (lastAdvertiserText && lastAdHeadline && lastAdDescription) {
            break; // Ya tenemos suficientes datos
          }
        }
      }
    }
  }
}

// === [TRACKING AVANZADO DE POSICIÓN DE ANUNCIOS] ===
let lastVideoCurrentTime = 0;
let lastVideoDuration = 0;
let lastAdStartTime = 0;
let lastAdEndTime = 0;
let lastAdPosition = 'unknown';
let videoPauseTime = 0; // Momento en que se pausó el video base
let isVideoPaused = false; // Estado de pausa del video base
let videoBaseTime = 0; // Tiempo del video base cuando comenzó la secuencia de anuncios
let adSequenceStartTime = 0; // Tiempo cuando comenzó la secuencia de anuncios

/**
 * Determina la posición del anuncio según el momento en el que aparece en el video.
 * Considera el punto de pausa del video base para categorizar correctamente.
 * Maneja correctamente las secuencias de anuncios consecutivos.
 * @param {number} adStartTime - Momento en segundos en el que inicia el anuncio
 * @param {number} videoDuration - Duración total del video en segundos
 * @returns {string} pre_roll | mid_roll | post_roll
 */
function detectarPosicionAnuncio(adStartTime, videoDuration) {
  if (!videoDuration || videoDuration < 30) {
    return 'unknown';
  }
  
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    return 'unknown';
  }
  
  // === NUEVA LÓGICA: Usar información de debug del reproductor ===
  
  // 1. Obtener tiempo de referencia desde múltiples fuentes
  let referenceTime = 0;
  
  // Prioridad 1: Usar tiempo capturado cuando se detectó el anuncio
  if (videoPauseTime > 0) {
    referenceTime = videoPauseTime;
  }
  // Prioridad 2: Usar tiempo de contexto del video
  else if (lastVideoContextTime > 0) {
    referenceTime = lastVideoContextTime;
  }
  // Prioridad 3: Usar tiempo proporcionado como parámetro
  else if (adStartTime > 0) {
    referenceTime = adStartTime;
  }
  // Prioridad 4: Usar tiempo actual del video
  else {
    referenceTime = videoElement.currentTime || 0;
  }
  
  // 2. Obtener duración del video desde múltiples fuentes
  let finalVideoDuration = videoDuration;
  
  // Si la duración proporcionada es 0, usar la capturada al detectar el anuncio
  if (finalVideoDuration === 0 && lastVideoContextDuration > 0) {
    finalVideoDuration = lastVideoContextDuration;
  }
  // Si aún no hay duración, intentar obtenerla del video actual
  else if (finalVideoDuration === 0) {
    finalVideoDuration = videoElement.duration || 0;
  }
  
  // 3. Verificar si el video ha terminado usando información de debug
  const isVideoEnded = videoElement.ended || videoElement.readyState >= 4;
  
  // 4. Calcular umbrales
  const preRollThreshold = finalVideoDuration * 0.05;
  const postRollThreshold = finalVideoDuration * 0.90;
  
  // 5. Categorización usando información de debug
  const percentage = finalVideoDuration > 0 ? (referenceTime / finalVideoDuration) : 0;
  
  // PRE-ROLL: Primer 5% o tiempo muy bajo
  if (referenceTime <= preRollThreshold || referenceTime <= 10) {
    return 'pre_roll';
  }
  
  // POST-ROLL: Último 10% o video terminado
  if (referenceTime >= postRollThreshold || isVideoEnded || percentage > 0.85) {
    return 'post_roll';
  }
  
  // MID-ROLL: Entre 5% y 90%
  return 'mid_roll';
}