// Módulo para gestión de consultas API de YouTube
// Optimizado para unificar consultas de videos y anuncios

import { storageCache, isValidVideoId, saveToHistory } from '../storage/storageManager.js';
import { showMsg } from '../utils/uiHelpers.js';
import { getApiKey } from './apiKeyStorage.js';

// NUEVA FASE 1: Función para crear datos de debug optimizados
// Función para convertir duración ISO 8601 a segundos
function parseDurationToSeconds(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

function createOptimizedDebugData(debugData) {
  if (!debugData || Object.keys(debugData).length === 0) {
    return null;
  }

  // === NUEVO: Asegurar que el video_id sea el correcto ===
  const videoId = debugData.debug_videoId || debugData.video_id || null;
  
  const slimDbg = {
    video_id: videoId,
    timestamp: new Date().toISOString()
  };

  // NUEVA FASE 1: Solo incluir campos críticos de videoDetails (reducir de ~50KB a ~2KB)
  if (debugData.ytInitialPlayerResponse?.videoDetails) {
    const vd = debugData.ytInitialPlayerResponse.videoDetails;
    
    // === NUEVO: Verificar que el videoId de videoDetails coincida con el debug_videoId ===
    if (vd.videoId && vd.videoId !== videoId) {
      console.warn(`[AdHunt3r] Inconsistencia detectada: videoDetails.videoId (${vd.videoId}) no coincide con debug_videoId (${videoId})`);
    }
    
    slimDbg.video_details = {
      videoId: videoId, // Usar el videoId correcto
      title: vd.title?.substring(0, 200) || null, // Limitar título a 200 chars
      lengthSeconds: vd.lengthSeconds,
      channelId: vd.channelId,
      isLiveContent: vd.isLiveContent,
      viewCount: vd.viewCount
      // ELIMINADOS: description, thumbnail, keywords, etc. (son muy grandes)
    };
  } else if (videoId) {
    // === NUEVO: Manejar caso donde no hay ytInitialPlayerResponse pero sí debug_videoId ===
    slimDbg.video_details = {
      videoId: videoId,
      title: `Video ${videoId}`,
      lengthSeconds: 0,
      channelId: '',
      isLiveContent: false,
      viewCount: 0
    };
  }

  // === NUEVO: Verificar que el video_id coincida con el video actual ===
  if (slimDbg.video_id && slimDbg.video_details && slimDbg.video_details.videoId !== slimDbg.video_id) {
    console.warn('[AdHunt3r] Inconsistencia en video_id, usando el del contexto actual');
    slimDbg.video_id = slimDbg.video_details.videoId;
  }

  // NUEVA FASE 1: Verificar tamaño del objeto debug resultante
  const debugSize = JSON.stringify(slimDbg).length;
  if (debugSize > 10000) { // 10KB límite para datos debug
    console.warn('[AdHunt3r] Datos debug demasiado grandes, usando versión mínima');
    return {
      video_id: slimDbg.video_id,
      timestamp: slimDbg.timestamp
      // Eliminar video_details si excede el límite
    };
  }

  return slimDbg;
}

// Función genérica para realizar consultas API (unificada para videos y anuncios)
export async function queryYouTubeAPI(videoId, type = 'video', additionalData = null, debugData = null) {
  try {
  const apiKey = await getApiKey();
  if (!apiKey) {
      throw new Error('No se ha configurado la clave de API de YouTube');
  }
  
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics,status,topicDetails&key=${apiKey}`;
    

  
  const response = await fetch(url);
  if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('No se encontró el video en YouTube');
    }
    
    // === NUEVO: Extraer categoría de topicDetails.topicCategories ===
    let detectedCategory = null;
    if (data.items[0]?.topicDetails?.topicCategories) {
      const topicCategories = data.items[0].topicDetails.topicCategories;
      if (topicCategories && topicCategories.length > 0) {
        // Extraer el nombre de la categoría de la URL de Wikipedia
        const categories = topicCategories.map(url => {
          const match = url.match(/\/wiki\/(.+)$/);
          return match ? decodeURIComponent(match[1].replace(/_/g, ' ')) : url;
        });
        detectedCategory = categories.join(', ');

      }
    }
    
    // Combinar datos
    const combinedData = { ...data };
    
    // Si hay datos adicionales (para anuncios), integrarlos
    if (additionalData && type === 'ad') {
      // === CORREGIDO: Obtener debug_videoId del contexto actual para anuncios ===
      let debug_videoId = null;
      if (debugData && debugData.debug_videoId) {
        debug_videoId = debugData.debug_videoId;
      } else {
        // === NUEVO: Si no hay debugData, intentar obtener el contexto actual ===
        try {
          const contextData = await getCurrentContextData();
          if (contextData && contextData.debug_videoId) {
            debug_videoId = contextData.debug_videoId;
          }
        } catch (e) {
          console.warn('[AdHunt3r] No se pudo obtener contexto para anuncio:', e);
        }
      }
      
      // Si additionalData ya tiene estructura _adhunt3r_data, usarla directamente
      if (additionalData._adhunt3r_data) {
        combinedData._adhunt3r_data = additionalData._adhunt3r_data;
        
        // === NUEVO: Añadir detectedCategory al adtypeinfo si no existe ===
        if (combinedData._adhunt3r_data.adtypeinfo && detectedCategory) {
          combinedData._adhunt3r_data.adtypeinfo.detectedCategory = detectedCategory;
        }
        
        // === CORREGIDO: Añadir información del video donde aparece el anuncio ===
        if (debug_videoId) {
          combinedData._adhunt3r_data.adtypeinfo.ad_seenIn = `https://www.youtube.com/watch?v=${debug_videoId}`;
          console.log(`[AdHunt3r] Añadido ad_seenIn para anuncio: ${debug_videoId}`);
        } else {
          console.warn('[AdHunt3r] No se pudo obtener debug_videoId para anuncio');
        }
        
        // === NUEVO: Eliminar extractionTimestamp si existe ===
        if (combinedData._adhunt3r_data.extractionTimestamp) {
          delete combinedData._adhunt3r_data.extractionTimestamp;
        }
      } else {
        // Crear estructura _adhunt3r_data si no existe
        combinedData._adhunt3r_data = {
          adtypeinfo: {
            ...additionalData,
            // === NUEVO: Añadir detectedCategory ===
            detectedCategory: detectedCategory,
            // === CORREGIDO: Añadir información del video donde aparece el anuncio ===
            ...(debug_videoId && { ad_seenIn: `https://www.youtube.com/watch?v=${debug_videoId}` })
          },
          sponsorinfo: null
        };
      }
    }
    
    // === CORREGIDO: Añadir datos de debug SOLO para consultas de video ===
    if (debugData && type === 'video') {
      console.log('[AdHunt3r] Procesando debug info para video:', {
        videoId: videoId,
        debugDataKeys: Object.keys(debugData),
        hasYtInitialPlayerResponse: !!debugData?.ytInitialPlayerResponse,
        hasVideoDetails: !!debugData?.ytInitialPlayerResponse?.videoDetails
      });
      
      // === NUEVO: Actualizar debugData con datos reales de la API ANTES de crear optimizedDebugData ===
      if (data && data.items && data.items[0] && debugData.ytInitialPlayerResponse) {
        const videoItem = data.items[0];
        debugData.ytInitialPlayerResponse.videoDetails = {
          videoId: videoId,
          title: videoItem.snippet?.title || `Video ${videoId}`,
          lengthSeconds: videoItem.contentDetails?.duration ? 
            parseDurationToSeconds(videoItem.contentDetails.duration) : 0,
          channelId: videoItem.snippet?.channelId || '',
          isLiveContent: videoItem.snippet?.liveBroadcastContent === 'live',
          viewCount: videoItem.statistics?.viewCount || '0',
          author: videoItem.snippet?.channelTitle || '',
          thumbnail: videoItem.snippet?.thumbnails?.default?.url || ''
        };
        console.log('[AdHunt3r] Debug data actualizada con datos reales de la API');
      }
      
      const optimizedDebugData = createOptimizedDebugData(debugData);
      
      // === CORREGIDO: Siempre añadir debug info si está disponible, actualizando el video_id si es necesario ===
      if (optimizedDebugData) {
        // Para videos, actualizar el video_id al video consultado
        optimizedDebugData.video_id = videoId;
        if (optimizedDebugData.video_details) {
          optimizedDebugData.video_details.videoId = videoId;
        }
        
        combinedData._adhunt3r_dbgData = optimizedDebugData;
        
        // === CORREGIDO: Log para diagnosticar información de debug ===
        console.log('[AdHunt3r] Debug info añadida correctamente:', {
          type: type,
          videoId: videoId,
          debugDataVideoId: debugData.debug_videoId,
          optimizedVideoId: optimizedDebugData?.video_id,
          hasVideoDetails: !!optimizedDebugData?.video_details,
          debugDataKeys: Object.keys(debugData)
        });
      } else {
        console.warn(`[AdHunt3r] No se pudo crear optimizedDebugData para ${type}:`, {
          debugDataKeys: Object.keys(debugData),
          hasYtInitialPlayerResponse: !!debugData?.ytInitialPlayerResponse,
          hasVideoDetails: !!debugData?.ytInitialPlayerResponse?.videoDetails
        });
      }
    } else {
      console.log('[AdHunt3r] No se procesará debug info:', {
        type: type,
        hasDebugData: !!debugData,
        debugDataKeys: debugData ? Object.keys(debugData) : []
      });
    }
    
    // Verificar tamaño para evitar exceder límites de storage
    let jsonStr = JSON.stringify(combinedData, null, 2);
    
    if (jsonStr.length > 20_000) { // 20KB límite por consulta (para permitir múltiples consultas en 5MB total)
      console.warn('[AdHunt3r] JSON demasiado grande, eliminando _adhunt3r_dbgData para reducir tamaño');
      delete combinedData._adhunt3r_dbgData;
      jsonStr = JSON.stringify(combinedData, null, 2);
    }
  
  return { data: combinedData, jsonStr };
    
  } catch (error) {
    console.error('[AdHunt3r] Error en queryYouTubeAPI:', error);
    throw error;
  }
}

// Función para extraer información básica de la respuesta API
export function extractVideoInfo(apiResponse) {
  if (!apiResponse || !apiResponse.items || !apiResponse.items[0]) {
    return null;
  }
  
  const item = apiResponse.items[0];
  return {
    title: item.snippet?.title || '',
    channelTitle: item.snippet?.channelTitle || '',
    thumbnail: item.snippet?.thumbnails?.default?.url || '',
    visibility: item.status?.privacyStatus || 'unknown'
  };
}

// Función genérica para consultar y guardar datos
export async function queryAndSaveData(videoId, type, additionalData = null, debug_videoId = null) {
  try {
    const isAd = type === 'ad';
    const preId = isAd ? 'ytad_pre' : 'ytdata_pre';
    const pre = document.getElementById(preId);
    
    if (pre) {
      pre.textContent = 'Consultando...';
    }
    
    // Obtener datos de debug del contexto actual (para videos y anuncios)
    let debugData = null;
    
    // === CORREGIDO: Para videos, obtener información específica del video consultado ===
    if (type === 'video') {
      // Obtener el contexto actual para verificar si coincide con el video consultado
      const contextData = await getCurrentContextData();
      
      if (contextData && contextData.debugInfo) {
        // Verificar si el video del contexto actual coincide con el video consultado
        const currentVideoId = contextData.debug_videoId || 
                              contextData.debugInfo?.debug_videoId ||
                              contextData.debugInfo?.ytInitialPlayerResponse?.videoDetails?.videoId;
        
        if (currentVideoId === videoId) {
          // Si coincide, usar la información del contexto actual
          debugData = contextData.debugInfo;
          console.log(`[AdHunt3r] Usando información de debug del contexto actual para video ${videoId}`);
        } else {
          // === CORREGIDO: Si no coincide, crear información de debug específica para el video consultado ===
          debugData = {
            debug_videoId: videoId,
            ytInitialPlayerResponse: {
              videoDetails: {
                videoId: videoId,
                title: `Video ${videoId}`, // Se actualizará con datos reales de la API
                lengthSeconds: 0,
                channelId: '',
                isLiveContent: false,
                viewCount: 0
              }
            }
          };
          console.warn(`[AdHunt3r] Video consultado (${videoId}) no coincide con contexto actual (${currentVideoId}), creando información de debug específica para el video consultado`);
        }
      } else {
        // Si no hay contexto disponible, crear información mínima específica para el video consultado
        debugData = {
          debug_videoId: videoId,
          ytInitialPlayerResponse: {
            videoDetails: {
              videoId: videoId,
              title: `Video ${videoId}`,
              lengthSeconds: 0,
              channelId: '',
              isLiveContent: false,
              viewCount: 0
            }
          }
        };
        console.warn(`[AdHunt3r] No hay contexto disponible, creando información mínima para video ${videoId}`);
      }
    } else {
      // Para anuncios, NO obtener información de debug ya que no se necesita
      debugData = null;
    }
    
    // === NUEVO: Para videos, actualizar información de debug ANTES de consultar la API ===
    if (type === 'video' && debugData && debugData.ytInitialPlayerResponse) {
      // Crear información de debug específica para el video consultado
      debugData.ytInitialPlayerResponse.videoDetails = {
        videoId: videoId,
        title: `Video ${videoId}`, // Se actualizará con datos reales después
        lengthSeconds: 0,
        channelId: '',
        isLiveContent: false,
        viewCount: '0',
        author: '',
        thumbnail: ''
      };
    }
    
    // Consultar API
    const { data, jsonStr } = await queryYouTubeAPI(videoId, type, additionalData, debugData);
    
    // Actualizar UI
    if (pre) {
      pre.textContent = jsonStr;
      pre.style.display = 'block';
    }
    
    // Actualizar variables globales
    const loadedKey = isAd ? 'ytAdDataLoaded' : 'ytDataLoaded';
    const queriedKey = isAd ? 'lastQueriedAdId' : 'lastQueriedVideoId';
    window[loadedKey] = true;
    window[queriedKey] = videoId;
    
    // Guardar en storage local
    const tabs = await new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    
    if (tabs && tabs[0]) {
      const tabId = tabs[0].id;
      const storageKey = `${type === 'ad' ? 'ytad' : 'ytdata'}_${tabId}_${videoId}`;
      await storageCache.set(storageKey, jsonStr);
    }
    
    // Guardar en historial
    const videoInfo = extractVideoInfo(data);
    const historyItem = {
      [isAd ? 'adId' : 'videoId']: videoId,
      data: jsonStr,
      timestamp: Date.now(),
      info: videoInfo
    };
    
    if (isAd && additionalData) {
      historyItem.adTypeInfo = additionalData;
    }
    
    await saveToHistory(type, historyItem);
    
    showMsg(`¡${isAd ? 'Anuncio' : 'Video'} guardado en el historial!`, 'success');
    
    return { success: true, data: jsonStr };
    
  } catch (error) {
    const preId = type === 'ad' ? 'ytad_pre' : 'ytdata_pre';
    const pre = document.getElementById(preId);
    
    if (pre) {
      pre.textContent = 'Error al consultar la API';
    }
    
    // Si hay debugData disponible, guardar una entrada mínima para no perder la referencia
    try {
      if (type === 'video' && debugData && debugData.ytInitialPlayerResponse) {
        const fallbackInfo = {
          title: debugData.ytInitialPlayerResponse?.videoDetails?.title || '(sin título)',
          channelTitle: debugData.ytInitialPlayerResponse?.videoDetails?.author || '',
          thumbnail: debugData.ytInitialPlayerResponse?.videoDetails?.thumbnail?.thumbnails?.[0]?.url || ''
        };
        const minimalItem = {
          videoId,
          data: JSON.stringify({ _fallback: true, debugData }),
          timestamp: Date.now(),
          info: fallbackInfo
        };
        await saveToHistory('video', minimalItem);
      }
    } catch (e) {
      // Silenciar fallos de fallback
    }
    
    // Limpiar variables globales
    const loadedKey = type === 'ad' ? 'ytAdDataLoaded' : 'ytDataLoaded';
    window[loadedKey] = false;
    
    showMsg(`Error al consultar la API: ${error.message}`, 'error');
    
    return { success: false, error: error.message };
  }
}

// Función para obtener datos del contexto actual
export function getCurrentContextData() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_DEBUG_INFO' }, (response) => {
      if (!response) {
        resolve(null);
        return;
      }
      
      const debugInfo = response.debugInfo || {};
      
      // Extraer debug_videoId
      let debug_videoId = null;
      if (response.debug_videoId) {
        debug_videoId = response.debug_videoId;
      } else if (debugInfo.debug_videoId) {
        debug_videoId = debugInfo.debug_videoId;
      } else if (debugInfo.ytInitialPlayerResponse?.videoDetails?.videoId) {
        debug_videoId = debugInfo.ytInitialPlayerResponse.videoDetails.videoId;
      }
      
      resolve({
        debug_videoId,
        addebug_videoId: response.addebug_videoId,
        adTypeInfo: response.adTypeInfo,
        debugInfo
      });
    });
  });
}

// Función para verificar si los datos ya están en el historial unificado
export async function checkDataInHistory(id, type) {
  const isAd = type === 'ad';
  const idKey = isAd ? 'adId' : 'videoId';
  
  try {
    // Buscar en el historial unificado
    const history = await storageCache.get(isAd ? 'ytad_history' : 'ytdata_history');
    const historyData = Array.isArray(history) ? history : [];
    
    // Buscar en el historial
    const found = historyData.find(item => item[idKey] === id);
    if (found) {
      return { inHistory: true, data: found, source: 'history' };
    }
    
    return { inHistory: false, data: null, source: null };
  } catch (error) {
    console.error('Error checking data in history:', error);
    return { inHistory: false, data: null, source: null };
  }
}
