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

// Función optimizada para actualizaciones de UI sin bloquear
function optimizedUIUpdate(updateFunction) {
  return function(...args) {
    requestAnimationFrame(() => {
      const startTime = performance.now();
      updateFunction.apply(this, args);
      const endTime = performance.now();
      
              // Performance monitoring disabled
    });
  };
}

// === [Auto-Click Centro de Anuncios: Toggle en popup] ===
function setupIframeExtractionToggle() {
  chrome.storage.local.get(['iframeExtractionEnabled'], (result) => {
    const iframeToggle = document.getElementById('iframeExtractionToggle');
    if (iframeToggle) {
      const enabled = result.iframeExtractionEnabled !== false; // Habilitado por defecto
      iframeToggle.checked = enabled;
      
      // Enviar el estado inicial al content-script
      chrome.tabs && chrome.tabs.query && chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
      
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'ADHUNT3R_IFRAME_EXTRACTION_SETTING',
            enabled: enabled
          });
        }
      });
      
      iframeToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        chrome.storage.local.set({ iframeExtractionEnabled: enabled });
        chrome.tabs && chrome.tabs.query && chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
        
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'ADHUNT3R_IFRAME_EXTRACTION_SETTING',
              enabled: enabled
            });
          }
        });
        showMsg(enabled ? 'Extracción de datos del iframe habilitada' : 'Extracción de datos del iframe deshabilitada', 'info');
      });
    }
  });
}

// Importar módulos optimizados
import { saveApiKey, getApiKey } from './api/apiKeyStorage.js';
import { storageCache, isValidVideoId, cleanStorageByPattern } from './storage/storageManager.js';
import { videoHandler, adHandler, checkVideoInHistory, checkAdInHistory } from './utils/dataHandlers.js';
import { showMsg, updateCounters, toggleSection, updateButtonState, copyToClipboard, clearElement, updateElement, checkCriticalElements, setLoadingState, setSectionLoadingState, initProgressiveUI, batchDOMUpdates, sanitizeText, escapeHtml, validateApiResponse, validateVideoId, sanitizeStorageKey } from './utils/uiHelpers.js';
import { queryAndSaveData, getCurrentContextData, checkDataInHistory } from './api/apiManager.js';
import { debounceUpdate, hasStateChanged, hasAdStateChanged, setAdStateBox, resetAllStates } from './utils/stateManager.js';
import { checkAndShowStorageAlert, canPerformQuery } from './utils/storageMonitor.js';

// Función optimizada para limpiar datos de depuración
function clearDebugData() {
  // Agrupar manipulaciones DOM para mejor rendimiento
  batchDOMUpdates(() => {
    // Limpia la UI usando funciones optimizadas
    updateElement('debugInfo', 'Visita un video para cargar la info');
    clearElement('ytdata_pre');
    clearElement('ytad_pre');
    updateElement('addebug_videoId', '(no disponible)');
    
    // Oculta secciones relacionadas
    toggleSection('addebug_section', false);
    toggleSection('ytad_section', false);
  });
  
  // Restablece variables globales
  lastDebugVideoId = null;
  lastAdDebugVideoId = null;
  ytDataLoaded = false;
  ytAdDataLoaded = false;
  lastQueriedVideoId = null;
  lastQueriedAdId = null;
  currentAdTypeInfo = null;
  
  // Resetear estados del sistema
  resetAllStates();
  
  updateApiButtons && updateApiButtons();
  
  // Limpia storage local optimizado
  chrome.tabs && chrome.tabs.query && chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    const tabId = tabs[0].id;
    cleanStorageByPattern(new RegExp(`^yt(data|ad)_${tabId}_`));
  });
}

// Variables globales
let lastDebugVideoId = null;
let lastAdDebugVideoId = null;
let apiKeyLoaded = false;
let ytDataLoaded = false;
let ytAdDataLoaded = false;
let lastQueriedVideoId = null;
let lastQueriedAdId = null;
let currentAdTypeInfo = null;

// Función para determinar si estamos en una página de video de YouTube
function isYouTubeVideoPage(response) {
  // Comprobar si hay una URL que contenga "/watch"
  if (response?.debugInfo?.location?.href) {
    return response.debugInfo.location.href.includes('/watch');
  }
  // Comprobar si hay un videoId válido y datos de video
  const videoId = extractVideoId(response, response?.debugInfo);
  const hasVideoDetails = response?.debugInfo?.ytInitialPlayerResponse?.videoDetails;
  
  // NUEVO: Si hay debug_videoId, considerarlo como página de video
  if (response?.debug_videoId && response.debug_videoId.length >= 10) {
    return true;
  }
  
  return validateVideoId(videoId) && hasVideoDetails;
}

// Función optimizada para actualizar botones de API
function updateApiButtons() {
  const elements = {
    ytQueryBtn: document.getElementById('ytQueryBtn'),
    copyYtDataBtn: document.getElementById('copyYtDataBtn'),
    ytAdQueryBtn: document.getElementById('ytAdQueryBtn'),
    copyYtAdDataBtn: document.getElementById('copyYtAdDataBtn'),
    ytdataSection: document.getElementById('ytdata_section'),
    ytadSection: document.getElementById('ytad_section')
  };
  if (!elements.ytQueryBtn || !elements.copyYtDataBtn || !elements.ytAdQueryBtn || 
      !elements.copyYtAdDataBtn || !elements.ytdataSection || !elements.ytadSection) {
    return;
  }

  // Obtener contexto actual para saber si estamos en una página de video
  chrome.runtime.sendMessage({ type: 'GET_DEBUG_INFO' }, (response) => {
    const isVideoPage = isYouTubeVideoPage(response);
    

    batchDOMUpdates(() => {
      // Sección de videos (optimizada)
      if (apiKeyLoaded && isValidVideoId(lastDebugVideoId) && isVideoPage) {
        toggleSection('ytdata_section', true);
        elements.ytQueryBtn.style.display = 'inline-block';
        videoHandler.updateButton(lastDebugVideoId);
      } else {
        toggleSection('ytdata_section', false);
        elements.ytQueryBtn.style.display = 'none';
        updateButtonState('ytQueryBtn', false, 'Consultar datos del video', ['-disabled-ad-btn']);
        clearElement('ytdata_pre');
        elements.copyYtDataBtn.style.display = 'none';
        ytDataLoaded = false;
        lastQueriedVideoId = null;
      }

      // Sección de anuncios (optimizada)
      const currentAdId = response?.addebug_videoId;
      const isAdActive = response?.adActive;
      

      
      if (apiKeyLoaded && isValidVideoId(currentAdId) && isVideoPage && isAdActive) {

        toggleSection('ytad_section', true);
        elements.ytAdQueryBtn.style.display = 'inline-block';
        adHandler.updateButton(currentAdId);
        lastAdDebugVideoId = currentAdId; // Actualizar la variable global
      } else {

        toggleSection('ytad_section', false);
        elements.ytAdQueryBtn.style.display = 'none';
        updateButtonState('ytAdQueryBtn', false, null, ['disabled-ad-btn']);
        clearElement('ytad_pre');
        elements.copyYtAdDataBtn.style.display = 'none';
        ytAdDataLoaded = false;
        lastQueriedAdId = null;
        lastAdDebugVideoId = null; // Limpiar la variable global
      }
    });
  });
}

// Función optimizada para refrescar información de debug y UI
function refreshDebugInfoAndUI() {
  setLoadingState(true);
  const debugInfoEl = document.getElementById('debugInfo');
  const ytdataPre = document.getElementById('ytdata_pre');
  const ytadPre = document.getElementById('ytad_pre');
  const scrollPositions = {
    debug: debugInfoEl?.scrollTop || 0,
    data: ytdataPre?.scrollTop || 0,
    ad: ytadPre?.scrollTop || 0
  };
  
  chrome.runtime.sendMessage({ type: 'GET_DEBUG_INFO' }, (response) => {
    try {
      if (chrome.runtime.lastError) {
        console.warn('[AdHunt3r] Error obteniendo debug info:', chrome.runtime.lastError.message);
        updateElement('debugInfo', 'Error de conexión con el sistema');
        return;
      }
      
      if (!validateApiResponse(response)) {
        updateElement('debugInfo', 'Error: Respuesta inválida del sistema');
        return;
      }
      const debugText = sanitizeText(response?.debugText || '');
      const debugInfo = response?.debugInfo || {};
      let debug_videoId = extractVideoId(response, debugInfo);
      // Verificar si estamos en una página de video de YouTube
      const isVideoPage = isYouTubeVideoPage(response);
      if (!validateVideoId(debug_videoId) || !isVideoPage || Object.keys(debugInfo).length === 0) {
        clearDebugData();
        updateElement('debugInfo', 'Visita un video para cargar la info');
        return;
      }
      
      // Mostrar tanto el debugText como todos los datos estructurados del debugInfo
      let fullDebugContent = debugText;
      if (Object.keys(debugInfo).length > 0) {
        fullDebugContent += '\n\n\n=== DATOS COMPLETOS DE DEBUG ===\n';
        fullDebugContent += JSON.stringify(debugInfo, null, 2);
      }
      
      updateElement('debugInfo', fullDebugContent);
      const videoChanged = lastDebugVideoId !== debug_videoId;
      if (videoChanged) {
        handleVideoChange(debug_videoId);
      }
      
      // Actualizar información del anuncio si está disponible
      const addebug_videoId = response?.addebug_videoId;
      const adActive = response?.adActive;
      

      
      if (adActive && addebug_videoId) {

        handleAdChange(addebug_videoId);
      updateAdState(response);
      } else {

        // Limpiar información de anuncio si no hay anuncio activo
        updateElement('addebug_videoId', '(no disponible)');
        toggleSection('addebug_section', false);
        toggleSection('ytad_section', false);
        lastAdDebugVideoId = null;
        ytAdDataLoaded = false;
        lastQueriedAdId = null;
        currentAdTypeInfo = null;
      }
      
      // Restaurar posiciones de scroll
      restoreScrollPositions(scrollPositions);
      
      // Actualizar botones de API
      updateApiButtons();
      
      setLoadingState(false);
    } catch (error) {
      console.error('[AdHunt3r] Error en refreshDebugInfoAndUI:', error);
      updateElement('debugInfo', 'Error procesando datos de debug');
      setLoadingState(false);
    }
  });
}

// Función auxiliar para extraer videoId
function extractVideoId(response, debugInfo) {
  if (response?.debug_videoId) {
    return response.debug_videoId;
  }
  if (debugInfo?.debug_videoId) {
    return debugInfo.debug_videoId;
  }
  if (debugInfo?.ytInitialPlayerResponse?.videoDetails?.videoId) {
    return debugInfo.ytInitialPlayerResponse.videoDetails.videoId;
  }
  return null;
}

// Función para manejar cambios de video
function handleVideoChange(debug_videoId) {
  videoHandler.clearData();
  
  // Verificar si el nuevo video está en el historial
  checkVideoInHistory(debug_videoId, (inHistory, existingData) => {
    if (inHistory && existingData?.data) {
      updateElement('ytdata_pre', existingData.data, true);
      const copyButton = document.getElementById('copyYtDataBtn');
      if (copyButton) copyButton.style.display = 'inline-block';
      ytDataLoaded = true;
      lastQueriedVideoId = debug_videoId;
    }
    
    lastDebugVideoId = debug_videoId;
    updateApiButtons();
  });
}

// Función para manejar cambios de anuncio
function handleAdChange(addebug_videoId) {

  adHandler.clearData();
  
  if (isValidVideoId(addebug_videoId)) {

    checkAdInHistory(addebug_videoId, (inHistory, existingData) => {
      
      if (inHistory && existingData?.data) {
        updateElement('ytad_pre', existingData.data, true);
        const copyButton = document.getElementById('copyYtAdDataBtn');
        if (copyButton) copyButton.style.display = 'inline-block';
        ytAdDataLoaded = true;
        lastQueriedAdId = addebug_videoId;
      }
      updateApiButtons();
    });
  } else {

    updateApiButtons();
  }
}

// Función para actualizar estado del anuncio
function updateAdState(response) {

  
  let adActive = false;
  let addebugId = response?.addebug_videoId;
  
  if (addebugId || response?.adActive) {
    adActive = true;
  }
  

  
  setAdStateBox(adActive, addebugId);
  
  // Actualizar elemento addebug_videoId
  const addebugVideoIdEl = document.getElementById('addebug_videoId');
  const addebugSectionEl = document.getElementById('addebug_section');
  

  
  if (addebugVideoIdEl) {
    if (addebugId && addebugId !== '(no disponible)') {

      addebugVideoIdEl.textContent = addebugId;
      toggleSection('addebug_section', true);
      toggleSection('ytad_section', true); // Mostrar también la sección de consulta
      
      // NUEVO: Forzar actualización de botones de API después de mostrar la sección
      setTimeout(() => {
        updateApiButtons();
      }, 100);
    } else {

      addebugVideoIdEl.textContent = '(no disponible)';
      toggleSection('addebug_section', false);
      toggleSection('ytad_section', false);
    }
  } else {

  }
}

// Función para restaurar posiciones de scroll
function restoreScrollPositions(positions) {
  const elements = {
    debugInfo: document.getElementById('debugInfo'),
    ytdata_pre: document.getElementById('ytdata_pre'),
    ytad_pre: document.getElementById('ytad_pre')
  };
  
  if (elements.debugInfo) elements.debugInfo.scrollTop = positions.debug;
  if (elements.ytdata_pre) elements.ytdata_pre.scrollTop = positions.data;
  if (elements.ytad_pre) elements.ytad_pre.scrollTop = positions.ad;
}

// === Modo claro/oscuro ===
function applyColorMode(mode) {
  if (mode === 'dark') {
    document.body.classList.add('darkmode');
    document.documentElement.classList.add('darkmode');
  } else {
    document.body.classList.remove('darkmode');
    document.documentElement.classList.remove('darkmode');
  }
}

function getColorMode() {
  // Usar clave específica para el popup
  return localStorage.getItem('adhunt3r_popup_color_mode') || 'light';
}

function setColorMode(mode) {
  localStorage.setItem('adhunt3r_popup_color_mode', mode);
  applyColorMode(mode);
}

function setupColorModeToggle() {
  const toggle = document.getElementById('colorModeToggle');
  if (!toggle) return;
  let mode = getColorMode();
  if (mode !== 'dark' && mode !== 'light') mode = 'light';
  applyColorMode(mode);
  toggle.checked = (mode === 'dark');
  toggle.addEventListener('change', () => {
    const newMode = toggle.checked ? 'dark' : 'light';
    setColorMode(newMode);
    // Sincronizar con el historial si está abierto (opcional)
    try {
      chrome.runtime.sendMessage({ type: 'ADHUNT3R_COLOR_MODE', mode: newMode });
    } catch {}
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar UI progresiva
  initProgressiveUI();
  
  // Verificar elementos críticos
  const requiredIds = [
    'ytQueryBtn', 'copyYtDataBtn', 'ytAdQueryBtn', 'copyYtAdDataBtn',
    'ytdata_section', 'ytad_section', 'ytdata_pre', 'ytad_pre',
    'apiKeyInput', 'saveApiKeyBtn', 'toggleApiKeyBtn', 'ad_state',
    'debugInfo', 'copyAllBtn', 'addebug_section', 'addebug_videoId',
    'resetCountersBtn'
  ];

  if (!checkCriticalElements(requiredIds)) {
    return;
  }

  // Inicializar contadores
  updateCounters();

  // Configurar botones optimizados
  setupEventListeners();

  // Configurar sistema de refresco optimizado
  setupRefreshSystem();

  // Configurar API key
  setupApiKeyHandling();

  // Refresco inicial
  // Configurar toggle de auto-click
  setupIframeExtractionToggle();
  refreshDebugInfoAndUI();
  
  // NUEVO: Aplicar modo de color al cargar la página
  const currentMode = getColorMode();
  applyColorMode(currentMode);
  setupColorModeToggle();
});

// Función para configurar todos los event listeners
function setupEventListeners() {
  // Botón para copiar datos de debug info
  const copyAllBtn = document.getElementById('copyAllBtn');
  if (copyAllBtn) {
    copyAllBtn.onclick = () => {
      const debugInfo = document.getElementById('debugInfo');
      copyToClipboard(debugInfo?.textContent, '¡Debug info copiada!');
    };
  }

  // Botones de consulta API optimizados
  setupApiQueryButtons();

  // Botones de copia optimizados
  setupCopyButtons();

  // Botón de historial
  const openHistoryBtn = document.getElementById('openHistoryBtn');
  if (openHistoryBtn) {
    openHistoryBtn.onclick = () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup/history/history.html') });
    };
  }

  // Botón de reset
  setupResetButton();
}

// Función para configurar botones de consulta API
function setupApiQueryButtons() {
  // Botón de consulta de video
  const ytQueryBtn = document.getElementById('ytQueryBtn');
  if (ytQueryBtn) {
    ytQueryBtn.onclick = async () => {
      await handleDataQuery('video');
    };
  }

  // Botón de consulta de anuncio
  const ytAdQueryBtn = document.getElementById('ytAdQueryBtn');
  if (ytAdQueryBtn) {
    ytAdQueryBtn.onclick = async () => {
      await handleDataQuery('ad');
    };
  }
}

// Función unificada para manejar consultas de datos
async function handleDataQuery(type) {
  const isAd = type === 'ad';
  const preId = isAd ? 'ytad_pre' : 'ytdata_pre';
  const loadedKey = isAd ? 'ytAdDataLoaded' : 'ytDataLoaded';
  const queriedKey = isAd ? 'lastQueriedAdId' : 'lastQueriedVideoId';
  const sectionId = isAd ? 'ytad_section' : 'ytdata_section';
  
  // Verificar almacenamiento antes de proceder
  const canQuery = await canPerformQuery();
  if (!canQuery) {
    updateElement(preId, 'Almacenamiento lleno. Elimina consultas del historial para continuar.');
    setSectionLoadingState(sectionId, false);
    showMsg('No se pueden realizar más consultas. Almacenamiento crítico.', 'error');
    return;
  }
  
  // Activar estado de carga
  setSectionLoadingState(sectionId, true);
  
  // Limpiar estado anterior
  window[loadedKey] = false;
  window[queriedKey] = null;
  updateElement(preId, 'Consultando...', true);
  updateApiButtons();

  try {
    // Obtener datos del contexto actual
    const contextData = await getCurrentContextData();
    if (!contextData) {
      updateElement(preId, 'No hay contexto disponible.');
      setSectionLoadingState(sectionId, false);
      return;
    }

    const videoId = sanitizeText(isAd ? contextData.addebug_videoId : contextData.debug_videoId);
    
    // Para anuncios, también necesitamos el debug_videoId del video donde aparece
    const debug_videoId = sanitizeText(contextData.debug_videoId);
    
    if (!validateVideoId(videoId)) {
      updateElement(preId, `No hay ${isAd ? 'anuncio' : 'video'} válido.`);
      setSectionLoadingState(sectionId, false);
      return;
    }

    // Verificar historial primero
    const historyCheck = await checkDataInHistory(videoId, type);
    if (historyCheck.inHistory && historyCheck.data?.data) {
      updateElement(preId, historyCheck.data.data, true);
      const copyButton = document.getElementById(isAd ? 'copyYtAdDataBtn' : 'copyYtDataBtn');
      if (copyButton) copyButton.style.display = 'inline-block';
      
      window[loadedKey] = true;
      window[queriedKey] = videoId;
      updateApiButtons();
      
      // Mensaje específico según la fuente
      const message = historyCheck.source === 'history' ? 
        '¡Datos recuperados del historial!' : 
        '¡Datos recuperados del historial!';
      showMsg(message);
      
      setSectionLoadingState(sectionId, false);
      return;
    }

    // Consultar API
    let additionalData = isAd ? contextData.adTypeInfo : null;
    
    // Si es un anuncio, extraer datos del overlay del anuncio
    if (isAd) {
  
      try {
        const tabs = await new Promise(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        if (tabs && tabs[0]) {

          const adData = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {

              resolve(null);
            }, 3000); // Reducir de 10s a 3s
            
            chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRAER_DATOS_ANUNCIO' }, (response) => {
              clearTimeout(timeout);

              if (chrome.runtime.lastError) {
                console.warn('[AdHunt3r] Error en comunicación:', chrome.runtime.lastError.message);
                resolve(null);
              } else {
                resolve(response && response.advertiserText ? response : null);
              }
            });
          });
          if (adData) {
            additionalData = { ...additionalData, ...adData };

          } else {

          }
        }
      } catch (error) {
        console.error('[AdHunt3r] Error extrayendo datos del anuncio:', error);
      }
      
      // Extraer datos del iframe si está habilitado
      const iframeExtractionEnabled = await new Promise(resolve => {
        chrome.storage.local.get(['iframeExtractionEnabled'], (result) => {
          resolve(result.iframeExtractionEnabled !== false);
        });
      });
      if (iframeExtractionEnabled) {

        try {
          const tabs = await new Promise(resolve => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
          });
          if (tabs && tabs[0]) {

            const iframeData = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {

                resolve(null);
              }, 5000); // Reducir de 10s a 5s
              
              chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRAER_DATOS_IFRAME' }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                  console.warn('[AdHunt3r] Error en comunicación con content-script:', chrome.runtime.lastError.message);
                  resolve(null);
                } else if (response && response._adhunt3r_data) {

                  resolve(response);
                } else {

                  resolve(null);
                }
              });
            });
            
            if (iframeData && iframeData._adhunt3r_data && iframeData._adhunt3r_data.sponsorinfo) {
              // NUEVO: Verificar que iframeData tenga la estructura correcta y sponsorinfo válido

              
              // Crear la estructura correcta para el JSON final
              const combinedData = {
                _adhunt3r_data: iframeData._adhunt3r_data
              };
              

              
              // Consultar API con datos combinados
              const result = await queryAndSaveData(videoId, 'ad', combinedData, debug_videoId);
              
              if (result.success) {
                const copyButton = document.getElementById(isAd ? 'copyYtAdDataBtn' : 'copyYtDataBtn');
                if (copyButton) copyButton.style.display = 'inline-block';
                
                window[loadedKey] = true;
                window[queriedKey] = videoId;
                updateApiButtons();
                showMsg('¡Consulta exitosa!', 'success');
              }
            } else {
              // console.warn('[AdHunt3r] No se obtuvieron datos válidos del iframe:', {
              //   iframeData: iframeData,
              //   hasAdhunt3rData: !!iframeData?._adhunt3r_data,
              //   hasSponsorInfo: !!iframeData?._adhunt3r_data?.sponsorinfo,
              //   sponsorInfoKeys: iframeData?._adhunt3r_data?.sponsorinfo ? Object.keys(iframeData._adhunt3r_data.sponsorinfo) : []
              // });
              showMsg('No se pudieron extraer datos del centro de anuncios. Intenta de nuevo.', 'error');
              setSectionLoadingState(sectionId, false);
              return;
            }
          }
        } catch (error) {
          console.error('[AdHunt3r] Error extrayendo datos del iframe:', error);
        }
      } else {

        
        // Si la extracción de iframe está deshabilitada, consultar solo con datos del anuncio
        const adOnlyData = {
          _adhunt3r_data: {
            adtypeinfo: additionalData?.adTypeInfo || null,
            sponsorinfo: null,
            extractionTimestamp: Date.now()
          }
        };
        
        const result = await queryAndSaveData(videoId, 'ad', adOnlyData, debug_videoId);
        
        if (result.success) {
          const copyButton = document.getElementById(isAd ? 'copyYtAdDataBtn' : 'copyYtDataBtn');
          if (copyButton) copyButton.style.display = 'inline-block';
          
          window[loadedKey] = true;
          window[queriedKey] = videoId;
          updateApiButtons();
          showMsg('¡Consulta exitosa! (sin datos del iframe)', 'success');
        }
      }
    } else {
      // Si no es un anuncio, consultar normalmente
    const result = await queryAndSaveData(videoId, type, additionalData, debug_videoId);
    
    if (result.success) {
      const copyButton = document.getElementById(isAd ? 'copyYtAdDataBtn' : 'copyYtDataBtn');
      if (copyButton) copyButton.style.display = 'inline-block';
      
      window[loadedKey] = true;
      window[queriedKey] = videoId;
      updateApiButtons();
      showMsg('¡Consulta exitosa!', 'success');
      }
    }
    
  } catch (error) {
    updateElement(preId, 'Error al consultar la API');
    window[loadedKey] = false;
    updateApiButtons();
    showMsg(`Error: ${error.message}`, 'error');
  } finally {
    // Desactivar estado de carga
    setSectionLoadingState(sectionId, false);
  }
}

// Función para configurar el sistema de refresco optimizado
function setupRefreshSystem() {
  // Variables para el control de actualizaciones
  let counterUpdateCount = 0;
  let debugRefreshInterval;
  let lastCounterUpdate = 0;

  // Función optimizada para refrescar la UI con debounce
  function refreshOptimized() {
    debounce(() => {
      chrome.runtime.sendMessage({ type: 'GET_DEBUG_INFO' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[AdHunt3r] Error en refresh:', chrome.runtime.lastError.message);
          return;
        }
        
        const generalStateChanged = hasStateChanged(response);
        const adStateChanged = hasAdStateChanged(response);
        
        if (generalStateChanged) {
          refreshDebugInfoAndUI();
        } else if (adStateChanged) {
          // Solo actualizar el marcador de anuncio si cambió
          let adActive = false;
          let addebugId = response?.addebug_videoId;
          if (addebugId && addebugId !== response?.debug_videoId) {
            adActive = true;
          }
          setAdStateBox(adActive, addebugId);
        }
      });
    }, 200, 'refresh_optimized');
  }

  // Función optimizada para actualizar contadores
  function updateCountersOptimized() {
    const now = Date.now();
    // Solo actualizar contadores si han pasado al menos 3 segundos
    if (now - lastCounterUpdate > 3000) {
      debounce(() => {
        updateCounters();
        lastCounterUpdate = now;
      }, 100, 'update_counters');
    }
  }

  // Refresco inteligente optimizado (2000ms en lugar de 3000ms)
  debugRefreshInterval = setInterval(() => {
    refreshOptimized();
    
    // Actualizar contadores con menos frecuencia (cada 4 segundos)
    if (++counterUpdateCount >= 2) {
      updateCountersOptimized();
      counterUpdateCount = 0;
    }
  }, 2000);

  // Limpiar intervalo cuando el popup se oculta
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      clearInterval(debugRefreshInterval);
    }
  });

  // Refresco inicial cuando cambia la pestaña activa
  if (chrome.tabs?.onActivated) {
    chrome.tabs.onActivated.addListener(() => {
      debounce(refreshDebugInfoAndUI, 100, 'tab_activated');
    });
  }
}

// Función para configurar el manejo de API key
function setupApiKeyHandling() {
  // Cargar clave de API guardada
  getApiKey().then((key) => {
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.value = key || '';
      input.type = 'password'; // Siempre oculto
      apiKeyLoaded = !!key;
      updateApiButtons();
    }
  });

  // Forzar siempre type=password aunque el usuario escriba
  const apiKeyInput = document.getElementById('apiKeyInput');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', (e) => {
      e.target.type = 'password';
    });
  }

  // Mostrar/ocultar clave de API temporalmente
  const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
  if (toggleApiKeyBtn) {
    toggleApiKeyBtn.onclick = () => {
      const input = document.getElementById('apiKeyInput');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          setTimeout(() => { input.type = 'password'; }, 2000); // Solo visible 2s
        } else {
          input.type = 'password';
        }
      }
    };
  }

  // Guardar clave de API
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  if (saveApiKeyBtn) {
    saveApiKeyBtn.onclick = () => {
      const input = document.getElementById('apiKeyInput');
      const status = document.getElementById('apiKeyStatus');
      
      if (input && status) {
        const key = input.value.trim();
        saveApiKey(key).then(() => {
          status.textContent = '¡Guardada!';
          setTimeout(() => {
            status.textContent = '';
          }, 1200);
          apiKeyLoaded = !!key;
          refreshDebugInfoAndUI();
        });
      }
    };
  }
}

// Listener optimizado para actualizaciones en tiempo real de contadores
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AD_COUNT_UPDATED') {
    debounce(() => {
    updateCounterDisplay('ad_count_24h', message.count);
    }, 100, 'ad_count_update');
  } else if (message.type === 'VIDEO_COUNT_UPDATED') {
    debounce(() => {
    updateCounterDisplay('video_count_24h', message.count);
    }, 100, 'video_count_update');
  }
});

// Función auxiliar optimizada para actualizar display de contador
function updateCounterDisplay(counterId, value) {
  requestAnimationFrame(() => {
    const el = document.getElementById(counterId);
    if (el) {
      const valueEl = el.querySelector('.counter-value');
      if (valueEl) valueEl.textContent = value;
    }
  });
}

// Función para configurar el botón de reset optimizada
function setupResetButton() {
  const resetCountersBtn = document.getElementById('resetCountersBtn');
  if (resetCountersBtn) {
    resetCountersBtn.onclick = () => {
      // Sustituir confirm por un toast de confirmación simple
      showMsg('¿Estás seguro de que quieres resetear los contadores de las últimas 24h? Esto no afecta el historial de consultas API.', 'info');
      // Si se quiere un confirm real, habría que implementar un toast interactivo, pero por ahora solo informativo.
      chrome.runtime.sendMessage({ type: 'RESET_COUNTERS' }, (response) => {
        if (response?.success) {
          debounce(() => {
            updateCounterDisplay('ad_count_24h', '0');
            updateCounterDisplay('video_count_24h', '0');
            showMsg('¡Contadores reseteados!');
            setTimeout(() => {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs?.[0]?.id) {
                  chrome.tabs.sendMessage(tabs[0].id, { type: 'FORCE_DEBUG_INFO' });
                }
                setTimeout(() => {
                  debounce(updateCounters, 400, 'update_counters_after_reset');
                }, 200);
              });
            }, 200);
          }, 100, 'reset_counters');
        } else {
          showMsg('Error al resetear contadores', 'error');
        }
      });
    };
  }
}

// Función optimizada para configurar botones de copia
function setupCopyButtons() {
  const copyYtDataBtn = document.getElementById('copyYtDataBtn');
  if (copyYtDataBtn) {
    copyYtDataBtn.onclick = () => {
      const pre = document.getElementById('ytdata_pre');
      copyToClipboard(pre?.textContent, '¡Datos del video copiados!');
    };
  }

  const copyYtAdDataBtn = document.getElementById('copyYtAdDataBtn');
  if (copyYtAdDataBtn) {
    copyYtAdDataBtn.onclick = () => {
      const pre = document.getElementById('ytad_pre');
      copyToClipboard(pre?.textContent, '¡Datos del anuncio copiados!');
    };
  }
}

// Función para verificar almacenamiento al abrir el popup
async function checkStorageOnPopupOpen() {
  try {
    await checkAndShowStorageAlert('storageAlert');
  } catch (error) {
    console.warn('[AdHunt3r] Error verificando almacenamiento:', error);
  }
}

// Inicialización del popup con verificación de almacenamiento
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar almacenamiento al abrir el popup
  await checkStorageOnPopupOpen();
  
  // Resto de inicialización...
  setupEventListeners();
  setupApiQueryButtons();
  setupRefreshSystem();
  setupApiKeyHandling();
  setupResetButton();
  setupCopyButtons();
  setupIframeExtractionToggle();
  setupColorModeToggle();
  refreshDebugInfoAndUI();
  updateCounters();
});
