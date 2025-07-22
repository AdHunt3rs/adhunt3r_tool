// Archivo optimizado: history.js - Rediseño moderno con tarjetas expandibles
// Importaciones y configuración inicial

import { markAsFavorite, removeFromFavorites, getFavorites, saveToHistory, getHistoryData, storageCache } from '../storage/storageManager.js';
import { showMsg, preserveScroll } from '../utils/uiHelpers.js';
import { getStorageInfo, checkAndShowStorageAlert, getDetailedStorageInfo } from '../utils/storageMonitor.js';

// === Variables globales ===
const selectedItems = new Map();
const allItemsMap = new Map();
let currentTheme = 'light';
let currentFilters = {
  type: 'all',
  date: 'all',
  durationMin: '',
  durationMax: '',
  keyword: '',
  favorite: false
};

// Vista actual: 'single' (tarjetas expandibles) o 'split' (dos columnas)
let viewMode = localStorage.getItem('adhunt3r_viewmode') || 'single';

// === Inicialización ===
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Escuchar cambios en el storage
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
    if (changes.ytdata_history || changes.ytad_history) {
      // Debounce para evitar múltiples recargas rápidas
      if (window.historyUpdateTimeout) {
        clearTimeout(window.historyUpdateTimeout);
      }
      
      window.historyUpdateTimeout = setTimeout(() => {
        loadAllData();
        // Actualizar indicador de almacenamiento después de cargar datos
        updateStorageIndicator();
        // Actualizar indicador de configuración
        updateConfigStorageInfo();
      }, 100);
      }
    }
  });

// Escuchar mensajes de actualización (para comunicación interna)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_HISTORY') {
    // Debounce para evitar múltiples recargas rápidas
    if (window.historyUpdateTimeout) {
      clearTimeout(window.historyUpdateTimeout);
    }
    
    window.historyUpdateTimeout = setTimeout(() => {
      loadAllData();
      // Actualizar indicador de almacenamiento después de cargar datos
      updateStorageIndicator();
      // Actualizar indicador de configuración
      updateConfigStorageInfo();
    }, 100);
  }
});

// === [SISTEMA DE ACTUALIZACIÓN EN TIEMPO REAL] ===

// Listener para mensajes de chrome.runtime para actualización en tiempo real
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_HISTORY') {

    
    // Actualizar inmediatamente si la pestaña está visible
    if (!document.hidden) {
      // Usar debounce para evitar múltiples actualizaciones simultáneas
      debounce(() => {
        executeWithScrollPreservation(loadAllData);
      }, 500, 'history_refresh');
    }
    
    sendResponse({ received: true });
  }
});

// === [VARIABLES GLOBALES ADICIONALES] ===
let lastDataHash = null;
let lastScrollPosition = 0;

// === [SISTEMA DE POLLING OPTIMIZADO] ===
let pollingInterval = null;

function startPollingForChanges() {
  // Polling cada 2 segundos solo si la pestaña está visible
  pollingInterval = setInterval(async () => {
    if (document.hidden) return; // No hacer polling si la pestaña no está visible
    
    try {
      const [videoHistory, adHistory] = await Promise.all([
        getHistoryData('video'),
        getHistoryData('ad')
      ]);
      
      // Crear hash simple de los datos para detectar cambios
      const dataString = JSON.stringify([
        videoHistory.map(item => ({ id: item.videoId, timestamp: item.timestamp })),
        adHistory.map(item => ({ id: item.adId, timestamp: item.timestamp }))
      ]);
      
      const currentHash = btoa(dataString).substring(0, 32); // Hash simple
      
      if (lastDataHash && lastDataHash !== currentHash) {
        loadAllData();
      }
      
      lastDataHash = currentHash;
    } catch (error) {
      // Ignorar errores de polling
    }
  }, 2000);
}

function stopPollingForChanges() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// Gestionar visibilidad de la pestaña para optimizar el polling
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopPollingForChanges();
  } else {
    // Al volver a enfocar la pestaña, verificar inmediatamente si hay cambios
    checkForChangesImmediately();
    startPollingForChanges();
  }
});

// Iniciar polling al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  startPollingForChanges();
});

// Limpieza al cerrar la pestaña
window.addEventListener('beforeunload', () => {
  stopPollingForChanges();
  if (window.historyUpdateTimeout) {
    clearTimeout(window.historyUpdateTimeout);
  }
});

// Limpieza adicional para cambios de página
window.addEventListener('pagehide', () => {
  stopPollingForChanges();
  if (window.historyUpdateTimeout) {
    clearTimeout(window.historyUpdateTimeout);
  }
});

async function initializeApp() {
  showLoadingState(true);
  
  try {
    // Inicializar tema
    initializeTheme();

    // Inicializar modo de vista
    initializeViewMode();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar datos iniciales
    await loadAllData();
    
    // Inicializar hash de datos para el polling
    await initializeDataHash();
    
    // Inicializar indicador de almacenamiento
    await initializeStorageIndicator();
    
    
    
    // Inicializar indicador de datos en configuración
    await updateConfigStorageInfo();
    
    // Verificar alertas de almacenamiento
    await checkStorageAlerts();
    
  } catch (error) {
    console.error('Error inicializando la aplicación:', error);
    showEmptyState();
  } finally {
    showLoadingState(false);
  }
}

// === FUNCIONES DEL INDICADOR DE ALMACENAMIENTO ===

// Función para calcular el tamaño de datos por tipo
async function calculateDataSizeByType() {
  try {
    const [videoHistory, adHistory] = await Promise.all([
      getHistoryData('video'),
      getHistoryData('ad')
    ]);
    
    // Calcular tamaño de datos de videos
    const videoDataSize = Array.isArray(videoHistory) ? 
      JSON.stringify(videoHistory).length : 0;
    
    // Calcular tamaño de datos de anuncios
    const adDataSize = Array.isArray(adHistory) ? 
      JSON.stringify(adHistory).length : 0;
    
    return {
      videoSize: videoDataSize,
      adSize: adDataSize,
      totalSize: videoDataSize + adDataSize
    };
  } catch (error) {
    console.warn('[AdHunt3r] Error calculando tamaño de datos por tipo:', error);
    return { videoSize: 0, adSize: 0, totalSize: 0 };
  }
}

// Función para formatear tamaño de datos
function formatDataSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${bytes} B`;
  }
}

// Función para actualizar el indicador de datos por tipo
async function updateDataTypeIndicator() {
  try {
    const dataSizes = await calculateDataSizeByType();
    const indicatorEl = document.querySelector('.data-type-indicator');
    
    if (!indicatorEl) return null;
    
    // Mostrar el indicador
    indicatorEl.style.display = 'flex';
    
    // Actualizar elementos del DOM
    const videoSizeEl = document.getElementById('videoDataSize');
    const adSizeEl = document.getElementById('adDataSize');
    
    if (videoSizeEl) {
      videoSizeEl.textContent = formatDataSize(dataSizes.videoSize);
    }
    
    if (adSizeEl) {
      adSizeEl.textContent = formatDataSize(dataSizes.adSize);
    }
    
    // Actualizar tooltip
    const totalSize = formatDataSize(dataSizes.totalSize);
    const videoSize = formatDataSize(dataSizes.videoSize);
    const adSize = formatDataSize(dataSizes.adSize);
    
    indicatorEl.setAttribute('data-tooltip', 
      `Tamaño de datos por tipo:\nVideos: ${videoSize}\nAnuncios: ${adSize}\nTotal: ${totalSize}`
    );
    
    return dataSizes;
  } catch (error) {
    console.warn('[AdHunt3r] Error actualizando indicador de datos por tipo:', error);
    return null;
  }
}

// Función para actualizar el indicador de almacenamiento
async function updateStorageIndicator() {
  try {
    const storageInfo = await getStorageInfo();
    if (!storageInfo) return null;
    
    const indicatorEl = document.querySelector('.storage-indicator');
    if (!indicatorEl) return null;
    
    // Mostrar el indicador
    indicatorEl.style.display = 'flex';
    
    const percentage = Math.round(storageInfo.usagePercentage * 100);
    
    // Actualización del indicador de almacenamiento
    
    // Actualizar elementos del DOM
    const percentageEl = document.getElementById('storagePercentage');
    const fillEl = document.getElementById('storageFill');
    const sizeEl = document.getElementById('storageSize');
    
    if (percentageEl) {
      percentageEl.textContent = `${percentage}%`;
    }
    
    if (fillEl) {
      fillEl.style.width = `${percentage}%`;
    }
    
    // Formatear y mostrar el tamaño de datos usado
    if (sizeEl) {
      const sizeInKB = (storageInfo.bytesUsed / 1024).toFixed(1);
      const sizeInMB = (storageInfo.bytesUsed / 1024 / 1024).toFixed(2);
      
      if (storageInfo.bytesUsed >= 1024 * 1024) {
        sizeEl.textContent = `${sizeInMB} MB`;
      } else {
        sizeEl.textContent = `${sizeInKB} KB`;
      }
    }
    
    // Remover clases anteriores
    indicatorEl.classList.remove('warning', 'critical');
    
    // Formatear tamaño para el tooltip
    const sizeInKB = (storageInfo.bytesUsed / 1024).toFixed(1);
    const sizeInMB = (storageInfo.bytesUsed / 1024 / 1024).toFixed(2);
    const sizeText = storageInfo.bytesUsed >= 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    
    // Añadir clases según el estado
    if (storageInfo.isCritical) {
      indicatorEl.classList.add('critical');
      indicatorEl.setAttribute('data-tooltip', `Almacenamiento crítico: ${percentage}% usado (${sizeText}). No se pueden realizar más consultas.`);
    } else if (storageInfo.isWarning) {
      indicatorEl.classList.add('warning');
      indicatorEl.setAttribute('data-tooltip', `Almacenamiento alto: ${percentage}% usado (${sizeText}). Considera eliminar consultas antiguas.`);
    } else {
      indicatorEl.setAttribute('data-tooltip', `Almacenamiento normal: ${percentage}% usado (${sizeText}).`);
    }
    
    return storageInfo;
  } catch (error) {
    console.warn('[AdHunt3r] Error actualizando indicador de almacenamiento:', error);
    return null;
  }
}

// Función para inicializar el indicador de almacenamiento
async function initializeStorageIndicator() {
  await updateStorageIndicator();
  await updateDataTypeIndicator();
  
  // Actualizar cada 30 segundos
  setInterval(async () => {
    if (!document.hidden) {
      await updateStorageIndicator();
      await updateDataTypeIndicator();
    }
  }, 30000);
}

// Función para verificar y mostrar alertas de almacenamiento
async function checkStorageAlerts() {
  try {
    await checkAndShowStorageAlert('storageAlert');
  } catch (error) {
    console.warn('[AdHunt3r] Error verificando alertas de almacenamiento:', error);
  }
}





// === FUNCIÓN PARA ACTUALIZAR INDICADOR DE DATOS EN CONFIGURACIÓN ===

// Función para actualizar el indicador de datos guardados en el menú de configuración
async function updateConfigStorageInfo() {
  try {
    const [videoHistory, adHistory, storageInfo] = await Promise.all([
      getHistoryData('video'),
      getHistoryData('ad'),
      getStorageInfo()
    ]);
    
    const videoCount = Array.isArray(videoHistory) ? videoHistory.length : 0;
    const adCount = Array.isArray(adHistory) ? adHistory.length : 0;
    const favoriteCount = Array.isArray(videoHistory) ? videoHistory.filter(item => item.isFavorite).length : 0;
    const favoriteCountAd = Array.isArray(adHistory) ? adHistory.filter(item => item.isFavorite).length : 0;
    const totalFavorites = favoriteCount + favoriteCountAd;
    const totalCount = videoCount + adCount;
    
    // Actualizar contadores
    const videoCountEl = document.getElementById('configVideoCount');
    const adCountEl = document.getElementById('configAdCount');
    const favoriteCountEl = document.getElementById('configFavoriteCount');
    const totalCountEl = document.getElementById('configTotalCount');
    const storageSizeEl = document.getElementById('configStorageSize');
    
    if (videoCountEl) videoCountEl.textContent = videoCount;
    if (adCountEl) adCountEl.textContent = adCount;
    if (favoriteCountEl) favoriteCountEl.textContent = totalFavorites;
    if (totalCountEl) totalCountEl.textContent = totalCount;
    
    // Formatear tamaño de almacenamiento
    if (storageSizeEl && storageInfo) {
      const sizeInKB = (storageInfo.bytesUsed / 1024).toFixed(1);
      const sizeInMB = (storageInfo.bytesUsed / 1024 / 1024).toFixed(2);
      
      if (storageInfo.bytesUsed >= 1024 * 1024) {
        storageSizeEl.textContent = `${sizeInMB} MB`;
      } else {
        storageSizeEl.textContent = `${sizeInKB} KB`;
      }
    }
    
    // Actualizar también el indicador de datos por tipo
    await updateDataTypeIndicator();
    
    // Información de configuración actualizada
    
  } catch (error) {
    console.error('[AdHunt3r] Error actualizando información de storage en configuración:', error);
  }
}

// Función para inicializar el hash de datos
async function initializeDataHash() {
  try {
    const [videoHistory, adHistory] = await Promise.all([
      getHistoryData('video'),
      getHistoryData('ad')
    ]);
    
    // Crear hash inicial
    const dataString = JSON.stringify([
      videoHistory.map(item => ({ id: item.videoId, timestamp: item.timestamp })),
      adHistory.map(item => ({ id: item.adId, timestamp: item.timestamp }))
    ]);
    
    lastDataHash = btoa(dataString).substring(0, 32);
  } catch (error) {
    // Ignorar errores de inicialización del hash
  }
}

// === Gestión de tema ===
function initializeTheme() {
  const savedTheme = localStorage.getItem('adhunt3r_theme') || 'light';
  currentTheme = savedTheme;
  applyTheme(currentTheme);
  
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.checked = currentTheme === 'dark';
  }
}

function applyTheme(theme) {
  // Aplicar el tema de forma instantánea sin transiciones
  document.documentElement.style.setProperty('--transition-fast', '0ms');
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('adhunt3r_theme', theme);
  
  // Forzar un reflow para asegurar que los cambios se apliquen inmediatamente
  document.documentElement.offsetHeight;
  
  // Restaurar las transiciones después de un breve delay
  setTimeout(() => {
    document.documentElement.style.removeProperty('--transition-fast');
  }, 100);
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
  
  // Actualizar el estado del toggle inmediatamente
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.checked = currentTheme === 'dark';
  }
}

// === Gestión de modo de vista (single vs split) ===
function initializeViewMode() {
  applyViewMode();
  const viewModeBtn = document.getElementById('viewModeToggle');
  if (viewModeBtn) {
    viewModeBtn.addEventListener('click', toggleViewMode);
  }
}

function toggleViewMode() {
  viewMode = viewMode === 'single' ? 'split' : 'single';
  localStorage.setItem('adhunt3r_viewmode', viewMode);
  applyViewMode();
  // Volver a renderizar datos para adaptar layout preservando scroll
  executeWithScrollPreservation(loadAllData);
}

function applyViewMode() {
  // Aplicar clase al body para estilos CSS
  document.body.classList.toggle('two-column-mode', viewMode === 'split');
  updateViewModeIcon();

  const mainContent = document.querySelector('.main-content');
  if (!mainContent) return;

  const detailPane = document.getElementById('detailPane');
  const detailEmptyState = document.getElementById('detailEmptyState');
  const detailContent = document.getElementById('detailContent');

  if (viewMode === 'split') {
    // Mostrar el panel de detalles en modo split
    if (detailPane) {
      detailPane.style.display = 'flex';
      // Mostrar el estado vacío por defecto
      if (detailEmptyState) detailEmptyState.style.display = 'flex';
      if (detailContent) detailContent.style.display = 'none';
    }
  } else {
    // Ocultar el panel de detalles en modo single
    if (detailPane) {
      detailPane.style.display = 'none';
    }
  }
}

function updateViewModeIcon() {
  const viewModeBtn = document.getElementById('viewModeToggle');
  const viewModeText = document.getElementById('viewModeText');
  if (!viewModeBtn) return;
  
  if (viewMode === 'single') {
    viewModeBtn.innerHTML = '<i class="fas fa-columns"></i><span id="viewModeText">Split</span>';
  } else {
    viewModeBtn.innerHTML = '<i class="fas fa-list"></i><span id="viewModeText">Single</span>';
  }
}

function showDetailPane(itemKey) {
  const detailPane = document.getElementById('detailPane');
  const detailEmptyState = document.getElementById('detailEmptyState');
  const detailContent = document.getElementById('detailContent');
  
  if (!detailPane || !detailContent) return;

  const item = allItemsMap.get(itemKey);
  if (!item) return;

  const info = extractVideoInfo(item);
  
  // Ocultar el estado vacío y mostrar el contenido
  if (detailEmptyState) detailEmptyState.style.display = 'none';
  detailContent.style.display = 'block';
  
  // Generar contenido utilizando createCardDetails para mantener formato consistente
  detailContent.innerHTML = `
    <div class="detail-content">
      <h3>${info.title}</h3>
      ${createCardDetails(item, info)}
    </div>
  `;

  // Reconfigurar los listeners dentro del panel de detalles
  setupDetailPaneListeners(itemKey);
}

function clearDetailPane() {
  const detailPane = document.getElementById('detailPane');
  const detailEmptyState = document.getElementById('detailEmptyState');
  const detailContent = document.getElementById('detailContent');
  
  if (!detailPane || !detailContent) return;
  
  // Mostrar el estado vacío y ocultar el contenido
  if (detailEmptyState) detailEmptyState.style.display = 'flex';
  detailContent.style.display = 'none';
}

function setupDetailPaneListeners(itemKey) {
  const detailContent = document.getElementById('detailContent');
  if (!detailContent) return;

  const copyBtn = detailContent.querySelector('.copy-data-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleCopyData(itemKey);
    });
  }

  const jsonBtn = detailContent.querySelector('.toggle-json-btn');
  if (jsonBtn) {
    jsonBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const jsonContainer = detailContent.querySelector(`#json-${itemKey}`);
      if (!jsonContainer) return;
      const isVisible = jsonContainer.style.display !== 'none';
      if (isVisible) {
        jsonContainer.style.display = 'none';
        jsonBtn.innerHTML = '<i class="fas fa-code"></i> Ver JSON';
      } else {
        jsonContainer.style.display = 'block';
        jsonBtn.innerHTML = '<i class="fas fa-code"></i> Ocultar JSON';
      }
    });
  }

  const saveBtn = detailContent.querySelector('.save-to-favorites-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSaveToFavorites(itemKey);
    });
  }

  const removeBtn = detailContent.querySelector('.remove-from-favorites-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRemoveFromFavorites(itemKey);
    });
  }
  
  // NUEVO: Configurar listeners para dropdowns en el panel de detalles (modo split)
  setupDetailPaneDropdownListeners(detailContent);
}

// === NUEVA FUNCIÓN: Configurar listeners para dropdowns en el panel de detalles ===
function setupDetailPaneDropdownListeners(pane) {
  // Buscar todos los dropdowns dentro del panel de detalles
  const dropdowns = pane.querySelectorAll('details');
  
  dropdowns.forEach(dropdown => {
    // Añadir listener para el evento toggle
    dropdown.addEventListener('toggle', (e) => {
      // Si se está abriendo el dropdown, cerrar otros del mismo tipo
      if (dropdown.hasAttribute('open')) {
        const isSectionDropdown = dropdown.classList.contains('section-details');
        const otherDropdowns = pane.querySelectorAll(`details${isSectionDropdown ? '.section-details' : ':not(.section-details)'}[open]`);
        
        otherDropdowns.forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            otherDropdown.removeAttribute('open');
            if (otherDropdown.classList.contains('section-details')) {
              otherDropdown.classList.remove('open');
            }
          }
        });
      }
    });
  });
}

// === Configuración del historial ===
// Nota: Las funciones de límites configurables han sido eliminadas
// El sistema ahora usa límites fijos y alertas automáticas

function setupHistoryConfigListeners() {
  const configBtn = document.getElementById('historyConfigBtn');
  const configMenu = document.getElementById('historyConfigMenu');
  
  // Listener global para ESC cuando el menú está abierto
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && configMenu && configMenu.style.display === 'block') {
      configMenu.style.display = 'none';
    }
  });
  
  if (configBtn && configMenu) {
    configBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isVisible = configMenu.style.display !== 'none';
      
      if (isVisible) {
        configMenu.style.display = 'none';
      } else {
        // Recargar información de almacenamiento cada vez que se abre el menú
        await updateConfigStorageInfo();
        configMenu.style.display = 'block';
      }
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!configMenu.contains(e.target) && !configBtn.contains(e.target)) {
        configMenu.style.display = 'none';
      }
    });
  }
}

// === Event Listeners ===
function setupEventListeners() {
  // Toggle de tema
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('change', toggleTheme);
  }
  
  // Configuración del historial
  setupHistoryConfigListeners();
  
  // Filtros
  setupFilterListeners();
  
  // Selección múltiple
  setupSelectionListeners();
  
  // Acciones por lotes
  setupBatchActionListeners();
  
  // Exportación
  setupExportListeners();
  
  // NUEVO: Listener global para cerrar dropdowns al hacer clic fuera
  setupDropdownCloseListeners();
}

// === NUEVA FUNCIÓN: Configurar listeners para cerrar dropdowns ===
function setupDropdownCloseListeners() {
  // Listener global para cerrar dropdowns al hacer clic fuera
  document.addEventListener('click', (e) => {
    const clickedElement = e.target;
    
    // Verificar si el clic fue en un elemento que debería mantener el dropdown abierto
    if (clickedElement.tagName === 'SUMMARY' || 
        clickedElement.closest('details') ||
        clickedElement.closest('.section-summary') ||
        clickedElement.closest('.section-content')) {
      return; // No cerrar el dropdown
    }
    
    // Buscar todos los dropdowns abiertos en toda la página
    const openDropdowns = document.querySelectorAll('details[open]');
    
    openDropdowns.forEach(dropdown => {
      // Verificar si el clic fue fuera del dropdown
      if (!dropdown.contains(clickedElement)) {
        // Cerrar el dropdown
        dropdown.removeAttribute('open');
        
        // Si es un dropdown de sección, también actualizar la clase CSS
        if (dropdown.classList.contains('section-details')) {
          dropdown.classList.remove('open');
        }
      }
    });
    

  });
  
  // Listener para ESC para cerrar dropdowns
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openDropdowns = document.querySelectorAll('details[open]');
      openDropdowns.forEach(dropdown => {
        dropdown.removeAttribute('open');
        if (dropdown.classList.contains('section-details')) {
          dropdown.classList.remove('open');
        }
      });
      

    }
  });
  
  // NUEVO: Listener para comportamiento de acordeón global (mejorado para modo split)
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'SUMMARY') {
      const clickedDropdown = e.target.closest('details');
      if (!clickedDropdown) return;
      
      // Si el dropdown que se está abriendo ya estaba abierto, no hacer nada
      if (clickedDropdown.hasAttribute('open')) {
        return;
      }
      
      // Determinar el contexto del dropdown (tarjeta individual o panel de detalles)
      const isInDetailPane = clickedDropdown.closest('#detailPane');
      const isInCard = clickedDropdown.closest('.history-card');
      const isSectionDropdown = clickedDropdown.classList.contains('section-details');
      
      let searchContainer;
      if (isInDetailPane) {
        // Si está en el panel de detalles, buscar solo en ese panel
        searchContainer = document.getElementById('detailPane');
      } else if (isInCard) {
        // Si está en una tarjeta, buscar solo en esa tarjeta
        searchContainer = isInCard;
      } else {
        // Si no está en ninguno, buscar en toda la página
        searchContainer = document;
      }
      
      if (searchContainer) {
        // Cerrar otros dropdowns del mismo tipo en el mismo contexto
        const otherDropdowns = searchContainer.querySelectorAll(`details${isSectionDropdown ? '.section-details' : ':not(.section-details)'}[open]`);
        
        otherDropdowns.forEach(otherDropdown => {
          if (otherDropdown !== clickedDropdown) {
            otherDropdown.removeAttribute('open');
            if (otherDropdown.classList.contains('section-details')) {
              otherDropdown.classList.remove('open');
            }
          }
        });
      }
    }
  });
}

function setupFilterListeners() {
  const filterType = document.getElementById('filterType');
  const filterDate = document.getElementById('filterDate');
  const filterDurationMin = document.getElementById('filterDurationMin');
  const filterDurationMax = document.getElementById('filterDurationMax');
  const filterKeyword = document.getElementById('filterKeyword');
  const applyBtn = document.getElementById('applyFiltersBtn');
  const clearBtn = document.getElementById('clearFiltersBtn');
  
  // Auto-aplicar filtros al cambiar
  [filterType, filterDate, filterDurationMin, filterDurationMax].forEach(element => {
    if (element) {
      element.addEventListener('change', debounce(applyFilters, 300));
    }
  });
  
  if (filterKeyword) {
    filterKeyword.addEventListener('input', debounce(applyFilters, 500));
  }
  
  if (applyBtn) {
    applyBtn.addEventListener('click', applyFilters);
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }
}

function setupSelectionListeners() {
  const selectAllItems = document.getElementById('selectAllItems');
  
  if (selectAllItems) {
    selectAllItems.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const checkboxes = document.querySelectorAll('.card-checkbox input[type="checkbox"]');
      
      checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
        const itemKey = checkbox.dataset.itemKey;
        
        if (checked && allItemsMap.has(itemKey)) {
          selectedItems.set(itemKey, allItemsMap.get(itemKey));
        } else {
          selectedItems.delete(itemKey);
        }
      });
      
      updateSelectionUI();
    });
  }
}

function setupBatchActionListeners() {
  const batchDeleteBtn = document.getElementById('batchDeleteBtn');
  const batchSaveBtn = document.getElementById('batchSaveBtn');
  
  if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', handleBatchDelete);
  }
  
  if (batchSaveBtn) {
    batchSaveBtn.addEventListener('click', handleBatchSave);
  }
}

function setupExportListeners() {
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const importJsonInput = document.getElementById('importJsonInput');
  
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => exportData('json'));
  }
  
  if (exportHtmlBtn) {
    exportHtmlBtn.addEventListener('click', () => exportData('html'));
  }
  
  if (importJsonBtn) {
    importJsonBtn.addEventListener('click', () => {
      importJsonInput.click();
    });
  }
  
  if (importJsonInput) {
    importJsonInput.addEventListener('change', handleImportJson);
  }
}

// === Carga de datos ===
async function loadAllData() {
  try {
    // Limpiar cache de búsqueda al cargar nuevos datos
    clearSearchCache();
    
    const [videoHistory, adHistory] = await Promise.all([
      getHistoryData('video'),
      getHistoryData('ad')
    ]);
    
    // Combinar todos los datos en un solo historial
    const allData = [
      ...videoHistory.map(item => ({ ...item, type: 'video' })),
      ...adHistory.map(item => ({ ...item, type: 'ad' }))
    ];
    
    // Ordenar por timestamp (más reciente primero)
    allData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Aplicar filtros y renderizar
    await renderFilteredData(allData);
    
    // Actualizar hash de datos para el polling
    updateDataHash(videoHistory, adHistory);
    
    // Actualizar indicador de almacenamiento
    await updateStorageIndicator();
    
    // Actualizar indicador de datos en configuración
    await updateConfigStorageInfo();
    
  } catch (error) {
    console.error('Error cargando datos:', error);
    showEmptyState();
  }
}

// Función para actualizar el hash de datos
function updateDataHash(videoHistory, adHistory) {
  try {
    const dataString = JSON.stringify([
      videoHistory.map(item => ({ id: item.videoId, timestamp: item.timestamp })),
      adHistory.map(item => ({ id: item.adId, timestamp: item.timestamp }))
    ]);
    
    lastDataHash = btoa(dataString).substring(0, 32);
  } catch (error) {
    // Ignorar errores de actualización del hash
  }
}

async function renderFilteredData(allData) {
  const filteredData = filterData(allData);
  await renderCards(filteredData);
  if (viewMode === 'split' && filteredData.length > 0) {
    // Mostrar automáticamente el primer elemento en el panel de detalles
    const firstKey = makeItemKey(filteredData[0]);
    showDetailPane(firstKey);
  }
  updateHeaderStats(allData);
}

// Cache para texto de búsqueda para mejorar rendimiento
const searchTextCache = new Map();

// Función para limpiar el cache de búsqueda
function clearSearchCache() {
  searchTextCache.clear();
}

function filterData(data) {
  return data.filter(item => {
    // Filtro por tipo
    if (currentFilters.type !== 'all') {
      if (currentFilters.type === 'favorite' && !item.isFavorite) return false;
      if (currentFilters.type === 'video' && item.type !== 'video') return false;
      if (currentFilters.type === 'ad' && item.type !== 'ad') return false;
    }
    
    // Filtro por fecha
    if (currentFilters.date !== 'all') {
      const now = Date.now();
      const itemTime = item.timestamp || 0;
      const timeDiff = now - itemTime;
      
      switch (currentFilters.date) {
        case '24h':
          if (timeDiff > 24 * 60 * 60 * 1000) return false;
          break;
        case '7d':
          if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
          break;
        case '30d':
          if (timeDiff > 30 * 24 * 60 * 60 * 1000) return false;
          break;
      }
    }
    
    // Filtro por duración
    const duration = extractDuration(item);
    if (currentFilters.durationMin && duration < parseInt(currentFilters.durationMin)) return false;
    if (currentFilters.durationMax && duration > parseInt(currentFilters.durationMax)) return false;
    
    // Filtro por palabra clave (optimizado con cache)
    if (currentFilters.keyword) {
      const itemKey = makeItemKey(item);
      let searchText = searchTextCache.get(itemKey);
      
      if (!searchText) {
        searchText = extractSearchableText(item);
        searchTextCache.set(itemKey, searchText);
      }
      
      if (!searchText.includes(currentFilters.keyword.toLowerCase())) return false;
    }
    
    return true;
  });
}

function extractDuration(item) {
  // Extraer duración del anuncio o video
  if (item.adTypeInfo?.duration) {
    return Math.round(item.adTypeInfo.duration / 60); // Convertir a minutos
  }
  
  if (item.data) {
    try {
      const data = JSON.parse(item.data);
      const duration = data.items?.[0]?.contentDetails?.duration;
      if (duration) {
        return Math.round(parseISODurationToSeconds(duration) / 60);
      }
    } catch (e) {
      // Ignorar errores de parsing
    }
  }
  
  return 0;
}

function extractSearchableText(item) {
  let text = '';
  
  // Datos API/JSON
  if (item.data) {
    try {
      const data = JSON.parse(item.data);
      const snippet = data.items?.[0]?.snippet;
      if (snippet) {
        text += snippet.title + ' ';
        text += snippet.description + ' ';
        text += snippet.channelTitle + ' ';
      }
      
      // Incluir sponsorInfo si existe
      if (data._adHunt3r?.sponsorInfo) {
        const sponsorValues = Object.values(data._adHunt3r.sponsorInfo).filter(v => typeof v === 'string');
        text += sponsorValues.join(' ') + ' ';
      }
      
      // === NUEVO: Buscar en _adhunt3r_data si existe ===
      if (data._adhunt3r_data) {
        const adhunt3rData = data._adhunt3r_data;
        
        // Buscar en sponsorinfo
        if (adhunt3rData.sponsorinfo) {
          Object.values(adhunt3rData.sponsorinfo).forEach(val => {
            if (typeof val === 'string' || typeof val === 'number') {
              text += val + ' ';
            }
          });
        }
        
        // Buscar en adtypeinfo
        if (adhunt3rData.adtypeinfo) {
          Object.values(adhunt3rData.adtypeinfo).forEach(val => {
            if (typeof val === 'string' || typeof val === 'number') {
              text += val + ' ';
            }
          });
        }
      }
      
      // === NUEVO: Buscar en topicDetails (categorías) ===
      if (data.items?.[0]?.topicDetails?.topicCategories) {
        const topicCategories = data.items[0].topicDetails.topicCategories;
        topicCategories.forEach(url => {
          const match = url.match(/\/wiki\/(.+)$/);
          if (match) {
            text += decodeURIComponent(match[1].replace(/_/g, ' ')) + ' ';
          }
        });
      }
      
      // === NUEVO: Buscar en tags y keywords ===
      if (data.items?.[0]?.snippet?.tags) {
        text += data.items[0].snippet.tags.join(' ') + ' ';
      }
      
      if (data.items?.[0]?.snippet?.defaultLanguage) {
        text += data.items[0].snippet.defaultLanguage + ' ';
      }
      
      if (data.items?.[0]?.snippet?.defaultAudioLanguage) {
        text += data.items[0].snippet.defaultAudioLanguage + ' ';
      }
      
    } catch (e) {
      // Ignorar errores de parsing
    }
  }
  
  // Información de anuncio
  if (item.adTypeInfo) {
    const info = item.adTypeInfo;
    // Añadir todos los valores string/number
    Object.values(info).forEach(val => {
      if (typeof val === 'string' || typeof val === 'number') {
        text += val + ' ';
      }
    });
  }
  
  // === NUEVO: Buscar en campos adicionales del item ===
  if (item.channel) text += item.channel + ' ';
  if (item.title) text += item.title + ' ';
  if (item.adId) text += item.adId + ' ';
  if (item.videoId) text += item.videoId + ' ';
  
  // === NUEVO: Buscar en timestamp formateado ===
  if (item.timestamp) {
    const date = new Date(item.timestamp);
    text += date.toLocaleDateString() + ' ';
    text += date.toLocaleTimeString() + ' ';
  }
  
  return text.toLowerCase();
}

function parseISODurationToSeconds(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// === Renderizado de tarjetas ===
async function renderCards(data) {
  const container = document.getElementById('cardsContainer');
  
  if (!container) return;
  
  // Limpiar contenedor completamente
  container.innerHTML = '';
  
  // Forzar reflow para asegurar que el DOM se actualice
  container.offsetHeight;
  
  if (data.length === 0) {
    showEmptyState();
    return;
  }
  
  // Crear un fragmento de documento para mejor rendimiento
  const fragment = document.createDocumentFragment();
  
  // Renderizar tarjetas con animación escalonada
  data.forEach((item, index) => {
    const card = createCard(item);
    // Añadir clase de animación con delay
    card.style.animationDelay = `${index * 25}ms`;
    fragment.appendChild(card);
  });
  
  // Añadir todas las tarjetas de una vez
  container.appendChild(fragment);
  
  hideEmptyState();
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'history-card';
  
  const itemKey = makeItemKey(item);
  allItemsMap.set(itemKey, item);
  
  // === NUEVO: Almacenar JSON parseado al crear la tarjeta ===
  if (item.data) {
    try {
      const parsedData = JSON.parse(item.data);
      storeParsedJson(itemKey, parsedData);
    } catch (e) {
      console.warn('Error parseando JSON al crear tarjeta:', e);
    }
  }
  
  const info = extractVideoInfo(item);
  const tags = createTags(item, info);
  
  card.innerHTML = `
    <div class="card-header" data-item-key="${itemKey}">
      ${viewMode === 'split' ? `
        <div class="card-header-top">
      <div class="card-checkbox">
        <label class="checkbox-container">
          <input type="checkbox" data-item-key="${itemKey}">
          <span class="checkmark"></span>
        </label>
      </div>
          <div class="thumbnail-container">
      ${info.thumbnail ? `<img class="card-thumbnail" src="${info.thumbnail}" alt="Thumbnail">` : '<div class="card-thumbnail"></div>'}
            <div class="thumbnail-actions">
              ${!item.isFavorite ? 
                `<button class="icon-btn save-to-favorites-btn" data-item-key="${makeItemKey(item)}" title="Guardar"><i class="fas fa-star"></i></button>` :
                `<button class="icon-btn remove-from-favorites-btn" data-item-key="${makeItemKey(item)}" title="Quitar"><i class="fas fa-inbox"></i></button>`
              }
              ${item.adId || item.videoId ? 
                `<a href="https://www.youtube.com/watch?v=${item.adId || item.videoId}" target="_blank" class="icon-btn video-link-btn" title="Ver en YouTube"><i class="fab fa-youtube"></i></a>` : 
                ''
              }
            </div>
          </div>
          <div class="card-content">
            <div class="card-title">${info.title}</div>
            <div class="card-meta">
              <span class="card-channel">${info.channel}</span>
              <span class="card-timestamp">${formatTimestamp(item.timestamp)}</span>
            </div>
            <div class="card-tags">
              ${tags}
            </div>
          </div>
        </div>
      ` : `
        <div class="card-checkbox">
          <label class="checkbox-container">
            <input type="checkbox" data-item-key="${itemKey}">
            <span class="checkmark"></span>
          </label>
        </div>
        
        ${info.thumbnail ? `<img class="card-thumbnail" src="${info.thumbnail}" alt="Thumbnail">` : '<div class="card-thumbnail"></div>'}
      <div class="card-content">
        <div class="card-title">${info.title}</div>
        <div class="card-meta">
          <span class="card-channel">${info.channel}</span>
          <span class="card-timestamp">${formatTimestamp(item.timestamp)}</span>
        </div>
        <div class="card-tags">
          ${tags}
        </div>
      </div>
      `}
      
      ${viewMode === 'single' ? `
      <div class="card-actions">
        ${createActionButtons(item)}
        <button class="expand-btn" data-item-key="${itemKey}">
          <i class="fas fa-chevron-down"></i>
        </button>
      </div>
      ` : ''}
    </div>
    
    ${viewMode === 'split' ? '' : `
    <div class="card-details" id="details-${itemKey}">
      ${createCardDetails(item, info)}
    </div>
    `}
  `;
  
  // Añadir event listeners después de crear el HTML
  setupCardEventListeners(card, itemKey);
  
  return card;
}

function setupCardEventListeners(card, itemKey) {
  // Checkbox de selección
  const checkbox = card.querySelector('.card-checkbox input[type="checkbox"]');
  if (checkbox) {
    checkbox.addEventListener('change', (e) => {
      handleCardSelection(itemKey, e.target.checked);
    });
  }

  // Botón expandir/colapsar
  const expandBtn = card.querySelector('.expand-btn');
  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCardDetails(itemKey);
    });
  }

  // Hacer clic en la cabecera de la tarjeta para expandir/colapsar
  const cardHeader = card.querySelector('.card-header');
  if (cardHeader) {
    cardHeader.addEventListener('click', (e) => {
      // Evitar conflicto con el checkbox
      if (e.target.closest('.card-checkbox')) return;
      // Evitar conflicto con botones de acción
      if (e.target.closest('.action-btn') || e.target.closest('.expand-btn')) return;
      if (viewMode === 'split') {
        showDetailPane(itemKey);
      } else {
      toggleCardDetails(itemKey);
      }
    });
  }

  // Botones de acción (guardar/quitar favoritos)
  const saveBtns = card.querySelectorAll('.save-to-favorites-btn');
  saveBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleSaveToFavorites(itemKey);
    });
  });

  const removeBtns = card.querySelectorAll('.remove-from-favorites-btn');
  removeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRemoveFromFavorites(itemKey);
    });
  });

  // Botones en detalles expandidos
  const copyBtn = card.querySelector('.copy-data-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleCopyData(itemKey);
    });
  }

  const jsonBtn = card.querySelector('.toggle-json-btn');
  if (jsonBtn) {
    jsonBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleJsonView(itemKey);
    });
  }

  // Enlaces de video (prevenir propagación)
  const videoLinks = card.querySelectorAll('.video-link-btn');
  videoLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
  
  // NUEVO: Configurar listeners para dropdowns dentro de la tarjeta
  setupCardDropdownListeners(card);
}

// === NUEVA FUNCIÓN: Configurar listeners para dropdowns dentro de tarjetas ===
function setupCardDropdownListeners(card) {
  // Buscar todos los dropdowns dentro de la tarjeta
  const dropdowns = card.querySelectorAll('details');
  
  dropdowns.forEach(dropdown => {
    // Añadir listener para el evento toggle
    dropdown.addEventListener('toggle', (e) => {
      // Si se está abriendo el dropdown, cerrar otros del mismo tipo
      if (dropdown.hasAttribute('open')) {
        const isSectionDropdown = dropdown.classList.contains('section-details');
        const otherDropdowns = card.querySelectorAll(`details${isSectionDropdown ? '.section-details' : ':not(.section-details)'}[open]`);
        
        otherDropdowns.forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            otherDropdown.removeAttribute('open');
            if (otherDropdown.classList.contains('section-details')) {
              otherDropdown.classList.remove('open');
            }
          }
        });
      }
    });
  });
}

function createTags(item, info) {
  const tags = [];
  
  // Tag de tipo original (siempre mostrar primero)
  const originalTypeClass = `type-${item.type}`;
  const originalTypeIcon = item.type === 'video' ? 'fas fa-video' : 'fas fa-ad';
  const originalTypeText = item.type === 'video' ? 'Video' : 'Anuncio';
  tags.push(`<span class="tag ${originalTypeClass}"><i class="${originalTypeIcon}"></i> ${originalTypeText}</span>`);
  
  // Tag de favorito (si está marcado como favorito)
  if (item.isFavorite) {
    tags.push(`<span class="tag type-favorite"><i class="fas fa-star"></i> Favorito</span>`);
  }
  
  // Botón "Ir al video" inmediatamente después
  const videoId = item.adId || item.videoId;
  
  // VISIBILIDAD (si existe)
  if (info.visibility) {
    const statusClass = `status-${info.visibility}`;
    const statusText = {
      'public': 'Público',
      'private': 'Privado',
      'unlisted': 'Oculto'
    }[info.visibility] || info.visibility;
    tags.push(`<span class="tag ${statusClass}">${statusText}</span>`);
  }
  
  // --- ORDEN ESPECÍFICO PARA ANUNCIOS ---
  if (item.type === 'ad' && item.adTypeInfo?.type) {
    // Tag de subtipo de anuncio *después* de visibilidad
    tags.push(`<span class="tag ad-subtype"><i class="fas fa-bullhorn"></i> ${item.adTypeInfo.type}</span>`);
  }
  
  // === MEJORADO: Duración para anuncios ===
  if (item.type === 'ad') {
    let adDuration = null;
    
    // Buscar duración en adTypeInfo
    if (item.adTypeInfo?.duration && item.adTypeInfo.duration > 0) {
      adDuration = Math.round(item.adTypeInfo.duration);
    }
    
    // Si no se encontró en adTypeInfo, buscar en el JSON principal
    if (!adDuration && item.data) {
      try {
        const data = JSON.parse(item.data);
        // Buscar en _adhunt3r_data.adtypeinfo.duration
        if (data?._adhunt3r_data?.adtypeinfo?.duration && data._adhunt3r_data.adtypeinfo.duration > 0) {
          adDuration = Math.round(data._adhunt3r_data.adtypeinfo.duration);
        }
        // Buscar en contentDetails.duration del video
        else if (data?.items?.[0]?.contentDetails?.duration) {
          const isoDuration = data.items[0].contentDetails.duration;
          const seconds = parseISODurationToSeconds(isoDuration);
          if (seconds > 0 && seconds < 300) { // Solo si es razonable para un anuncio
            adDuration = Math.round(seconds);
          }
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }
    
    if (adDuration) {
      tags.push(`<span class="tag-duration" data-type="ad"><i class="fas fa-clock"></i> ${adDuration}s</span>`);
  }
  }
  
  // Duración para videos
  if (item.type === 'video' && info.videoDuration) {
    tags.push(`<span class="tag-duration"><i class="fas fa-play"></i> ${info.videoDuration}</span>`);
  }
  
  return tags.join('');
}

function createActionButtons(item) {
  const buttons = [];
  
  if (!item.isFavorite) {
    buttons.push(`
      <button class="action-btn primary save-to-favorites-btn" data-item-key="${makeItemKey(item)}" title="Guardar en favoritos">
        <i class="fas fa-star"></i>
      </button>
    `);
  } else {
    buttons.push(`
      <button class="action-btn remove-from-favorites-btn" data-item-key="${makeItemKey(item)}" title="Quitar de favoritos">
        <i class="fas fa-inbox"></i>
      </button>
    `);
  }
  
  // Botón ir al video
  const videoId = item.adId || item.videoId;
  if (videoId) {
    buttons.push(`
      <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="action-btn primary video-link-btn" title="Ver en YouTube">
        <i class="fas fa-play"></i>
      </a>
    `);
  }
  
  return buttons.join('');
}

// === NUEVA FUNCIÓN: Extraer detalles del JSON parseado ===
function extractDetailsFromParsedJson(parsedData, item) {
  const details = [];
  
  // Información básica del item
  if (item.timestamp) {
    details.push({ label: 'Fecha de Consulta', value: new Date(item.timestamp).toLocaleString() });
  }
  
  // Tamaño de la consulta
  if (item.data) {
    const dataSize = new Blob([item.data]).size;
    const sizeInKB = (dataSize / 1024).toFixed(1);
    const sizeInMB = (dataSize / 1024 / 1024).toFixed(2);
    const sizeText = dataSize >= 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    details.push({ label: 'Tamaño de Consulta', value: sizeText });
  }
  
  // Extraer información del JSON parseado
  if (parsedData && parsedData.items && parsedData.items.length > 0) {
    const firstItem = parsedData.items[0];
    const snippet = firstItem.snippet;
    const statistics = firstItem.statistics;
    const topicDetails = firstItem.topicDetails;
    
    // Información del canal
    if (snippet?.channelTitle) {
      details.push({ label: 'Canal', value: snippet.channelTitle });
    }
    
    // Fecha de publicación
    if (snippet?.publishedAt) {
      const publishedDate = new Date(snippet.publishedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      details.push({ label: 'Fecha de Publicación', value: publishedDate });
    }
    
    // Estadísticas
    if (statistics) {
      if (statistics.viewCount) {
        details.push({ label: 'Vistas', value: parseInt(statistics.viewCount).toLocaleString() });
      }
      if (statistics.likeCount) {
        details.push({ label: 'Me gusta', value: parseInt(statistics.likeCount).toLocaleString() });
      }
      if (statistics.commentCount) {
        details.push({ label: 'Comentarios', value: parseInt(statistics.commentCount).toLocaleString() });
      }
    }
    
    // Categorías de YouTube
    if (topicDetails?.topicCategories) {
      const categories = topicDetails.topicCategories.map(url => {
        const match = url.match(/\/wiki\/(.+)$/);
        return match ? decodeURIComponent(match[1].replace(/_/g, ' ')) : url;
      });
      if (categories.length > 0) {
        details.push({ label: 'Categorías', value: categories.join(', ') });
      }
    }
    
    // Tags
    if (snippet?.tags && snippet.tags.length > 0) {
      details.push({ label: 'Tags', value: snippet.tags.slice(0, 10).join(', ') });
    }
  }
  
  return details;
}

function createCardDetails(item, info) {
  const details = [];
  
  // Obtener JSON parseado
  let parsedData = null;
  if (window.currentParsedJson && window.currentParsedJson[item.adId || item.videoId]) {
    parsedData = window.currentParsedJson[item.adId || item.videoId];
  } else if (item.data) {
    try {
      parsedData = JSON.parse(item.data);
    } catch (e) {
      console.warn('Error parseando JSON para detalles:', e);
    }
        }
        
  // Información específica de anuncios según camposdetalles.md
  if (item.type === 'ad' && parsedData) {
    const snippet = parsedData.items?.[0]?.snippet;
    const statistics = parsedData.items?.[0]?.statistics;
    const adHunt3rData = parsedData._adhunt3r_data;
    
    // 1. Canal (channelTitle)
    if (snippet?.channelTitle) {
      details.push({ label: 'Canal', value: snippet.channelTitle });
      }
      
    // 2. Avatar anunciante (advertiserAvatarUrl) - 38x38
    if (adHunt3rData?.adtypeinfo?.advertiserAvatarUrl) {
        details.push({ 
        label: 'Avatar anunciante', 
        value: `<img src="${adHunt3rData.adtypeinfo.advertiserAvatarUrl}" alt="Avatar del anunciante" class="advertiser-avatar" style="width: 38px; height: 38px;" />` 
      });
      }
      
    // 3. Anunciante (anunciante)
    if (adHunt3rData?.sponsorinfo?.anunciante) {
      details.push({ label: 'Anunciante', value: adHunt3rData.sponsorinfo.anunciante });
      }
      
    // 4. Tema (tema)
    if (adHunt3rData?.sponsorinfo?.tema) {
        details.push({ label: 'Tema', value: adHunt3rData.sponsorinfo.tema });
      }
      
    // 5. Marca (marca)
    if (adHunt3rData?.sponsorinfo?.marca) {
        details.push({ label: 'Marca', value: adHunt3rData.sponsorinfo.marca });
      }
      
    // 6. Sponsored (sponsoredBy)
    if (adHunt3rData?.sponsorinfo?.sponsoredBy) {
      details.push({ label: 'Sponsored', value: adHunt3rData.sponsorinfo.sponsoredBy });
    }
    
    // 7. Fecha de publicación (publishedAt)
    if (snippet?.publishedAt) {
      const publishedDate = new Date(snippet.publishedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      details.push({ label: 'Fecha de publicación', value: publishedDate });
      }
      
    // 8. Miniaturas (thumbnails) - dropdown con links
    if (snippet?.thumbnails) {
      // Ordenar de mayor a menor tamaño
      const sizeOrder = ['maxres', 'highres', 'high', 'medium', 'standard', 'default'];
      const sortedThumbnails = Object.entries(snippet.thumbnails).sort(([a], [b]) => {
        const aIndex = sizeOrder.indexOf(a);
        const bIndex = sizeOrder.indexOf(b);
        return aIndex - bIndex; // Ordenar según el array sizeOrder
      });
      
      const thumbnailLinks = sortedThumbnails.map(([size, thumb]) => 
        `<a href="${thumb.url}" target="_blank" class="thumbnail-link" rel="noopener noreferrer">${size}</a>`
      ).join('');
        details.push({ 
        label: 'Miniaturas', 
        value: `<details><summary>Ver miniaturas (${Object.keys(snippet.thumbnails).length})</summary><div class="thumbnail-links">${thumbnailLinks}</div></details>` 
        });
      }
      
    // 9. Ubicación (ubicacion)
    if (adHunt3rData?.sponsorinfo?.ubicacion) {
      details.push({ label: 'Ubicación', value: adHunt3rData.sponsorinfo.ubicacion });
      }
      
    // 10. Views (viewCount)
    if (statistics?.viewCount) {
      details.push({ label: 'Views', value: parseInt(statistics.viewCount).toLocaleString() });
    }
    
    // 11. Likes (likeCount)
    if (statistics?.likeCount) {
      details.push({ label: 'Likes', value: parseInt(statistics.likeCount).toLocaleString() });
    }
    
    // 12. Comentarios (commentCount)
    if (statistics?.commentCount) {
      details.push({ label: 'Comentarios', value: parseInt(statistics.commentCount).toLocaleString() });
    }
    
    // 13. ID Categoría (categoryId)
    if (snippet?.categoryId) {
      details.push({ label: 'ID Categoría', value: snippet.categoryId });
    }
    
    // 14. Tema Wikipedia (topicCategories)
    if (parsedData.items?.[0]?.topicDetails?.topicCategories) {
      const topicCategories = parsedData.items[0].topicDetails.topicCategories;
      if (topicCategories && topicCategories.length > 0) {
        const categories = topicCategories.map(url => {
          const match = url.match(/\/wiki\/(.+)$/);
          return match ? decodeURIComponent(match[1].replace(/_/g, ' ')) : url;
        });
        details.push({ label: 'Tema Wikipedia', value: categories.join(', ') });
      }
    }
    
    // 15. Tipo de anuncio (type)
    if (adHunt3rData?.adtypeinfo?.type) {
      details.push({ label: 'Tipo de anuncio', value: adHunt3rData.adtypeinfo.type });
    }
    
    // 16. Posición (position)
    if (adHunt3rData?.adtypeinfo?.position) {
      details.push({ label: 'Posición', value: adHunt3rData.adtypeinfo.position });
    }
    
    // 17. Link del anunciante (link_anunciante) - hipervínculo
    if (adHunt3rData?.sponsorinfo?.link_anunciante) {
      details.push({ 
        label: 'Link del anunciante', 
        value: `<a href="${adHunt3rData.sponsorinfo.link_anunciante}" target="_blank" class="advertiser-link" rel="noopener noreferrer">${adHunt3rData.sponsorinfo.link_anunciante}</a>` 
      });
    }
    
    // 18. Video donde aparece el anuncio (ad_seenIn)
    if (adHunt3rData?.adtypeinfo?.ad_seenIn) {
      details.push({ 
        label: 'Dónde aparece', 
        value: `<a href="${adHunt3rData.adtypeinfo.ad_seenIn}" target="_blank" class="advertiser-link" rel="noopener noreferrer">${adHunt3rData.adtypeinfo.ad_seenIn.replace('https://www.youtube.com/watch?v=', '')}</a>` 
      });
    }
    
    // 19. Tags (tags) - desplegable
    if (snippet?.tags && snippet.tags.length > 0) {
      const tagsList = snippet.tags.slice(0, 10).join('\n');
      details.push({ 
        label: 'Tags', 
        value: `<details><summary>Ver tags (${snippet.tags.length})</summary><pre>${tagsList}</pre></details>` 
      });
    }
    }
    
  // Información específica de videos según camposdetalles.md
  if (item.type === 'video' && parsedData) {
    const snippet = parsedData.items?.[0]?.snippet;
    const statistics = parsedData.items?.[0]?.statistics;
    
    // 1. Canal (channelTitle)
    if (snippet?.channelTitle) {
      details.push({ label: 'Canal', value: snippet.channelTitle });
    }
    
    // 2. ID (id)
    if (parsedData.items?.[0]?.id) {
      details.push({ label: 'ID', value: parsedData.items[0].id });
  }
  
    // 3. Fecha de publicación (publishedAt)
      if (snippet?.publishedAt) {
      const publishedDate = new Date(snippet.publishedAt).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      details.push({ label: 'Fecha de publicación', value: publishedDate });
      }
      
    // 4. Views (viewCount)
      if (statistics?.viewCount) {
      details.push({ label: 'Views', value: parseInt(statistics.viewCount).toLocaleString() });
      }
      
    // 5. Likes (likeCount)
      if (statistics?.likeCount) {
      details.push({ label: 'Likes', value: parseInt(statistics.likeCount).toLocaleString() });
      }
      
    // 6. Comentarios (commentCount)
      if (statistics?.commentCount) {
        details.push({ label: 'Comentarios', value: parseInt(statistics.commentCount).toLocaleString() });
      }
      
    // 7. ID Categoría (categoryId)
    if (snippet?.categoryId) {
      details.push({ label: 'ID Categoría', value: snippet.categoryId });
      }
      
    // 8. Tema Wikipedia (topicCategories)
    if (parsedData.items?.[0]?.topicDetails?.topicCategories) {
      const topicCategories = parsedData.items[0].topicDetails.topicCategories;
        if (topicCategories && topicCategories.length > 0) {
        const categories = topicCategories.map(url => {
            const match = url.match(/\/wiki\/(.+)$/);
            return match ? decodeURIComponent(match[1].replace(/_/g, ' ')) : url;
          });
        details.push({ label: 'Tema Wikipedia', value: categories.join(', ') });
        }
      }
      
         // 9. Miniaturas (thumbnails) - dropdown con links
     if (snippet?.thumbnails) {
       // Ordenar de mayor a menor tamaño
       const sizeOrder = ['maxres', 'highres', 'high', 'medium', 'standard', 'default'];
       const sortedThumbnails = Object.entries(snippet.thumbnails).sort(([a], [b]) => {
         const aIndex = sizeOrder.indexOf(a);
         const bIndex = sizeOrder.indexOf(b);
         return aIndex - bIndex; // Ordenar según el array sizeOrder
       });
       
       const thumbnailLinks = sortedThumbnails.map(([size, thumb]) => 
         `<a href="${thumb.url}" target="_blank" class="thumbnail-link" rel="noopener noreferrer">${size}</a>`
       ).join('');
       details.push({ 
         label: 'Miniaturas', 
         value: `<details><summary>Ver miniaturas (${Object.keys(snippet.thumbnails).length})</summary><div class="thumbnail-links">${thumbnailLinks}</div></details>` 
       });
     }
    
    // 10. Idioma por defecto (defaultAudioLanguage)
    if (snippet?.defaultAudioLanguage) {
        const languageNames = {
          'es': 'Español', 'en': 'Inglés', 'fr': 'Francés', 'de': 'Alemán',
          'it': 'Italiano', 'pt': 'Portugués', 'ru': 'Ruso', 'ja': 'Japonés',
          'ko': 'Coreano', 'zh': 'Chino', 'ar': 'Árabe'
        };
      const languageName = languageNames[snippet.defaultAudioLanguage] || snippet.defaultAudioLanguage.toUpperCase();
      details.push({ label: 'Idioma por defecto', value: languageName });
      }
      
    // 11. Duración (duration)
    if (snippet?.duration) {
      details.push({ label: 'Duración', value: formatDuration(parseISODurationToSeconds(snippet.duration)) });
    }
    
    // 12. Tags (tags) - desplegable
    if (snippet?.tags && snippet.tags.length > 0) {
      const tagsList = snippet.tags.slice(0, 10).join('\n');
      details.push({ 
        label: 'Tags', 
        value: `<details><summary>Ver tags (${snippet.tags.length})</summary><pre>${tagsList}</pre></details>` 
      });
    }
  }
  
  const detailsGrid = details.map(detail => `
    <div class="detail-item">
      <div class="detail-label">${detail.label}</div>
      <div class="detail-value">${detail.value}</div>
      </div>
  `).join('');
  
  const videoId = item.adId || item.videoId;
  
  return `
    <div class="details-grid">
      ${detailsGrid}
    </div>
    <div class="detail-actions">
      <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="action-btn primary">
        <i class="fas fa-play"></i> Ir al video
      </a>
      <button class="action-btn copy-data-btn" data-item-key="${makeItemKey(item)}">
        <i class="fas fa-copy"></i> Copiar datos
      </button>
      <button class="action-btn toggle-json-btn" data-item-key="${makeItemKey(item)}">
        <i class="fas fa-code"></i> Ver JSON
      </button>
      </div>
    <div class="json-container" id="json-${makeItemKey(item)}" style="display: none;">
      <div class="json-content">${formatJsonForDisplay(item.data)}</div>
    </div>
  `;
}

// === Funciones de utilidad ===
function makeItemKey(item) {
  const id = item.adId || item.videoId;
  const type = item.type || (item.adId ? 'ad' : 'video');
  // Escapar caracteres especiales para IDs HTML válidos
  const cleanId = String(id).replace(/[^a-zA-Z0-9-_]/g, '_');
  const cleanTimestamp = String(item.timestamp || Date.now()).replace(/[^0-9]/g, '');
  return `${type}-${cleanId}-${cleanTimestamp}`;
}

function formatJsonForDisplay(jsonData) {
  if (!jsonData) {
    return 'No hay datos JSON disponibles';
  }
  
  try {
    const parsed = JSON.parse(jsonData);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return `Error al parsear JSON: ${error.message}\n\nDatos originales:\n${jsonData}`;
  }
}

// === NUEVA FUNCIÓN: Extraer información del JSON parseado ===
function extractInfoFromParsedJson(parsedData) {
  let title = '', channel = '', thumbnail = '', visibility = '', videoDuration = '';
  
  if (parsedData && parsedData.items && parsedData.items.length > 0) {
    const firstItem = parsedData.items[0];
    const snippet = firstItem.snippet;
    const contentDetails = firstItem.contentDetails;
    const status = firstItem.status;
      
      if (snippet) {
        title = snippet.title || '';
        channel = snippet.channelTitle || '';
        
        if (snippet.thumbnails) {
          thumbnail = snippet.thumbnails.medium?.url || 
                     snippet.thumbnails.default?.url || 
                     snippet.thumbnails.high?.url || '';
        }
      }
      
      if (status) {
        visibility = status.privacyStatus || '';
      }
      
      if (contentDetails?.duration) {
        videoDuration = formatDuration(parseISODurationToSeconds(contentDetails.duration));
      }
  }
  
  return { title, channel, thumbnail, visibility, videoDuration };
}

function extractVideoInfo(item) {
  let title = '', channel = '', thumbnail = '', visibility = '', videoDuration = '';
  
  if (item.data) {
    try {
      const data = JSON.parse(item.data);
      const extractedInfo = extractInfoFromParsedJson(data);
      
      title = extractedInfo.title;
      channel = extractedInfo.channel;
      thumbnail = extractedInfo.thumbnail;
      visibility = extractedInfo.visibility;
      videoDuration = extractedInfo.videoDuration;
      
    } catch (e) {
      title = '[Error: JSON inválido]';
    }
  }
  
  // Fallback para título
  if (!title) {
    title = item.adId || item.videoId || 'Sin título';
  }
  
  return { title, channel, thumbnail, visibility, videoDuration };
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Hoy ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Ayer ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString();
  }
}

// === Interacciones de tarjetas ===
function toggleCard(itemKey) {
  // Esta función se puede usar para futuras interacciones
}

function toggleCardDetails(itemKey) {

  const detailsElement = document.getElementById(`details-${itemKey}`);
  const expandBtn = document.querySelector(`[data-item-key="${itemKey}"].expand-btn`);
  

  
  if (detailsElement && expandBtn) {
    const isExpanded = detailsElement.classList.contains('expanded');
    
    if (isExpanded) {
      detailsElement.classList.remove('expanded');
      expandBtn.classList.remove('expanded');

    } else {
      detailsElement.classList.add('expanded');
      expandBtn.classList.add('expanded');
      
    }
  } else {

  }
}

// === NUEVA FUNCIÓN: Almacenar JSON parseado en contexto global ===
function storeParsedJson(itemKey, jsonData) {
  if (!window.currentParsedJson) {
    window.currentParsedJson = {};
  }
  window.currentParsedJson[itemKey] = jsonData;
}

function toggleJsonView(itemKey) {
  const jsonContainer = document.getElementById(`json-${itemKey}`);
  const button = document.querySelector(`[data-item-key="${itemKey}"].toggle-json-btn`);
  
  if (jsonContainer && button) {
    const isVisible = jsonContainer.style.display !== 'none';
    
    if (isVisible) {
      jsonContainer.style.display = 'none';
      button.innerHTML = '<i class="fas fa-code"></i> Ver JSON';
    } else {
      jsonContainer.style.display = 'block';
      button.innerHTML = '<i class="fas fa-code"></i> Ocultar JSON';
      
      // === NUEVO: Almacenar JSON parseado cuando se muestra ===
      const item = allItemsMap.get(itemKey);
      if (item && item.data) {
        try {
          const parsedData = JSON.parse(item.data);
          storeParsedJson(itemKey, parsedData);
        } catch (e) {
          console.warn('Error parseando JSON para almacenamiento:', e);
        }
      }
    }
  }
}

function handleCardSelection(itemKey, checked) {
  if (checked && allItemsMap.has(itemKey)) {
    selectedItems.set(itemKey, allItemsMap.get(itemKey));
  } else {
    selectedItems.delete(itemKey);
  }
  
  updateSelectionUI();
}

// === Funciones de refresco ===
async function refreshAllLists(preserveScrollPosition = true) {
  let scrollPos = 0;
  let scrollContainer = null;
  
  // Preservar la posición del scroll durante el refresco si se solicita
  if (preserveScrollPosition) {
    scrollContainer = findScrollContainer();
    scrollPos = getScrollPosition(scrollContainer);

  }
  
  // Limpiar caché para forzar lectura actualizada de chrome.storage
  if (storageCache && typeof storageCache.clear === 'function') {
    storageCache.clear();
  }
  
  // Limpiar completamente el contenedor antes de recargar
  const container = document.getElementById('cardsContainer');
  if (container) {
    container.innerHTML = '';
  }
  
  // Limpiar selecciones para evitar referencias obsoletas
  selectedItems.clear();
  allItemsMap.clear();
  
  // Recargar todos los datos
  await loadAllData();
  
  // Actualizar UI
  updateSelectionUI();
  
  // Actualizar indicadores de almacenamiento
  await updateStorageIndicator();
  await updateDataTypeIndicator();
  
  // Restaurar la posición del scroll después de esperar a que el contenido se renderice
  if (preserveScrollPosition && scrollContainer) {
    await waitForContentRender();
    setScrollPosition(scrollContainer, scrollPos);

  }
}

// Función auxiliar para encontrar el contenedor de scroll correcto
function findScrollContainer() {
  // En vista split, el scroll principal está en #cardsContainer
  if (viewMode === 'split') {
    const cardsContainer = document.getElementById('cardsContainer');
    if (cardsContainer && cardsContainer.scrollHeight > cardsContainer.clientHeight) {
      return cardsContainer;
    }
  }
  
  // En vista single, el scroll principal está en window/document
  // Primero verificar si window tiene scroll
  if (window.scrollY !== undefined && document.documentElement.scrollHeight > window.innerHeight) {
    return window;
  }
  
  // Si no, buscar en contenedores específicos
  const selectors = [
    '#cardsContainer',
    '.main-content',
    'body',
    '.app-container'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.scrollHeight > element.clientHeight) {
      return element;
    }
  }
  
  // Fallback al window
  return window;
}

// Función auxiliar para obtener la posición de scroll
function getScrollPosition(container) {
  if (!container) return 0;
  
  if (container === window) {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  } else {
    return container.scrollTop || 0;
  }
}

// Función auxiliar para establecer la posición de scroll
function setScrollPosition(container, position) {
  if (!container) return;
  
  if (container === window) {
    window.scrollTo(0, position);
  } else {
    container.scrollTop = position;
  }
}

// Función auxiliar para esperar a que el contenido se haya renderizado
function waitForContentRender() {
  return new Promise(resolve => {
    const container = document.getElementById('cardsContainer');
    
    if (!container || container.children.length === 0) {
      // Si no hay contenido, resolver inmediatamente
      requestAnimationFrame(resolve);
      return;
    }
    
    // Calcular el tiempo máximo de animación basado en el número de tarjetas
    const cardCount = container.children.length;
    const maxAnimationTime = cardCount * 25; // 25ms por tarjeta
    
    // Esperar a que las animaciones terminen
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    }, maxAnimationTime + 50); // 50ms adicionales como margen
  });
}

// Función auxiliar para ejecutar una función preservando el scroll
async function executeWithScrollPreservation(asyncFunction) {
  const scrollContainer = findScrollContainer();
  const scrollPos = getScrollPosition(scrollContainer);
  

  
  await asyncFunction();
  
  // Restaurar la posición del scroll después de esperar a que el contenido se renderice
  if (scrollContainer) {
    await waitForContentRender();
    setScrollPosition(scrollContainer, scrollPos);
    // console.log('[AdHunt3r] executeWithScrollPreservation - Scroll restaurado:', { 
    //   container: scrollContainer === window ? 'window' : scrollContainer?.tagName || 'unknown', 
    //   position: scrollPos,
    //   currentPosition: getScrollPosition(scrollContainer)
    // });
  }
}

function handleSaveToFavorites(itemKey) {
  const item = allItemsMap.get(itemKey);
  if (!item) return;
  
  return (async () => {
    // Preservar scroll antes de comenzar la operación
    const scrollContainer = findScrollContainer();
    const scrollPos = getScrollPosition(scrollContainer);
    
    try {
    showBatchProgress('Guardando en favoritos...');
      await markAsFavorite(item);
    
      // === NUEVO: Limpiar caché de storage para forzar lectura actualizada ===
      if (storageCache && typeof storageCache.clear === 'function') {
        storageCache.clear();
      }
    
    // Esperar para asegurar que storage se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
    
    showMsg('Guardado en favoritos', 'success');
      
      // === NUEVO: Forzar recarga completa de datos ===
      await loadAllData();
      
      // === NUEVO: Forzar actualización de contadores ===
      await forceUpdateCounters();
      
      // Restaurar scroll manualmente después de que todo esté listo
      await waitForContentRender();
      setScrollPosition(scrollContainer, scrollPos);
      
      // En vista split, mantener el elemento seleccionado en el panel de detalles
      if (viewMode === 'split') {
        // Buscar el elemento actualizado en el mapa
        const updatedItem = Array.from(allItemsMap.values()).find(mapItem => 
          (mapItem.adId === item.adId || mapItem.videoId === item.videoId) && 
          mapItem.timestamp === item.timestamp
        );
        if (updatedItem) {
          const updatedKey = makeItemKey(updatedItem);
          showDetailPane(updatedKey);
        }
      }
      
    } catch (error) {
    showMsg('Error al guardar en favoritos', 'error');
    } finally {
    hideBatchProgress();
    }
  })();
}

function handleRemoveFromFavorites(itemKey) {
  const item = allItemsMap.get(itemKey);
  if (!item) return;
  
  return (async () => {
    // Preservar scroll antes de comenzar la operación
    const scrollContainer = findScrollContainer();
    const scrollPos = getScrollPosition(scrollContainer);
    
    try {
    showBatchProgress('Quitando de favoritos...');
      await removeFromFavorites(item);
    
      // === NUEVO: Limpiar caché de storage para forzar lectura actualizada ===
      if (storageCache && typeof storageCache.clear === 'function') {
        storageCache.clear();
      }
    
    // Esperar para asegurar que storage se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
    
    showMsg('Quitado de favoritos', 'success');
      
      // === NUEVO: Forzar recarga completa de datos ===
      await loadAllData();
      
      // === NUEVO: Forzar actualización de contadores ===
      await forceUpdateCounters();
      
      // Restaurar scroll manualmente después de que todo esté listo
      await waitForContentRender();
      setScrollPosition(scrollContainer, scrollPos);
      
      // En vista split, mantener el elemento seleccionado en el panel de detalles
      if (viewMode === 'split') {
        // Buscar el elemento actualizado en el mapa
        const updatedItem = Array.from(allItemsMap.values()).find(mapItem => 
          (mapItem.adId === item.adId || mapItem.videoId === item.videoId) && 
          mapItem.timestamp === item.timestamp
        );
        if (updatedItem) {
          const updatedKey = makeItemKey(updatedItem);
          showDetailPane(updatedKey);
        }
      }
      
    } catch (error) {
    showMsg('Error al quitar de favoritos', 'error');
    } finally {
    hideBatchProgress();
    }
  })();
}

function handleCopyData(itemKey) {
  const item = allItemsMap.get(itemKey);
  if (!item?.data) return;
  
  navigator.clipboard.writeText(item.data)
    .then(() => showMsg('Datos copiados al portapapeles', 'success'))
    .catch(() => showMsg('Error al copiar datos', 'error'));
}

// === Filtros ===
function applyFilters() {
  // Actualizar filtros actuales
  currentFilters = {
    type: document.getElementById('filterType')?.value || 'all',
    date: document.getElementById('filterDate')?.value || 'all',
    durationMin: document.getElementById('filterDurationMin')?.value || '',
    durationMax: document.getElementById('filterDurationMax')?.value || '',
    keyword: document.getElementById('filterKeyword')?.value || ''
  };
  
  // Recargar datos con filtros preservando scroll
  executeWithScrollPreservation(loadAllData);
}

function clearFilters() {
  document.getElementById('filterType').value = 'all';
  document.getElementById('filterDate').value = 'all';
  document.getElementById('filterDurationMin').value = '';
  document.getElementById('filterDurationMax').value = '';
  document.getElementById('filterKeyword').value = '';
  
  currentFilters = {
    type: 'all',
    date: 'all',
    durationMin: '',
    durationMax: '',
    keyword: ''
  };
  
  executeWithScrollPreservation(loadAllData);
  showMsg('Filtros limpiados', 'info');
}

// === Selección y acciones por lotes ===
function updateSelectionUI() {
  const count = selectedItems.size;
  const selectionCount = document.getElementById('selectionCount');
  const batchActions = document.getElementById('batchActions');
  const batchDeleteBtn = document.getElementById('batchDeleteBtn');
  const batchSaveBtn = document.getElementById('batchSaveBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportHtmlBtn = document.getElementById('exportHtmlBtn');
  const selectAllItems = document.getElementById('selectAllItems');
  
  if (selectionCount) {
    selectionCount.textContent = `${count} seleccionados`;
  }
  
  // Mostrar acciones por lotes cuando hay elementos seleccionados
  if (batchActions) {
    batchActions.style.display = count > 0 ? 'flex' : 'none';
  }
  
  if (batchDeleteBtn) {
    batchDeleteBtn.disabled = count === 0;
  }
  
  if (batchSaveBtn) {
    batchSaveBtn.disabled = count === 0;
  }
  
  // Actualizar estado del checkbox "Seleccionar todo"
  if (selectAllItems) {
    const totalCheckboxes = document.querySelectorAll('.card-checkbox input[type="checkbox"]').length;
    if (count === 0) {
      selectAllItems.checked = false;
      selectAllItems.indeterminate = false;
    } else if (count === totalCheckboxes) {
      selectAllItems.checked = true;
      selectAllItems.indeterminate = false;
      } else {
      selectAllItems.checked = false;
      selectAllItems.indeterminate = true;
    }
  }
  
  // Activar/desactivar botones de exportación
  const hasSelection = count > 0;
  
  if (exportJsonBtn) {
    exportJsonBtn.disabled = !hasSelection;
    exportJsonBtn.title = hasSelection ? 'Exportar selección a JSON' : 'Selecciona elementos para exportar';
  }
  
  if (exportHtmlBtn) {
    exportHtmlBtn.disabled = !hasSelection;
    exportHtmlBtn.title = hasSelection ? 'Exportar selección a HTML' : 'Selecciona elementos para exportar';
  }
}

async function handleBatchDelete() {
  if (selectedItems.size === 0) return;
  
  if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedItems.size} elementos?`)) {
    return;
  }
  
  try {
    showBatchProgress('Eliminando elementos...');
    
    // Guardar el número de elementos a eliminar antes de limpiar
    const elementsToDelete = selectedItems.size;
    
    const operations = [];
    const toDeleteVideo = [];
    const toDeleteAd = [];
    
    selectedItems.forEach(item => {
      if (item.adId) {
        toDeleteAd.push(item);
      } else {
        toDeleteVideo.push(item);
      }
    });
    
    // Ejecutar operaciones de eliminación
    if (toDeleteVideo.length > 0) {
      operations.push(deleteFromHistory('video', toDeleteVideo));
    }
    
    if (toDeleteAd.length > 0) {
      operations.push(deleteFromHistory('ad', toDeleteAd));
    }
    
    // Esperar a que todas las operaciones se completen
    if (operations.length > 0) {
    await Promise.all(operations);
    }
    
    // === NUEVO: Limpiar caché de storage para forzar lectura actualizada ===
    if (storageCache && typeof storageCache.clear === 'function') {
      storageCache.clear();
    }
    
    // Esperar un momento para que las operaciones de storage se completen
    await new Promise(resolve => setTimeout(resolve, 200));
    
    clearSelections();
    
    // Preservar scroll manualmente
    const scrollContainer = findScrollContainer();
    const scrollPos = getScrollPosition(scrollContainer);
    
    // === NUEVO: Forzar recarga completa de datos ===
    await loadAllData();
    
    // === NUEVO: Forzar actualización de contadores ===
    await forceUpdateCounters();
    
    // Restaurar scroll después de que todo esté listo
    await waitForContentRender();
    setScrollPosition(scrollContainer, scrollPos);
    
    showMsg(`${elementsToDelete} elementos eliminados`, 'success');
    
  } catch (error) {
    showMsg('Error al eliminar elementos', 'error');
  } finally {
    hideBatchProgress();
  }
}

async function handleBatchSave() {
  if (selectedItems.size === 0) return;
  
  const itemsToSave = Array.from(selectedItems.values()).filter(item => !item.isFavorite);
  
  if (itemsToSave.length === 0) {
    showMsg('No hay elementos para guardar en favoritos', 'info');
    return;
  }
  
  try {
    showBatchProgress('Guardando en favoritos...');
    
    const operations = itemsToSave.map(item => markAsFavorite(item));
    await Promise.all(operations);
    
    // === NUEVO: Limpiar caché de storage para forzar lectura actualizada ===
    if (storageCache && typeof storageCache.clear === 'function') {
      storageCache.clear();
    }
    
    // Esperar un momento para que las operaciones de storage se completen
    await new Promise(resolve => setTimeout(resolve, 200));
    
    clearSelections();
    
    // Preservar scroll manualmente
    const scrollContainer = findScrollContainer();
    const scrollPos = getScrollPosition(scrollContainer);
    
    // === NUEVO: Forzar recarga completa de datos ===
    await loadAllData();
    
    // === NUEVO: Forzar actualización de contadores ===
    await forceUpdateCounters();
    
    // Restaurar scroll después de que todo esté listo
    await waitForContentRender();
    setScrollPosition(scrollContainer, scrollPos);
    
    showMsg(`${itemsToSave.length} elementos guardados en favoritos`, 'success');
    
  } catch (error) {
    showMsg('Error al guardar en favoritos', 'error');
  } finally {
    hideBatchProgress();
  }
}

function clearSelections() {
  selectedItems.clear();
  
  const checkboxes = document.querySelectorAll('.card-checkbox input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  const selectAllItems = document.getElementById('selectAllItems');
  if (selectAllItems) {
    selectAllItems.checked = false;
    selectAllItems.indeterminate = false;
  }
  
  updateSelectionUI();
}

// === Importación y Exportación ===

// Función para manejar la importación de archivos JSON
async function handleImportJson(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  try {
    showBatchProgress('Importando archivos JSON...');
    
    let totalImported = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    const maxFileSize = 25 * 1024; // 25KB en bytes
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Verificar tamaño del archivo
      if (file.size > maxFileSize) {
        console.warn(`Archivo ${file.name} excede el límite de 25KB`);
        totalErrors++;
        continue;
      }
      
      // Verificar tipo de archivo
      if (!file.name.toLowerCase().endsWith('.json')) {
        console.warn(`Archivo ${file.name} no es un archivo JSON válido`);
        totalErrors++;
        continue;
      }
      
      try {
        const content = await readFileAsText(file);
        const importedData = await processImportedJson(content, file.name);
        
        if (importedData.success) {
          totalImported += importedData.count;
          totalSkipped += importedData.skipped || 0;
        } else {
          totalErrors++;
        }
      } catch (error) {
        console.error(`Error procesando archivo ${file.name}:`, error);
        totalErrors++;
      }
    }
    
    // Limpiar el input
    event.target.value = '';
    
    // Mostrar resultados detallados
    let resultMessage = '';
    if (totalImported > 0) {
      resultMessage += `Importados ${totalImported} elementos exitosamente`;
      if (totalSkipped > 0) {
        resultMessage += `, ${totalSkipped} duplicados omitidos`;
      }
      showMsg(resultMessage, 'success');
      // Recargar datos para mostrar los nuevos elementos
      await refreshAllLists(false);
    }
    
    if (totalErrors > 0) {
      showMsg(`${totalErrors} archivos no pudieron ser importados`, 'warning');
    }
    
    if (totalImported === 0 && totalErrors === 0) {
      showMsg('No se encontraron elementos válidos para importar', 'info');
    }
    
  } catch (error) {
    console.error('Error en importación:', error);
    showMsg('Error al importar archivos', 'error');
  } finally {
    hideBatchProgress();
  }
}

// Función para leer archivo como texto
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsText(file);
  });
}

// Función para procesar JSON importado
async function processImportedJson(content, filename) {
  try {
    const jsonData = JSON.parse(content);
    let importedCount = 0;
    let skippedCount = 0;
    
    // Verificar si es un array o un objeto individual
    const items = Array.isArray(jsonData) ? jsonData : [jsonData];
    
    // Obtener historial existente para verificar duplicados
    const [existingVideos, existingAds] = await Promise.all([
      getHistoryData('video'),
      getHistoryData('ad')
    ]);
    
    for (const item of items) {
      try {
        // Validar estructura básica del item
        if (!isValidImportItem(item)) {
          console.warn(`Item inválido en ${filename}:`, item);
          continue;
        }
        
        // Determinar el tipo de consulta (video o anuncio)
        const itemType = determineItemType(item);
        if (!itemType) {
          console.warn(`No se pudo determinar el tipo de item en ${filename}`);
          continue;
        }
        
        // Preparar el item para almacenamiento
        const processedItem = prepareItemForStorage(item, itemType);
        
        // Verificar si ya existe un item similar
        const existingItems = itemType === 'video' ? existingVideos : existingAds;
        const idKey = itemType === 'video' ? 'videoId' : 'adId';
        const existingItem = existingItems.find(existing => 
          existing[idKey] === processedItem[idKey]
        );
        
        if (existingItem) {
          console.log(`Item duplicado encontrado en ${filename}: ${processedItem[idKey]}`);
          skippedCount++;
          continue;
        }
        
        // Guardar en el historial correspondiente
        await saveToHistory(itemType, processedItem);
        importedCount++;
        
      } catch (error) {
        console.error(`Error procesando item en ${filename}:`, error);
      }
    }
    
    return { 
      success: true, 
      count: importedCount, 
      skipped: skippedCount 
    };
    
  } catch (error) {
    console.error(`Error parseando JSON de ${filename}:`, error);
    return { success: false, count: 0, skipped: 0 };
  }
}

// Función para validar si un item es válido para importación
function isValidImportItem(item) {
  // Verificar que sea un objeto
  if (!item || typeof item !== 'object') return false;
  
  // === NUEVO: Detectar estructura de AdHunt3r ===
  // Si tiene la estructura de AdHunt3r (kind, items, etc.)
  if (item.kind && item.items && Array.isArray(item.items) && item.items.length > 0) {
    return true;
  }
  
  // === ESTRUCTURA ORIGINAL: Formato interno del historial ===
  // Verificar que tenga al menos un ID (videoId o adId)
  if (!item.videoId && !item.adId) return false;
  
  // Verificar que tenga datos
  if (!item.data) return false;
  
  return true;
}

// Función para determinar el tipo de item (video o anuncio)
function determineItemType(item) {
  // === NUEVO: Detectar estructura de AdHunt3r ===
  if (item.kind && item.items && Array.isArray(item.items) && item.items.length > 0) {
    // Si tiene _adhunt3r_data, es un anuncio
    if (item._adhunt3r_data) {
      return 'ad';
    }
    
    // Si tiene _adhunt3r_dbgData, es un video
    if (item._adhunt3r_dbgData) {
      return 'video';
    }
    
    // Si no tiene ninguno de los dos, intentar determinar por otros criterios
    const firstItem = item.items[0];
    if (firstItem && firstItem.snippet) {
      // Verificar si el título contiene palabras relacionadas con anuncios
      const adKeywords = ['anuncio', 'ad', 'sponsor', 'patrocinado', 'promoción'];
      const title = firstItem.snippet.title?.toLowerCase() || '';
      if (adKeywords.some(keyword => title.includes(keyword))) {
        return 'ad';
      }
    }
    
    // Por defecto, si tiene contentDetails, es un video
    if (firstItem && firstItem.contentDetails) {
      return 'video';
    }
  }
  
  // === ESTRUCTURA ORIGINAL: Formato interno del historial ===
  // Si tiene adId, es un anuncio
  if (item.adId) return 'ad';
  
  // Si tiene videoId, es un video
  if (item.videoId) return 'video';
  
  // Si tiene type explícito, usarlo
  if (item.type === 'ad' || item.type === 'video') {
    return item.type;
  }
  
  // Intentar determinar por el contenido de data
  try {
    const data = JSON.parse(item.data);
    
    // Si tiene _adhunt3r_data o _adHunt3r, probablemente es un anuncio
    if (data._adhunt3r_data || data._adHunt3r) {
      return 'ad';
    }
    
    // Si tiene items[0].contentDetails, probablemente es un video
    if (data.items && data.items[0] && data.items[0].contentDetails) {
      return 'video';
    }
    
    // Verificar si tiene estructura de anuncio
    if (data.items && data.items[0] && data.items[0].snippet) {
      const snippet = data.items[0].snippet;
      // Si el título contiene palabras relacionadas con anuncios
      const adKeywords = ['anuncio', 'ad', 'sponsor', 'patrocinado', 'promoción'];
      const title = snippet.title?.toLowerCase() || '';
      if (adKeywords.some(keyword => title.includes(keyword))) {
        return 'ad';
      }
    }
    
  } catch (error) {
    // Si no se puede parsear data, no podemos determinar el tipo
    console.warn('No se pudo parsear data para determinar tipo:', error);
    return null;
  }
  
  return null;
}

// Función para preparar item para almacenamiento
function prepareItemForStorage(item, type) {
  // === NUEVO: Procesar estructura de AdHunt3r ===
  if (item.kind && item.items && Array.isArray(item.items) && item.items.length > 0) {
    const firstItem = item.items[0];
    const videoId = firstItem.id;
    
    // Extraer timestamp de los datos de AdHunt3r
    let timestamp = Date.now();
    if (item._adhunt3r_data && item._adhunt3r_data.extractionTimestamp) {
      timestamp = item._adhunt3r_data.extractionTimestamp;
    } else if (item._adhunt3r_dbgData && item._adhunt3r_dbgData.timestamp) {
      timestamp = new Date(item._adhunt3r_dbgData.timestamp).getTime();
    }
    
    // Convertir el item completo a string para el campo data
    const dataString = JSON.stringify(item);
    
    const processedItem = {
      type: type,
      timestamp: timestamp,
      isFavorite: false,
      data: dataString
    };
    
    // Asignar el ID correcto según el tipo
    if (type === 'video') {
      processedItem.videoId = videoId;
    } else {
      processedItem.adId = videoId;
    }
    
    return processedItem;
  }
  
  // === ESTRUCTURA ORIGINAL: Formato interno del historial ===
  const processedItem = {
    ...item,
    type: type,
    timestamp: item.timestamp || Date.now(),
    isFavorite: item.isFavorite || false
  };
  
  // Asegurar que el ID esté en el formato correcto
  if (type === 'video' && !processedItem.videoId) {
    processedItem.videoId = item.adId || item.id || `imported_video_${Date.now()}`;
  }
  
  if (type === 'ad' && !processedItem.adId) {
    processedItem.adId = item.videoId || item.id || `imported_ad_${Date.now()}`;
  }
  
  // Validar que el data sea una cadena JSON válida
  if (processedItem.data && typeof processedItem.data === 'string') {
    try {
      JSON.parse(processedItem.data);
    } catch (error) {
      console.warn('Data JSON inválido, intentando reparar...');
      // Intentar reparar el JSON si es necesario
      processedItem.data = JSON.stringify(processedItem.data);
    }
  }
  
  // Asegurar que timestamp sea un número
  if (typeof processedItem.timestamp === 'string') {
    processedItem.timestamp = parseInt(processedItem.timestamp) || Date.now();
  }
  
  // Asegurar que isFavorite sea un booleano
  processedItem.isFavorite = Boolean(processedItem.isFavorite);
  
  return processedItem;
}

// === Exportación ===
async function exportData(format) {
  if (selectedItems.size === 0) {
    showMsg('Selecciona elementos para exportar', 'warning');
    return;
  }
  
  const items = Array.from(selectedItems.values());
  
  try {
    if (format === 'json') {
      // Exportar cada consulta como un archivo individual
      items.forEach((item, idx) => {
        const id = item.adId || item.videoId || `consulta_${idx+1}`;
        const fecha = item.timestamp ? new Date(item.timestamp).toISOString().replace(/[:.]/g, '-') : '';
        const nombre = `${item.type || 'consulta'}_${id}${fecha ? '_' + fecha : ''}.json`;
        
        // Exportar el contenido del campo 'data' parseado en lugar del objeto completo
        let contenido;
        if (item.data) {
          try {
            // Parsear el JSON del campo data y exportarlo directamente
            contenido = JSON.stringify(JSON.parse(item.data), null, 2);
          } catch (e) {
            // Si no se puede parsear, exportar el objeto completo como fallback
            contenido = JSON.stringify(item, null, 2);
          }
        } else {
          // Si no hay data, exportar el objeto completo
          contenido = JSON.stringify(item, null, 2);
        }
        
        downloadFile(contenido, nombre, 'application/json');
      });
      showMsg(`Exportadas ${items.length} consultas como archivos JSON individuales`, 'success');
      return;
    }
    
    let content, filename, mimeType;
    switch (format) {
      case 'html':
        content = convertToHTML(items);
        filename = 'adhunt3r_export.html';
        mimeType = 'text/html';
        break;
      default:
        throw new Error('Formato no soportado');
    }
    downloadFile(content, filename, mimeType);
    showMsg(`Datos exportados en formato ${format.toUpperCase()}`, 'success');
  } catch (error) {
    showMsg('Error al exportar datos', 'error');
  }
}

function convertToHTML(items) {
  // Crear una estructura moderna con desplegables por sección
  const itemsHtml = items.map((item, index) => {
    const fields = extractAllFields(item);
    const info = extractVideoInfo(item);
    
    // === NUEVO: Organizar campos según la estructura del JSON original ===
    const sections = {
      basic: {},
      items: {},
      _adhunt3r_data: {},
      _adhunt3r_dbgData: {},
      other: {}
    };
    
    // Clasificar campos según la estructura del JSON
    Object.entries(fields).forEach(([key, value]) => {
      // === DATOS BÁSICOS ===
      if (['type', 'adId', 'videoId', 'timestamp', 'isFavorite'].includes(key)) {
        sections.basic[key] = value;
      }
      // === DATOS DE LA API DE YOUTUBE (items) ===
      else if (key.includes('items.') || key.includes('kind') || key.includes('pageInfo')) {
        sections.items[key] = value;
      }
      // === DATOS DE ADHUNT3R PARA ANUNCIOS ===
      else if (key.includes('_adhunt3r_data') || key.includes('adtypeinfo') || key.includes('sponsorinfo')) {
        sections._adhunt3r_data[key] = value;
      }
      // === DATOS DE DEBUG PARA VIDEOS ===
      else if (key.includes('_adhunt3r_dbgData') || key.includes('debug')) {
        sections._adhunt3r_dbgData[key] = value;
      }
      // === OTROS DATOS ===
      else {
        sections.other[key] = value;
      }
    });
    
    // Crear secciones HTML con desplegables SOLO en la sección
    const sectionsHtml = Object.entries(sections)
      .filter(([_, data]) => Object.keys(data).length > 0)
      .map(([sectionKey, sectionData]) => {
        const sectionTitle = getSectionTitle(sectionKey);
        const sectionIcon = getSectionIcon(sectionKey);
    return `
          <div class="section-container">
            <details class="section-details" open>
              <summary class="section-summary">
                <i class="fas ${sectionIcon}"></i>
                <span class="section-title">${sectionTitle}</span>
                <span class="section-count">${Object.keys(sectionData).length} campos</span>
              </summary>
              <div class="section-content">
                <div class="fields-grid">
                  ${Object.entries(sectionData).map(([key, value]) => {
                    // Mostrar objetos/arrays como <pre> plano, strings normales
                    let displayValue;
                    if (typeof value === 'object' && value !== null) {
                      displayValue = `<pre>${JSON.stringify(value, null, 2)}</pre>`;
                    } else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                      try {
                        const parsed = JSON.parse(value);
                        displayValue = `<pre>${JSON.stringify(parsed, null, 2)}</pre>`;
                      } catch (e) {
                        displayValue = value;
                      }
                    } else {
                      displayValue = value;
                    }
                    return `
                    <div class="field-card">
                      <div class="field-header">
                        <span class="field-label">${formatFieldLabel(key)}</span>
                        ${getFieldBadge(key)}
                      </div>
                      <div class="field-value">
                          ${displayValue}
                      </div>
                    </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </details>
          </div>
        `;
      }).join('');
    
    return `
      <div class="item-card">
        <div class="item-header">
          <div class="item-title">
            <h2>
              <i class="fas ${item.type === 'ad' ? 'fa-ad' : 'fa-video'}"></i>
              Elemento ${index + 1} - ${item.type === 'ad' ? 'Anuncio' : 'Video'}
            </h2>
            ${item.isFavorite ? '<span class="favorite-badge"><i class="fas fa-star"></i> Favorito</span>' : ''}
          </div>
          <div class="item-meta">
            <div class="meta-item">
              <i class="fas fa-fingerprint"></i>
              <span class="meta-label">ID:</span>
              <span class="meta-value">${item.adId || item.videoId || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-calendar"></i>
              <span class="meta-label">Fecha:</span>
              <span class="meta-value">${item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-database"></i>
              <span class="meta-label">Campos:</span>
              <span class="meta-value">${Object.keys(fields).length}</span>
            </div>
          </div>
        </div>
        <div class="item-content">
          ${sectionsHtml}
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exportación AdHunt3r - Datos Completos</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          
          .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #68bd18,rgb(44, 126, 203));
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
            border: 3px solid #e1e8ed;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          
          .header-content {
            position: relative;
            z-index: 1;
          }
          
          .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            font-weight: 300;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .header p {
            font-size: 1.2em;
            opacity: 0.9;
            margin-bottom: 30px;
          }
          
          .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 30px;
            margin-top: 30px;
          }
          
          .info-item {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
          }
          
          .info-item .number {
            font-size: 2.5em;
            font-weight: bold;
            display: block;
            margin-bottom: 5px;
          }
          
          .info-item .label {
            font-size: 0.9em;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .item-card {
            background: white;
            border: 1px solid #e1e8ed;
            border-radius: 16px;
            margin-bottom: 40px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
          }
          
          .item-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(0,0,0,0.12);
          }
          
          .item-header {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 25px;
            border-bottom: 1px solid #e1e8ed;
          }
          
          .item-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
          }
          
          .item-title h2 {
            color: #2c3e50;
            font-size: 1.8em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .item-title h2 i {
            color: #68bd18;
          }
          
          .favorite-badge {
            background: linear-gradient(135deg, #ffc107, #ff9800);
            color: #212529;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
          }
          
          .item-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          
          .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.95em;
            color: #6c757d;
          }
          
          .meta-item i {
            color: #68bd18;
            width: 16px;
          }
          
          .meta-label {
            font-weight: 600;
          }
          
          .meta-value {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.9em;
          }
          
          .item-content {
            padding: 30px;
          }
          
          .section-container {
            margin-bottom: 25px;
          }
          
          .section-details {
            border: 1px solid #e1e8ed;
            border-radius: 12px;
            overflow: hidden;
            background: #fafbfc;
          }
          
          .section-summary {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            color: #495057;
            transition: all 0.3s ease;
            border-bottom: 1px solid #e1e8ed;
          }
          
          .section-summary:hover {
            background: linear-gradient(135deg, #e9ecef, #dee2e6);
          }
          
          .section-summary::-webkit-details-marker {
            display: none;
          }
          
          .section-summary::after {
            content: '\\f107';
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
            margin-left: auto;
            transition: transform 0.3s ease;
          }
          
          .section-details[open] .section-summary::after {
            transform: rotate(180deg);
          }
          
          .section-title {
            font-size: 1.1em;
            color: #2c3e50;
          }
          
          .section-count {
            background: #68bd18;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
          }
          
          .section-content {
            padding: 20px;
          }
          
          .fields-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
          }
          
          .field-card {
            background: white;
            border: 1px solid #e1e8ed;
            border-radius: 10px;
            padding: 16px;
            transition: all 0.3s ease;
          }
          
          .field-card:hover {
            border-color: #68bd18;
            box-shadow: 0 4px 12px rgba(104, 189, 24, 0.1);
          }
          
          .field-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          
          .field-label {
            font-weight: 600;
            color: #495057;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .field-badge {
            background: #e9ecef;
            color: #6c757d;
            padding: 2px 8px;
            border-radius: 8px;
            font-size: 0.7em;
            font-weight: 600;
          }
          
          /* === NUEVO: Estilos para badges de posición y tipo de anuncio === */
          .position-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-block;
            margin: 2px;
          }
          
          .position-pre_roll {
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
          }
          
          .position-mid_roll {
            background: linear-gradient(135deg, #4ecdc4, #44a08d);
            color: white;
          }
          
          .position-post_roll {
            background: linear-gradient(135deg, #45b7d1, #96c93d);
            color: white;
          }
          
          .position-unknown {
            background: linear-gradient(135deg, #95a5a6, #7f8c8d);
            color: white;
          }
          
          .ad-type-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-block;
            margin: 2px;
          }
          
          .ad-type-skippable {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
          }
          
          .ad-type-non_skippable {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
          }
          
          .ad-type-bumper {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
          }
          
          .ad-type-unknown {
            background: linear-gradient(135deg, #95a5a6, #7f8c8d);
            color: white;
          }
          
          /* === NUEVO: Estilos para datos de debug y AdHunt3r === */
          .debug-data {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 2px solid #6c757d;
            color: #495057;
            font-family: 'Courier New', monospace;
            font-size: 0.8em;
            line-height: 1.4;
            max-height: 400px;
            overflow: auto;
          }
          
          .adhunt3r-data {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            border: 2px solid #ffc107;
            color: #856404;
            font-family: 'Courier New', monospace;
            font-size: 0.8em;
            line-height: 1.4;
            max-height: 400px;
            overflow: auto;
          }
          
          .long-content {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 1px solid #dee2e6;
            color: #495057;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            line-height: 1.4;
            max-height: 300px;
            overflow: auto;
          }
          
          .field-value {
            color: #2c3e50;
            word-wrap: break-word;
            line-height: 1.5;
            font-size: 0.95em;
          }
          
          .field-value a {
            color: #0066cc;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.3s ease;
          }
          
          .field-value a:hover {
            border-bottom-color: #0066cc;
          }
          
          .field-value details {
            margin-top: 8px;
          }
          
          .field-value summary {
            color: #0066cc;
            cursor: pointer;
            font-weight: 500;
            padding: 8px 0;
          }
          
          .field-value pre {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
            margin-top: 8px;
            font-size: 0.85em;
            max-height: 300px;
            overflow: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            border: 1px solid #e1e8ed;
          }
          
          .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
          }
          
          .tag {
            background: linear-gradient(135deg, #68bd18, #5ecb2c);
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
            box-shadow: 0 2px 4px rgba(104, 189, 24, 0.2);
          }
          
          .empty-value {
            color: #6c757d;
            font-style: italic;
            font-size: 0.9em;
          }
          
          @media (max-width: 768px) {
            .header h1 {
              font-size: 2em;
            }
            
            .header-info {
              grid-template-columns: 1fr;
              gap: 15px;
            }
            
            .item-meta {
              grid-template-columns: 1fr;
            }
            
            .fields-grid {
              grid-template-columns: 1fr;
            }
            
            .section-summary {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
            }
            
            .section-count {
              align-self: flex-end;
            }
          }
          
          /* Animaciones */
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .item-card {
            animation: fadeInUp 0.6s ease-out;
          }
          
          .item-card:nth-child(1) { animation-delay: 0.1s; }
          .item-card:nth-child(2) { animation-delay: 0.2s; }
          .item-card:nth-child(3) { animation-delay: 0.3s; }
          .item-card:nth-child(4) { animation-delay: 0.4s; }
          .item-card:nth-child(5) { animation-delay: 0.5s; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-content">
              <h1>📊 Historial AdHunt3r</h1>
              <p>Exportación completa de datos</p>
              <div class="header-info">
                <div class="info-item">
                  <span class="number">${items.length}</span>
                  <span class="label">Elementos exportados</span>
                </div>
                <div class="info-item">
                  <span class="number">${new Date().toLocaleDateString()}</span>
                  <span class="label">Fecha de exportación</span>
                </div>
                <div class="info-item">
                  <span class="number">${getAllHeaders(items).length}</span>
                  <span class="label">Campos únicos</span>
                </div>
                <div class="info-item">
                  <span class="number">${items.filter(item => item.isFavorite).length}</span>
                  <span class="label">Favoritos</span>
                </div>
              </div>
            </div>
          </div>
          <div class="content">
            ${itemsHtml}
          </div>
        </div>
      </body>
    </html>
  `;
}

// Funciones auxiliares para mejorar la visualización
function getSectionTitle(sectionKey) {
  const titles = {
    basic: 'Información Básica',
    items: 'Datos de la API de YouTube',
    _adhunt3r_data: 'Datos de AdHunt3r (Anuncio)',
    _adhunt3r_dbgData: 'Datos de Debug (Video)',
    other: 'Otros Datos'
  };
  return titles[sectionKey] || 'Datos';
}

function getSectionIcon(sectionKey) {
  const icons = {
    basic: 'fa-info-circle',
    items: 'fa-youtube',
    _adhunt3r_data: 'fa-ad',
    _adhunt3r_dbgData: 'fa-bug',
    other: 'fa-ellipsis-h'
  };
  return icons[sectionKey] || 'fa-database';
}

function getFieldBadge(key) {
  if (key.includes('url') || key.includes('link') || key.includes('href')) {
    return '<span class="field-badge">🔗 Enlace</span>';
  }
  if (key.includes('timestamp') || key.includes('publishedAt')) {
    return '<span class="field-badge">📅 Fecha</span>';
  }
  if (key.includes('tags')) {
    return '<span class="field-badge">🏷️ Tags</span>';
  }
  if (key.includes('thumbnail') || key.includes('avatar')) {
    return '<span class="field-badge">🖼️ Imagen</span>';
  }
  if (key.includes('duration')) {
    return '<span class="field-badge">⏱️ Duración</span>';
  }
  if (key.includes('count') || key.includes('views') || key.includes('likes')) {
    return '<span class="field-badge">📊 Estadística</span>';
  }
  // === NUEVO: Badges para campos de posición y debug ===
  if (key.includes('position')) {
    return '<span class="field-badge">📍 Posición</span>';
  }
  if (key.includes('_adhunt3r_dbgData') || key.includes('debug')) {
    return '<span class="field-badge">🐛 Debug</span>';
  }
  if (key.includes('_adhunt3r_data') || key.includes('adtypeinfo') || key.includes('sponsorinfo')) {
    return '<span class="field-badge">🎯 AdHunt3r</span>';
  }
  return '';
}

function formatFieldLabel(key) {
  // Convertir camelCase a palabras separadas y mejorar legibilidad
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/\./g, ' → ')
    .replace(/\[(\d+)\]/g, ' [$1]')
    .replace(/items → 0 → /g, '')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatFieldValue(key, value) {
  if (!value || value === '') {
    return '<span class="empty-value">No disponible</span>';
  }
  
  // Si es un enlace, hacerlo clickeable
  if (key.includes('url') || key.includes('link') || key.includes('href') || 
      key.includes('thumbnail') || key.includes('avatar') || key.includes('channelId')) {
    if (value && value.startsWith('http')) {
      return `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
    }
  }
  
  // === NUEVO: Formatear campos de posición de anuncios ===
  if (key.includes('position')) {
    const positionMap = {
      'pre_roll': 'Pre-roll (Inicio del video)',
      'mid_roll': 'Mid-roll (Durante el video)',
      'post_roll': 'Post-roll (Final del video)',
      'unknown': 'Desconocida'
    };
    const displayValue = positionMap[value] || value;
    return `<span class="position-badge position-${value}">${displayValue}</span>`;
  }
  
  // === NUEVO: Formatear campos de tipo de anuncio ===
  if (key.includes('type') && (key.includes('adtypeinfo') || key.includes('adInfo'))) {
    const typeMap = {
      'skippable': 'Saltable',
      'non_skippable': 'No saltable',
      'bumper': 'Bumper',
      'non_skippable_short': 'No saltable corto',
      'non_skippable_medium': 'No saltable medio',
      'non_skippable_long': 'No saltable largo',
      'unknown': 'Desconocido'
    };
    const displayValue = typeMap[value] || value;
    return `<span class="ad-type-badge ad-type-${value}">${displayValue}</span>`;
  }
  
  // === NUEVO: Formatear campos de debug ===
  if (key.includes('_adhunt3r_dbgData') || key.includes('debug')) {
    try {
      const debugData = typeof value === 'string' ? JSON.parse(value) : value;
      return `<pre class="debug-data">${JSON.stringify(debugData, null, 2)}</pre>`;
    } catch (e) {
      return `<pre class="debug-data">${value}</pre>`;
    }
  }
  
  // === NUEVO: Formatear campos de datos AdHunt3r ===
  if (key.includes('_adhunt3r_data') || key.includes('adtypeinfo') || key.includes('sponsorinfo')) {
    try {
      const adData = typeof value === 'string' ? JSON.parse(value) : value;
      return `<pre class="adhunt3r-data">${JSON.stringify(adData, null, 2)}</pre>`;
    } catch (e) {
      return `<pre class="adhunt3r-data">${value}</pre>`;
    }
  }
  
  // === NUEVO: Formatear campos largos sin desplegables ===
  if (value.length > 150) {
    return `<pre class="long-content">${value}</pre>`;
  }
  
  // Si contiene tags separados por comas, mostrarlos como badges
  if (key.includes('tags') && value.includes(',')) {
    const tags = value.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`);
    return `<div class="tags-container">${tags.join('')}</div>`;
  }
  
  // Si es un timestamp, formatearlo
  if (key.includes('timestamp') || key.includes('publishedAt')) {
    try {
      const date = new Date(value);
      return `${date.toLocaleString()} <br><small>(${value})</small>`;
    } catch (e) {
      return value;
    }
  }
  
  // Si es un número grande, formatearlo
  if (key.includes('count') || key.includes('views') || key.includes('likes') || key.includes('subscribers')) {
    const num = parseInt(value);
    if (!isNaN(num) && num > 1000) {
      return `${num.toLocaleString()} <br><small>(${value})</small>`;
    }
  }
  
  return value;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// === Estados de UI ===
function showLoadingState(show) {
  const loadingState = document.getElementById('loadingState');
  if (loadingState) {
    loadingState.style.display = show ? 'flex' : 'none';
  }
}

function showEmptyState() {
  const emptyState = document.getElementById('emptyState');
  if (emptyState) {
    emptyState.style.display = 'flex';
  }
}

function hideEmptyState() {
  const emptyState = document.getElementById('emptyState');
  if (emptyState) {
    emptyState.style.display = 'none';
  }
}

function showBatchProgress(message) {
  const overlay = document.getElementById('batchProgressOverlay');
  const messageElement = document.getElementById('batchProgressMsg');
  
  if (overlay && messageElement) {
    messageElement.textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideBatchProgress() {
  const overlay = document.getElementById('batchProgressOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function updateHeaderStats(allData) {
  if (!allData) return;
  
  // Contar videos
  const videoCount = allData.filter(item => item.type === 'video').length;
  
  // Contar anuncios
  const adCount = allData.filter(item => item.type === 'ad').length;
  
  // Contar favoritos (elementos marcados como favoritos)
  const favoriteCount = allData.filter(item => item.isFavorite).length;
  
  const totalVideos = document.getElementById('totalVideos');
  const totalAds = document.getElementById('totalAds');
  const totalFavorites = document.getElementById('totalFavorites');
  
  if (totalVideos) totalVideos.textContent = videoCount;
  if (totalAds) totalAds.textContent = adCount;
  if (totalFavorites) totalFavorites.textContent = favoriteCount;
}

// === NUEVA FUNCIÓN: Forzar actualización de contadores ===
async function forceUpdateCounters() {
  try {
    // Limpiar caché para forzar lectura actualizada
    if (storageCache && typeof storageCache.clear === 'function') {
      storageCache.clear();
    }
    
    // Recargar datos frescos
    const [videoHistory, adHistory] = await Promise.all([
      getHistoryData('video'),
      getHistoryData('ad')
    ]);
    
    // Combinar todos los datos
    const allData = [
      ...videoHistory.map(item => ({ ...item, type: 'video' })),
      ...adHistory.map(item => ({ ...item, type: 'ad' }))
    ];
    
    // Actualizar contadores
    updateHeaderStats(allData);
  } catch (error) {
    console.error('[AdHunt3r] Error forzando actualización de contadores:', error);
  }
}

// === Funciones auxiliares ===
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// === Funciones de favoritos (simplificadas) ===
async function markItemAsFavorite(item) {
  return markAsFavorite(item);
}

async function removeItemFromFavorites(item) {
  return removeFromFavorites(item);
}

async function deleteFromHistory(type, items) {
  const history = await getHistoryData(type);
  const idKey = type === 'ad' ? 'adId' : 'videoId';
  
  const toRemove = new Set(items.map(item => `${item[idKey]}-${item.timestamp}`));
  const filtered = history.filter(e => !toRemove.has(`${e[idKey]}-${e.timestamp}`));
  
  await storageCache.set(type === 'ad' ? 'ytad_history' : 'ytdata_history', filtered);
  return filtered;
}

// Función para verificar cambios inmediatamente
async function checkForChangesImmediately() {
  try {
    const [videoHistory, adHistory] = await Promise.all([
      getHistoryData('video'),
      getHistoryData('ad')
    ]);
    
    // Crear hash de los datos actuales
    const dataString = JSON.stringify([
      videoHistory.map(item => ({ id: item.videoId, timestamp: item.timestamp })),
      adHistory.map(item => ({ id: item.adId, timestamp: item.timestamp }))
    ]);
    
    const currentHash = btoa(dataString).substring(0, 32);
    
    if (lastDataHash && lastDataHash !== currentHash) {
      executeWithScrollPreservation(loadAllData);
    }
  } catch (error) {
    // Ignorar errores de verificación
  }
}

// === Funciones auxiliares para extraer todos los campos del JSON ===

// Función para aplanar un objeto JSON y convertir todos los campos a strings
function flattenJsonObject(obj, prefix = '') {
  const flattened = {};
  
  function flatten(current, path = '') {
    if (current === null || current === undefined) {
      flattened[path] = '';
      return;
    }
    
    if (typeof current === 'object' && !Array.isArray(current)) {
      for (const key in current) {
        if (current.hasOwnProperty(key)) {
          flatten(current[key], path ? `${path}.${key}` : key);
        }
      }
    } else if (Array.isArray(current)) {
      // Para arrays, crear campos separados para cada elemento
      current.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          flatten(item, `${path}[${index}]`);
        } else {
          // Para arrays de strings simples, unirlos con comas
          if (typeof item === 'string' && path.includes('tags')) {
            if (!flattened[path]) {
              flattened[path] = [];
            }
            flattened[path].push(item);
          } else {
            flattened[`${path}[${index}]`] = String(item || '');
          }
        }
      });
      
      // Si acumulamos strings en un array, unirlos
      if (flattened[path] && Array.isArray(flattened[path])) {
        flattened[path] = flattened[path].join(', ');
      }
    } else {
      flattened[path] = String(current || '');
    }
  }
  
  flatten(obj);
  return flattened;
}

// Función para extraer todos los campos de un item del historial
function extractAllFields(item) {
  const fields = {};
  
  // Extraer campos del JSON principal si existe (este es el formato que queremos)
  if (item.data) {
    try {
      const jsonData = JSON.parse(item.data);
      const jsonFlattened = flattenJsonObject(jsonData, '');
      Object.assign(fields, jsonFlattened);
    } catch (e) {
      // Si no se puede parsear, usar campos básicos como fallback
      fields['type'] = item.type || '';
      fields['adId'] = item.adId || '';
      fields['videoId'] = item.videoId || '';
      fields['timestamp'] = item.timestamp ? new Date(item.timestamp).toISOString() : '';
      fields['isFavorite'] = item.isFavorite ? 'true' : 'false';
      fields['error'] = 'Error parsing JSON';
      fields['raw'] = item.data;
    }
  } else {
    // Si no hay data, usar campos básicos
    fields['type'] = item.type || '';
    fields['adId'] = item.adId || '';
    fields['videoId'] = item.videoId || '';
    fields['timestamp'] = item.timestamp ? new Date(item.timestamp).toISOString() : '';
    fields['isFavorite'] = item.isFavorite ? 'true' : 'false';
  }
  
  return fields;
}

// Función para obtener todos los headers únicos de todos los items
function getAllHeaders(items) {
  const allFields = new Set();
  
  items.forEach(item => {
    const fields = extractAllFields(item);
    Object.keys(fields).forEach(key => allFields.add(key));
  });
  
  return Array.from(allFields).sort();
}

