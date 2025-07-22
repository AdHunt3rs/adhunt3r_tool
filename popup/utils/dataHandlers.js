// Módulo para manejar datos de videos y anuncios de forma genérica
// Optimizado para eliminar código duplicado

import { storageCache, isValidVideoId, getHistoryData } from '../storage/storageManager.js';
import { showMsg } from './uiHelpers.js';

// Función para buscar en el historial unificado
async function searchInAllHistories(id, type) {
  const isAd = type === 'ad';
  const idKey = isAd ? 'adId' : 'videoId';
  
  try {
    // Buscar en el historial unificado
    const history = await getHistoryData(type);
    
    // Buscar en el historial
    const found = history.find(item => item[idKey] === id);
    if (found) {
      return { found: true, data: found, source: 'history' };
    }
    
    return { found: false, data: null, source: null };
  } catch (error) {
    console.error('Error searching in history:', error);
    return { found: false, data: null, source: null };
  }
}

// Función factory para crear handlers genéricos de datos
export function createGenericDataHandler(type) {
  const isAd = type === 'ad';
  const idKey = isAd ? 'lastAdDebugVideoId' : 'lastDebugVideoId';
  const loadedKey = isAd ? 'ytAdDataLoaded' : 'ytDataLoaded';
  const queriedKey = isAd ? 'lastQueriedAdId' : 'lastQueriedVideoId';
  const buttonId = isAd ? 'ytAdQueryBtn' : 'ytQueryBtn';
  const copyButtonId = isAd ? 'copyYtAdDataBtn' : 'copyYtDataBtn';
  const preId = isAd ? 'ytad_pre' : 'ytdata_pre';
  
  return {
    async checkInHistory(id, callback) {
      if (!isValidVideoId(id)) {
        callback(false, null);
        return;
      }
      
      try {
        const result = await searchInAllHistories(id, type);
        callback(result.found, result.data);
      } catch (error) {
        callback(false, null);
      }
    },
    
    updateButton(id) {
      const button = document.getElementById(buttonId);
      const copyButton = document.getElementById(copyButtonId);
      const pre = document.getElementById(preId);
      
      if (!button || !copyButton || !pre) return;
      
      this.checkInHistory(id, (inHistory, historyEntry) => {
        if (inHistory && historyEntry && historyEntry.data) {
          // En historial: deshabilitar botón y mostrar datos
          button.disabled = true;
          button.textContent = historyEntry.isFavorite ? 'Ver en favoritos' : 'Ver en el historial';
          button.classList.add('disabled-ad-btn');
          
          pre.textContent = historyEntry.data;
          pre.style.display = 'block';
          copyButton.style.display = 'inline-block';
          copyButton.disabled = false;
          
          // Actualizar variables globales
          window[loadedKey] = true;
          window[queriedKey] = id;
          
        } else if (window[loadedKey] && window[queriedKey] === id) {
          // Ya consultado en sesión: mantener estado
          button.disabled = true;
          button.textContent = 'Ver en el historial';
          button.classList.add('disabled-ad-btn');
          
          if (pre.textContent.trim() !== '') {
            pre.style.display = 'block';
            copyButton.style.display = 'inline-block';
            copyButton.disabled = false;
          }
          
        } else {
          // No en historial: habilitar botón
          button.disabled = false;
          button.textContent = isAd ? 'Consultar datos del anuncio' : 'Consultar datos del video';
          button.classList.remove('disabled-ad-btn');
          
          if (window[queriedKey] !== id) {
            pre.textContent = '';
            pre.style.display = 'none';
            copyButton.style.display = 'none';
            window[loadedKey] = false;
          }
        }
      });
    },
    
    copyData() {
      const pre = document.getElementById(preId);
      if (pre && pre.textContent.trim() !== '') {
        navigator.clipboard.writeText(pre.textContent).then(() => {
          showMsg(`¡Datos ${isAd ? 'del anuncio' : 'del video'} copiados!`, 'success');
        }).catch(() => {
          showMsg('Error al copiar', 'error');
        });
      } else {
        showMsg('Nada que copiar');
      }
    },
    
    // Función para limpiar datos del pre
    clearData() {
      const pre = document.getElementById(preId);
      const copyButton = document.getElementById(copyButtonId);
      
      if (pre) {
        pre.textContent = '';
        pre.style.display = 'none';
      }
      
      if (copyButton) {
        copyButton.style.display = 'none';
      }
      
      window[loadedKey] = false;
      window[queriedKey] = null;
    }
  };
}

// Instancias para manejar videos y anuncios
export const videoHandler = createGenericDataHandler('video');
export const adHandler = createGenericDataHandler('ad');

// Funciones auxiliares que usan los handlers genéricos
export function checkVideoInHistory(videoId, callback) {
  videoHandler.checkInHistory(videoId, callback);
}

export function checkAdInHistory(adId, callback) {
  adHandler.checkInHistory(adId, callback);
}
