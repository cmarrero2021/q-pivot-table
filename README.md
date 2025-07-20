# Tabla Pivote con Quasar 2

Una aplicación completa de tabla pivote desarrollada con Quasar 2, Vue 3 Composition API y Script Setup. Permite crear tablas dinámicas similares a Excel con funciones de agregación avanzadas.

## 🚀 Características

- **Componente Reutilizable**: `PivotTable.vue` completamente configurable
- **Funciones de Agregación**: Suma, Promedio, Contar, Máximo, Mínimo
- **Filtros Dinámicos**: Filtra datos por cualquier campo
- **Columnas y Filas Flexibles**: Arrastra cualquier campo a columnas o filas
- **Interfaz Moderna**: Diseñada con Quasar 2 y Material Design
- **Responsive**: Se adapta a cualquier tamaño de pantalla
- **API Integration**: Conecta con APIs REST automáticamente

## 📋 Requisitos Previos

- Node.js 16+ o 18+ o 20+
- npm 6.13.4+ o yarn 1.21.1+
- Quasar CLI global

## 🛠️ Instalación

### 1. Instalar Quasar CLI globalmente

```bash
npm install -g @quasar/cli
# o
yarn global add @quasar/cli
```

### 2. Crear el proyecto

```bash
quasar create pivot-table-app
cd pivot-table-app
```

### 3. Instalar dependencias

```bash
npm install
# o
yarn install
```

### 4. Estructura del proyecto

```
src/
├── components/
│   └── PivotTable.vue          # Componente principal
├── pages/
│   └── IndexPage.vue
├── layouts/
│   └── MainLayout.vue
└── App.vue                     # Aplicación principal
```

## 🏃‍♂️ Ejecutar la aplicación

```bash
# Modo desarrollo
quasar dev

# Construir para producción
quasar build
```

## 📊 Uso del Componente PivotTable

### Importación básica

```vue
<template>
  <PivotTable :data="misDatos" :loading="cargando" />
</template>

<script setup>
import PivotTable from './components/PivotTable.vue'
import { ref } from 'vue'

const misDatos = ref([
  { id: 1, categoria: 'A', valor: 100, fecha: '2024-01' },
  { id: 2, categoria: 'B', valor: 200, fecha: '2024-02' },
  // ... más datos
])

const cargando = ref(false)
</script>
```

### Props del componente

| Prop      | Tipo    | Descripción                               |
| --------- | ------- | ----------------------------------------- |
| `data`    | Array   | Array de objetos con los datos a pivotear |
| `loading` | Boolean | Estado de carga (opcional)                |

## 🎯 Configuración de la Tabla Pivote

### 1. Filtros

- Selecciona campos para filtrar los datos
- Cada filtro permite seleccionar valores específicos
- Los filtros se aplican antes de generar la tabla

### 2. Columnas

- Los campos seleccionados se convierten en columnas
- Cada combinación única de valores crea una nueva columna
- Útil para categorizar datos horizontalmente

### 3. Filas

- Los campos seleccionados se convierten en filas
- Cada combinación única de valores crea una nueva fila
- **Obligatorio**: Debe tener al menos un campo en filas

### 4. Valores

- Solo campos numéricos pueden usarse como valores
- Funciones de agregación disponibles:
  - **Suma**: Suma todos los valores
  - **Promedio**: Calcula la media aritmética
  - **Contar**: Cuenta el número de registros
  - **Máximo**: Valor más alto
  - **Mínimo**: Valor más bajo

## 🌐 API Integration

La aplicación está configurada para consumir datos de la API:

```
http://poi-r.vps.co.ve:3000/
```

### Estructura esperada de datos

```json
[
  {
    "id": 1,
    "revista": "REVISTA 1",
    "area_conocimiento": "ANTROPOLOGIA",
    "idioma": "ESPAÑOL",
    "editorial": "ELSEVIER",
    "estado": "AMAZONAS",
    "anio_inicial": 1992
    // ... más campos
  }
]
```

## 💡 Ejemplos de Uso

### Ejemplo 1: Análisis por Estado y Editorial

- **Filas**: estado
- **Columnas**: editorial
- **Valores**: Contar de id
- **Resultado**: Tabla que muestra cuántas revistas hay por estado y editorial

### Ejemplo 2: Distribución por Área de Conocimiento

- **Filas**: area_conocimiento, idioma
- **Valores**: Contar de id
- **Filtros**: formato = "IMPRESO"
- **Resultado**: Revistas impresas agrupadas por área e idioma

### Ejemplo 3: Análisis Temporal

- **Filas**: estado
- **Columnas**: periodicidad
- **Valores**: Promedio de anio_inicial
- **Resultado**: Año promedio de inicio por estado y periodicidad

## 🎨 Personalización

### Modificar estilos

Edita el archivo `src/components/PivotTable.vue` en la sección `<style>`:

```vue
<style scoped>
.pivot-table {
  /* Personaliza los estilos de la tabla */
  font-size: 0.9rem;
}

.pivot-table th {
  background-color: #1976d2; /* Color personalizado */
  color: white;
}
</style>
```

### Agregar nuevas funciones de agregación

En el método `aggregate()` del componente:

```javascript
case 'mediana':
  const sorted = values.sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
```

## 🚨 Solución de Problemas

### Error CORS

Si encuentras errores CORS al conectar con la API:

1. **Opción 1**: Configurar proxy en `quasar.config.js`

```javascript
devServer: {
  proxy: {
    '/api': {
      target: 'http://poi-r.vps.co.ve:3000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': ''
      }
    }
  }
}
```

2. **Opción 2**: Usar extensión de navegador para desactivar CORS (solo desarrollo)

### Datos no se cargan

1. Verifica que la API esté accesible
2. Revisa la consola del navegador para errores
3. Verifica el formato de los datos JSON

### Tabla no se genera

1. Asegúrate de seleccionar al menos un campo en "Filas"
2. Verifica que los datos contengan los campos seleccionados
3. Para valores, asegúrate de seleccionar campos numéricos

## 📝 Estructura de Archivos

```
pivot-table-app/
├── public/
├── src/
│   ├── components/
│   │   └── PivotTable.vue        # Componente principal
│   ├── layouts/
│   │   └── MainLayout.vue
│   ├── pages/
│   │   └── IndexPage.vue
│   ├── App.vue                   # App principal
│   └── main.js
├── quasar.config.js              # Configuración Quasar
├── package.json
└── README.md
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ve el archivo `LICENSE` para detalles.

## 👨‍💻 Autor

Desarrollado con ❤️ usando Quasar Framework y Vue 3

---

¡Disfruta creando tablas pivote dinámicas! 🎉
