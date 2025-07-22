// Módulo para funciones de interfaz de usuario
// Optimizado para manejo de toast messages, contadores y elementos UI

// Sistema de mensajes toast optimizado
export function showMsg(msg, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    // Crear un contenedor temporal si no existe
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '10px';
    toastContainer.style.right = '10px';
    toastContainer.style.zIndex = '10000';
    document.body.appendChild(toastContainer);
  }

  // Crear elemento toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toast.style.background = 'rgba(0,0,0,0.85)';
  toast.style.color = '#fff';
  toast.style.padding = '0.75rem 1rem';
  toast.style.borderRadius = '6px';
  toast.style.marginBottom = '0.5rem';
  toast.style.minWidth = '200px';
  toast.style.maxWidth = '300px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  toast.style.fontSize = '0.9rem';
  toast.style.lineHeight = '1.3';
  toast.style.wordWrap = 'break-word';
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';
  toast.style.transition = 'all 0.3s ease';
  toast.style.pointerEvents = 'auto';
  toast.style.borderLeft = '4px solid ' + (type === 'success' ? '#2c97c9' : type === 'error' ? '#e53935' : type === 'warning' ? '#ff9800' : '#68bd18');

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Función para actualizar contadores optimizada
export function updateCounters() {
  // Actualizar contador de anuncios
  try {
  chrome.runtime.sendMessage({ type: 'GET_ADS_LAST_24H' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[AdHunt3r] Error obteniendo contador de anuncios:', chrome.runtime.lastError.message);
        return;
      }
      
    if (response && typeof response.count === 'number') {
      const el = document.getElementById('ad_count_24h');
      if (el) {
        const value = el.querySelector('.counter-value');
        if (value) {
          value.textContent = response.count;
        }
      }
    }
  });
  } catch (error) {
    console.warn('[AdHunt3r] Error enviando mensaje para contador de anuncios:', error);
  }
  
  // Actualizar contador de videos
  try {
  chrome.runtime.sendMessage({ type: 'GET_VIDEOS_LAST_24H' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[AdHunt3r] Error obteniendo contador de videos:', chrome.runtime.lastError.message);
        return;
      }
      
    if (response && typeof response.count === 'number') {
      const el = document.getElementById('video_count_24h');
      if (el) {
        const value = el.querySelector('.counter-value');
        if (value) {
          value.textContent = response.count;
        }
      }
    }
  });
  } catch (error) {
    console.warn('[AdHunt3r] Error enviando mensaje para contador de videos:', error);
  }
}

// Función para mostrar/ocultar secciones de la UI
export function toggleSection(sectionId, show) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = show ? '' : 'none';
  }
}

// Función optimizada para mostrar/ocultar elementos
export function toggleElementVisibility(elementId, show) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = show ? 'block' : 'none';
  }
}

// Función para alternar múltiples elementos de una vez
export function toggleMultipleElements(elements) {
  batchDOMUpdates(() => {
    elements.forEach(({ id, show }) => {
      toggleElementVisibility(id, show);
    });
  });
}

// Función para actualizar el estado de un botón
export function updateButtonState(buttonId, enabled, text, classList = []) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.disabled = !enabled;
    if (text) button.textContent = text;
    
    // Gestionar clases CSS
    classList.forEach(cls => {
      if (cls.startsWith('-')) {
        button.classList.remove(cls.substring(1));
      } else {
        button.classList.add(cls);
      }
    });
  }
}

// Función para copiar texto al portapapeles
export function copyToClipboard(text, successMsg = '¡Copiado!', errorMsg = 'Error al copiar') {
  if (!text || text.trim() === '') {
    showMsg('Nada que copiar');
    return;
  }
  
  navigator.clipboard.writeText(text).then(() => {
    showMsg(successMsg, 'success');
  }).catch((error) => {
    showMsg(errorMsg, 'error');
  });
}

// Función para limpiar contenido de un elemento
export function clearElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = '';
    element.style.display = 'none';
  }
}

// Función para actualizar contenido de un elemento
export function updateElement(elementId, content, show = true, escapeContent = false) {
  const element = document.getElementById(elementId);
  if (element) {
    // Sanitizar contenido si es necesario
    const sanitizedContent = sanitizeText(content);
    
    if (escapeContent) {
      // Para contenido que puede contener HTML, usar innerHTML con escape
      element.innerHTML = escapeHtml(sanitizedContent);
    } else {
      // Para contenido texto plano, usar textContent
      element.textContent = sanitizedContent;
    }
    
    element.style.display = show ? 'block' : 'none';
  }
}

// Función para gestionar el scroll preservation
export function preserveScroll(elementId, callback) {
  const element = document.getElementById(elementId);
  const scrollPos = element?.scrollTop || 0;
  
  callback();
  
  // Restaurar scroll después de un tick
  setTimeout(() => {
    if (element) {
      element.scrollTop = scrollPos;
    }
  }, 0);
}

// Función para obtener múltiples elementos por ID
export function getElements(ids) {
  const elements = {};
  ids.forEach(id => {
    elements[id] = document.getElementById(id);
  });
  return elements;
}

// Función para verificar que existen elementos críticos
export function checkCriticalElements(requiredIds) {
  const missing = requiredIds.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    return false;
  }
  return true;
}

// Funciones para estados de carga
export function setLoadingState(elementId, isLoading = true, loadingText = 'Cargando...') {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (isLoading) {
    element.classList.add('btn-loading');
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.innerHTML = `<span class="loading-spinner"></span>${loadingText}`;
  } else {
    element.classList.remove('btn-loading');
    element.disabled = false;
    element.textContent = element.dataset.originalText || 'Consultar';
    delete element.dataset.originalText;
  }
}

export function setSectionLoadingState(sectionId, isLoading = true) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  
  if (isLoading) {
    section.classList.add('section-loading');
    // Añadir overlay de carga si no existe
    if (!section.querySelector('.loading-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<span class="loading-spinner"></span>';
      section.style.position = 'relative';
      section.appendChild(overlay);
    }
  } else {
    section.classList.remove('section-loading');
    // Remover overlay de carga
    const overlay = section.querySelector('.loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}

export function initProgressiveUI() {
  // Marcar elementos iniciales como progressive
  const progressiveElements = document.querySelectorAll('#ytdata_section, #ytad_section, #addebug_section');
  progressiveElements.forEach(el => {
    el.classList.add('ui-progressive');
  });
  
  // Cargar elementos progresivamente después de un delay
  setTimeout(() => {
    progressiveElements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('loaded');
      }, index * 100); // Stagger animation
    });
  }, 300);
}

export function batchDOMUpdates(updates) {
  // Agrupar múltiples actualizaciones DOM para reducir reflows
  requestAnimationFrame(() => {
    // Si updates es una función, ejecutarla directamente
    if (typeof updates === 'function') {
      updates();
    } else if (Array.isArray(updates)) {
      // Si es un array, ejecutar cada función
      updates.forEach(update => {
        if (typeof update === 'function') {
          update();
        }
      });
    }
  });
}

// Funciones de sanitización de datos para mejorar la seguridad
export function sanitizeText(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Eliminar caracteres de control EXCEPTO saltos de línea, tabs y retornos de carro
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Preservar \n(\x0A), \r(\x0D), \t(\x09)
    .replace(/[<>]/g, '') // Eliminar < y > básicos
    .trim();
}

export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function validateApiResponse(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }
  
  // Validar que las propiedades críticas existan y tengan tipos correctos
  const requiredStringProps = ['debugText'];
  const requiredObjectProps = ['debugInfo'];
  
  for (const prop of requiredStringProps) {
    if (response[prop] !== undefined && typeof response[prop] !== 'string') {
      return false;
    }
  }
  
  for (const prop of requiredObjectProps) {
    if (response[prop] !== undefined && typeof response[prop] !== 'object') {
      return false;
    }
  }
  
  return true;
}

export function validateVideoId(videoId) {
  if (typeof videoId !== 'string') {
    return false;
  }
  
  // Validar formato de YouTube video ID (11 caracteres alfanuméricos, guiones y guiones bajos)
  const youtubeIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  return youtubeIdPattern.test(videoId);
}

export function sanitizeStorageKey(key) {
  if (typeof key !== 'string') {
    return '';
  }
  
  // Permitir solo caracteres alfanuméricos, guiones y guiones bajos
  return key.replace(/[^a-zA-Z0-9_-]/g, '');
}
