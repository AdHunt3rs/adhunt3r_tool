# AdHunt3r - Analizador de Anuncios de YouTube

[![Version](https://img.shields.io/badge/version-2.6.8-blue.svg)](https://github.com/your-repo/AdHunt3r)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore/detail/adhunt3r)

## 🎯 ¿Para qué sirve?

AdHunt3r es una extensión de Chrome que **detecta y analiza anuncios y videos de YouTube** en tiempo real. Es útil para:

- **Investigadores**: Estudiar patrones de publicidad en YouTube
- **Creadores de contenido**: Analizar anuncios de la competencia
- **Analistas de marketing**: Recopilar datos de campañas publicitarias
- **Desarrolladores**: Acceder a datos técnicos de anuncios


## ✨ Características

- 🔍 **Detección automática** de anuncios
- 📊 **Extracción de datos** del overlay de anuncios
- 🗄️ **Historial** con sistema de favoritos
- 🔧 **API de YouTube** para datos oficiales
- 📤 **Exportación** en JSON y HTML
- 🌙 **Modo oscuro** incluido


## 🚀 Instalación

### Opción 1: Instalación Manual

1. Descarga el código:
   ```bash
   git clone https://github.com/AdHunt3rs/adhunt3r_tool.git
   ```
2. Abre Chrome y ve a `chrome://extensions/`
3. Activa "Modo desarrollador"
4. Haz clic en "Cargar descomprimida"
5. Selecciona la carpeta del proyecto

## ⚙️ Configuración de API Key

Para obtener datos oficiales de YouTube:

1. **Obtén una API Key**:
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un proyecto nuevo
   - Habilita "YouTube Data API v3"
   - Crea credenciales (API Key)

2. **Configura en la extensión**:
   - Abre la extensión AdHunt3r
   - Pega tu API Key en el campo correspondiente
   - Haz clic en "Guardar"


## 📖 Uso Básico

### 1. Detección Automática
- La extensión se activa automáticamente en YouTube
- El icono muestra "AD" cuando hay un anuncio activo
- Los contadores muestran anuncios/videos de las últimas 24h

### 2. Consultar Datos de Anuncio
1. Reproduce un video con anuncios
2. Cuando aparezca un anuncio, haz clic en "Consultar datos del anuncio"
3. Se extraen datos del overlay y metadatos

### 3. Consultar Datos de Video
1. Ve a cualquier video de YouTube
2. Haz clic en "Consultar datos del video"
3. Los datos se guardan automáticamente en el historial

### 4. Historial y Gestión
- Haz clic en "Historial Consultas API"
- **Dos tipos de vista**: Simple (tarjetas) y Dividida (dos columnas)
- **Acciones en bulk**: Selección múltiple para eliminar/exportar
- **Filtros avanzados**: Por tipo, fecha, duración, palabra clave
- **Favoritos**: Marca elementos importantes con ⭐
- **Exportación**: JSON y HTML para una o varias consultas



## 🍑 Tipos de Datos por Consulta

### **Consulta de Anuncio**
- **Datos del overlay**: Texto visible en el anuncio
- **Información del anunciante**: Nombre, ubicación, marca
- **Metadatos del anuncio**: Posición, duración, secuencia
- **Contexto del video**: Información del video donde aparece
- **Datos de debug**: IDs técnicos y estado
- **AdHunt3r data**: `_adhunt3r_data` con información extraída

### **Extracción del Centro de Anuncios**
- **Datos del iframe**: Información completa del anuncio
- **Enlaces y botones**: URLs y texto de acción
- **Información visual**: Avatar del anunciante
- **Metadatos avanzados**: Ubicación, tema, marca

### **Consulta de Video**
- **Datos de API**: Información oficial de YouTube Data API v3
- **Metadatos**: Título, descripción, canal, estadísticas
- **Detalles técnicos**: Duración, calidad, restricciones
- **Información social**: Likes, comentarios, vistas
- **Categorización**: Tags, categoría, idioma
- **Debug data**: `_adhunt3r_dbgData` con información del reproductor



## 🔒 Privacidad

- **Solo datos públicos**: No accede a información privada
- **Almacenamiento local**: Todos los datos se guardan en tu navegador
- **Sin envío externo**: No se transmiten datos a servidores externos
- **API Key segura**: Se almacena cifrada localmente

## 🛠️ Desarrollo

### Estructura
```
AdHunt3r/
├── background/            # Service worker
├── content/              # Scripts de contenido
├── popup/                # Interfaz principal
│   ├── api/             # Gestión de API
│   ├── history/         # Sistema de historial
│   └── utils/           # Utilidades
└── 
```

### Tecnologías
- **JavaScript ES6+**
- **Chrome Extension APIs**
- **YouTube Data API v3**
- **CSS3/HTML5**

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

**Happy AdHunt1ng! 🎯**

*Desarrollado con ❤️ y curiosidad.*
