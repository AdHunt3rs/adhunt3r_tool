// Módulo para gestión optimizada de estado y comparaciones
// Optimizado para evitar actualizaciones innecesarias

// Variables para el control de estado
let lastDebugState = null;
let lastAdState = null;
let debounceTimeout = null;
let currentAdStateDisplay = null;

// Sistema de debounce para evitar actualizaciones excesivas
export function debounceUpdate(fn, delay = 300) {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(fn, delay);
}

// Función para comparar estados y evitar actualizaciones innecesarias
export function hasStateChanged(newResponse) {
  const currentState = JSON.stringify({
    debug_videoId: newResponse?.debug_videoId,
    addebug_videoId: newResponse?.addebug_videoId,
    adActive: newResponse?.adActive,
    debugText: newResponse?.debugText?.length // Solo comparamos la longitud
  });
  
  if (currentState !== lastDebugState) {
    lastDebugState = currentState;
    return true;
  }
  return false;
}

// Función para verificar si el estado del anuncio cambió realmente
export function hasAdStateChanged(newResponse) {
  const currentAdState = {
    adActive: newResponse?.adActive || false,
    addebug_videoId: newResponse?.addebug_videoId || null
  };
  
  const adStateStr = JSON.stringify(currentAdState);
  if (adStateStr !== lastAdState) {
    lastAdState = adStateStr;
    return true;
  }
  return false;
}

// Función para gestionar el estado del anuncio con optimización
export function setAdStateBox(isAd, addebugId) {
  const adStateEl = document.getElementById('ad_state');
  if (!adStateEl) return;
  
  // Crear un identificador único para el estado actual
  const newStateId = `${isAd}-${addebugId || 'none'}`;
  
  // Solo actualizar si el estado realmente cambió
  if (currentAdStateDisplay === newStateId) {
    return; // No hacer nada si el estado es el mismo
  }
  
  currentAdStateDisplay = newStateId;
  
  // Verificar si hay un anuncio válido (no empty_video, no vacío, no null)
  const isValidAd = isAd && addebugId && 
                   addebugId !== '(no disponible)' && 
                   addebugId !== 'empty_video' && 
                   addebugId.trim() !== '';
  
  if (isValidAd) {
    adStateEl.innerHTML = `<div class="ad-state-box ad">¡Hay anuncio! <button id="gotoAdFromStateBtn" class="gotoadbtn">Ir al anuncio</button></div>`;
    // Asignar el evento después de insertar el HTML
    setTimeout(() => {
      const btn = document.getElementById('gotoAdFromStateBtn');
      if (btn) {
        btn.onclick = function() {
          if (addebugId && addebugId !== '(no disponible)' && addebugId !== 'empty_video') {
            const url = `https://www.youtube.com/watch?v=${addebugId}`;
            window.open(url, '_blank');
          }
        };
      }
    }, 0);
  } else {
    // No hay anuncio válido, mostrar estado normal
    adStateEl.innerHTML = '<div class="ad-state-box">No hay anuncio</div>';
  }
}

// Función para comparar dos objetos de estado de manera eficiente
export function compareStates(state1, state2, keys = []) {
  if (keys.length === 0) {
    return JSON.stringify(state1) === JSON.stringify(state2);
  }
  
  for (const key of keys) {
    if (state1[key] !== state2[key]) {
      return false;
    }
  }
  
  return true;
}

// Función para crear un hash simple de un objeto
export function createStateHash(obj) {
  return JSON.stringify(obj);
}

// Función para gestionar cambios de estado con callback
export function onStateChange(newState, callback, stateKey = 'default') {
  const stateHash = createStateHash(newState);
  
  if (!window._stateHashes) {
    window._stateHashes = {};
  }
  
  if (window._stateHashes[stateKey] !== stateHash) {
    window._stateHashes[stateKey] = stateHash;
    callback(newState);
  }
}

// Función para resetear todos los estados
export function resetAllStates() {
  lastDebugState = null;
  lastAdState = null;
  currentAdStateDisplay = null;
  if (window._stateHashes) {
    window._stateHashes = {};
  }
}

// Función para limpiar timeouts pendientes
export function clearPendingTimeouts() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
}

// Función para obtener el estado actual del anuncio
export function getCurrentAdState() {
  return currentAdStateDisplay;
}
