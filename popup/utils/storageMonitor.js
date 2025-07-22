// Módulo para monitorear el espacio de almacenamiento de Chrome
// Optimizado para detectar cuando el almacenamiento está cerca de su límite

// Constantes para los umbrales de alerta
const STORAGE_THRESHOLDS = {
  WARNING: 0.8,  // 80% - Mostrar advertencia
  CRITICAL: 0.95, // 95% - Bloquear nuevas consultas
  MAX_SIZE: 5 * 1024 * 1024 // 5MB estimado como límite seguro
};

// Función para obtener información del almacenamiento
export async function getStorageInfo() {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (bytesUsed) => {
      // Obtener información adicional del storage
      chrome.storage.local.get(null, (items) => {
        const totalKeys = Object.keys(items).length;
        const estimatedSize = bytesUsed || 0;
        
        // Obtener el límite real de Chrome storage (aproximadamente 5MB por origen)
        // Chrome storage tiene un límite de ~5MB por origen, pero puede variar
        const chromeStorageLimit = 5 * 1024 * 1024; // 5MB en bytes
        
        // Calcular porcentaje basado en el límite real de Chrome
        const usagePercentage = estimatedSize / chromeStorageLimit;
        
        // Información de almacenamiento calculada
        
        resolve({
          bytesUsed: estimatedSize,
          totalKeys,
          estimatedSize,
          usagePercentage,
          maxSize: chromeStorageLimit,
          chromeStorageLimit,
          isWarning: usagePercentage >= STORAGE_THRESHOLDS.WARNING,
          isCritical: usagePercentage >= STORAGE_THRESHOLDS.CRITICAL
        });
      });
    });
  });
}

// Función para verificar si se puede realizar una nueva consulta
export async function canPerformQuery() {
  const storageInfo = await getStorageInfo();
  return !storageInfo.isCritical;
}

// Función para obtener mensaje de estado del almacenamiento
export function getStorageMessage(storageInfo) {
  if (storageInfo.isCritical) {
    return {
      type: 'error',
      title: 'Almacenamiento Crítico',
      message: `El almacenamiento está al ${Math.round(storageInfo.usagePercentage * 100)}%. No se pueden realizar más consultas.`,
      action: 'Elimina consultas del historial para liberar espacio.',
      icon: 'fas fa-exclamation-triangle'
    };
  } else if (storageInfo.isWarning) {
    return {
      type: 'warning',
      title: 'Almacenamiento Alto',
      message: `El almacenamiento está al ${Math.round(storageInfo.usagePercentage * 100)}%.`,
      action: 'Considera eliminar consultas antiguas del historial.',
      icon: 'fas fa-exclamation-circle'
    };
  } else {
    return {
      type: 'info',
      title: 'Almacenamiento Normal',
      message: `El almacenamiento está al ${Math.round(storageInfo.usagePercentage * 100)}%.`,
      action: null,
      icon: 'fas fa-check-circle'
    };
  }
}

// Función para mostrar alerta de almacenamiento en el popup
export function showStorageAlert(storageInfo, containerId = 'storageAlert') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const message = getStorageMessage(storageInfo);
  
  container.innerHTML = `
    <div class="storage-alert storage-alert-${message.type}">
      <div class="storage-alert-header">
        <i class="${message.icon}"></i>
        <span class="storage-alert-title">${message.title}</span>
        <button class="storage-alert-close" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="storage-alert-content">
        <p>${message.message}</p>
        ${message.action ? `<p class="storage-alert-action">${message.action}</p>` : ''}
      </div>
      <div class="storage-progress">
        <div class="storage-progress-bar">
          <div class="storage-progress-fill" style="width: ${Math.round(storageInfo.usagePercentage * 100)}%"></div>
        </div>
        <span class="storage-progress-text">${Math.round(storageInfo.usagePercentage * 100)}% usado</span>
      </div>
    </div>
  `;
  
  container.style.display = 'block';
}

// Función para verificar y mostrar alerta automáticamente
export async function checkAndShowStorageAlert(containerId = 'storageAlert') {
  try {
    const storageInfo = await getStorageInfo();
    
    if (storageInfo.isWarning || storageInfo.isCritical) {
      showStorageAlert(storageInfo, containerId);
    }
    
    return storageInfo;
  } catch (error) {
    console.warn('[AdHunt3r] Error verificando almacenamiento:', error);
    return null;
  }
}

// Función para obtener estadísticas de uso por tipo de dato
export async function getStorageStats() {
  try {
      const [videoHistory, adHistory] = await Promise.all([
    chrome.storage.local.get('ytdata_history'),
    chrome.storage.local.get('ytad_history')
  ]);
  
  const videoCount = Array.isArray(videoHistory.ytdata_history) ? videoHistory.ytdata_history.length : 0;
  const adCount = Array.isArray(adHistory.ytad_history) ? adHistory.ytad_history.length : 0;
  const favoriteCount = Array.isArray(videoHistory.ytdata_history) ? videoHistory.ytdata_history.filter(item => item.isFavorite).length : 0;
  const favoriteCountAd = Array.isArray(adHistory.ytad_history) ? adHistory.ytad_history.filter(item => item.isFavorite).length : 0;
  const totalFavorites = favoriteCount + favoriteCountAd;
    
    return {
      videos: videoCount,
      ads: adCount,
      favorites: totalFavorites,
      total: videoCount + adCount
    };
  } catch (error) {
    console.warn('[AdHunt3r] Error obteniendo estadísticas de storage:', error);
    return { videos: 0, ads: 0, favorites: 0, total: 0 };
  }
}

// Función para obtener información detallada del almacenamiento (debug)
export async function getDetailedStorageInfo() {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (bytesUsed) => {
      chrome.storage.local.get(null, (items) => {
        const totalKeys = Object.keys(items).length;
        const estimatedSize = bytesUsed || 0;
        
        // Analizar el contenido del storage
        const storageAnalysis = {
          totalKeys,
          totalSize: estimatedSize,
          items: {}
        };
        
        // Analizar cada clave del storage
        Object.keys(items).forEach(key => {
          const item = items[key];
          const itemSize = JSON.stringify(item).length;
          storageAnalysis.items[key] = {
            type: typeof item,
            size: itemSize,
            isArray: Array.isArray(item),
            arrayLength: Array.isArray(item) ? item.length : null
          };
        });
        
        // Análisis detallado del almacenamiento
        resolve(storageAnalysis);
      });
    });
  });
}

 