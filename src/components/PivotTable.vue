<template>
  <div class="pivot-table-container">
    <!-- Configuración de campos -->
    <div class="pivot-configuration q-pa-md">
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Configuración de Tabla Pivote</div>
        </q-card-section>

        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-md-3">
              <q-select v-model="config.rows" :options="availableFields" label="Filas" multiple use-chips emit-value
                map-options />
            </div>
            <div class="col-md-3">
              <q-select v-model="config.columns" :options="availableFields" label="Columnas" multiple use-chips
                emit-value map-options />
            </div>
            <div class="col-md-3">
              <q-select v-model="config.filters" :options="availableFields" label="Filtros" multiple use-chips
                emit-value map-options />
            </div>
            <div class="col-md-3">
              <q-select v-model="config.values" :options="availableFields" label="Valores" multiple use-chips emit-value
                map-options>
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-select v-model="valueAggregators[scope.opt.value]"
                        :options="getAggregatorsForField(scope.opt.value)" dense borderless emit-value map-options
                        @update:model-value="generatePivotData" />
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
          </div>

          <!-- Sección de controles de filtro activos -->
          <div class="row q-col-gutter-sm q-mt-md" v-if="config.filters.length > 0">
            <div class="col-12">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2">Filtros Activos</div>
                </q-card-section>
                <q-card-section>
                  <div class="row q-col-gutter-md">
                    <div class="col-md-4" v-for="filterField in config.filters" :key="filterField">
                      <q-select v-model="activeFilters[filterField]"
                        :options="getUniqueValues(filterField).map(v => ({ label: v || '(Vacío)', value: v }))"
                        :label="filterField.replace(/_/g, ' ').toUpperCase()" multiple use-chips emit-value map-options
                        dense filled @update:model-value="generatePivotData" />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>

        <!-- Sección de exportación -->
        <q-card-actions align="right">
          <q-btn-group flat>
            <q-btn color="positive" @click="exportToXLSX" :loading="exporting === 'xlsx'">
              <svg-icon type="mdi" :path="mdiMicrosoftExcel" class="export-icon"></svg-icon>
              <q-tooltip>Exportar a Excel (XLSX)</q-tooltip>
            </q-btn>
            <q-btn color="primary" @click="exportToJSON" :loading="exporting === 'json'">
              <svg-icon type="mdi" :path="mdiCodeJson" class="export-icon"></svg-icon>
              <q-tooltip>Exportar a JSON</q-tooltip>
            </q-btn>
            <q-btn color="secondary" @click="exportToCSV" :loading="exporting === 'csv'">
              <svg-icon type="mdi" :path="mdiFileDelimited" class="export-icon"></svg-icon>
              <q-tooltip>Exportar a CSV</q-tooltip>
            </q-btn>
          </q-btn-group>
        </q-card-actions>
      </q-card>
    </div>

    <!-- Tabla pivote resultante -->
    <div class="pivot-table-display q-pa-md">
      <q-table :rows="pivotRows" :columns="pivotColumns" row-key="id" dense flat bordered :loading="loading">
        <template v-slot:body-cell="props">
          <q-td :props="props">
            {{ props.value }}
          </q-td>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { exportFile } from 'quasar'
import SvgIcon from '@jamescoyle/vue-icon'
import {
  mdiMicrosoftExcel,
  mdiCodeJson,
  mdiFileDelimited
} from '@mdi/js'
const $q = useQuasar()

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Configuración inicial
const config = ref({
  rows: [],
  columns: [],
  filters: [],
  values: []
})

// Valores seleccionados para cada filtro
const activeFilters = ref({})

// Tipos de campos detectados automáticamente
const fieldTypes = ref({})

// Agregadores disponibles
const aggregatorOptions = {
  numeric: [
    { label: 'Suma', value: 'sum' },
    { label: 'Promedio', value: 'avg' },
    { label: 'Conteo', value: 'count' },
    { label: 'Mínimo', value: 'min' },
    { label: 'Máximo', value: 'max' }
  ],
  text: [
    { label: 'Conteo', value: 'count' },
    { label: 'Valores únicos', value: 'distinct' }
  ]
}

const valueAggregators = ref({})

// Estado de exportación
const exporting = ref(null)

// Detectar campos disponibles y sus tipos
const availableFields = computed(() => {
  if (!props.data || props.data.length === 0) return []

  const sampleItem = props.data[0]
  const fields = []

  Object.keys(sampleItem).forEach(key => {
    const value = sampleItem[key]
    let type = 'text'

    if (typeof value === 'number') {
      type = 'numeric'
    } else if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
      type = 'numeric'
    }

    fieldTypes.value[key] = type
    fields.push({
      label: key.replace(/_/g, ' ').toUpperCase(),
      value: key,
      type: type
    })
  })

  return fields
})

// Obtener valores únicos para un campo (para mostrar opciones de filtro)
function getUniqueValues(field) {
  if (!props.data || props.data.length === 0) return []
  const unique = new Set()
  props.data.forEach(item => {
    if (item[field] !== null && item[field] !== undefined) {
      unique.add(item[field])
    }
  })
  return Array.from(unique).sort()
}

// Obtener agregadores disponibles para un campo
function getAggregatorsForField(field) {
  return aggregatorOptions[fieldTypes.value[field]] || aggregatorOptions.text
}

// Generar datos pivote
const pivotRows = ref([])
const pivotColumns = ref([])

function generatePivotData() {
  if (!props.data || props.data.length === 0) {
    pivotRows.value = []
    pivotColumns.value = []
    return
  }

  // 1. Aplicar filtros
  let filteredData = props.data.filter(item => {
    return config.value.filters.every(filterField => {
      // Si no hay filtros seleccionados para este campo, incluir todos los items
      if (!activeFilters.value[filterField] || activeFilters.value[filterField].length === 0) {
        return true
      }
      // Verificar si el valor del item está en los filtros seleccionados
      return activeFilters.value[filterField].includes(item[filterField])
    })
  })

  // 2. Agrupar datos por filas y columnas
  const groupedData = {}
  const rowKeys = new Set()
  const colKeys = new Set()

  filteredData.forEach(item => {
    const rowKey = config.value.rows.map(field => item[field]).join('|')
    const colKey = config.value.columns.map(field => item[field]).join('|')
    rowKeys.add(rowKey)
    colKeys.add(colKey)

    if (!groupedData[rowKey]) groupedData[rowKey] = {}
    if (!groupedData[rowKey][colKey]) {
      groupedData[rowKey][colKey] = {
        count: 0,
        sum: {},
        min: {},
        max: {},
        distinctValues: {},
        values: {}
      }
      config.value.values.forEach(valueField => {
        groupedData[rowKey][colKey].sum[valueField] = 0
        groupedData[rowKey][colKey].min[valueField] = Infinity
        groupedData[rowKey][colKey].max[valueField] = -Infinity
        groupedData[rowKey][colKey].distinctValues[valueField] = new Set()
        groupedData[rowKey][colKey].values[valueField] = []
      })
    }

    config.value.values.forEach(valueField => {
      const value = item[valueField]
      const group = groupedData[rowKey][colKey]

      group.count++
      group.values[valueField].push(value)
      group.distinctValues[valueField].add(value)

      if (fieldTypes.value[valueField] === 'numeric') {
        const numValue = parseFloat(value) || 0
        group.sum[valueField] += numValue
        group.min[valueField] = Math.min(group.min[valueField], numValue)
        group.max[valueField] = Math.max(group.max[valueField], numValue)
      }
    })
  })

  // 3. Preparar columnas para la tabla
  const columns = config.value.rows.map(field => ({
    name: field,
    label: field.replace(/_/g, ' ').toUpperCase(),
    field: field,
    align: 'left',
    sortable: true
  }))

  Array.from(colKeys).forEach(colKey => {
    config.value.values.forEach(valueField => {
      const aggregator = valueAggregators.value[valueField] || 'count'
      const isNumeric = fieldTypes.value[valueField] === 'numeric'

      let label = `${valueField.replace(/_/g, ' ').toUpperCase()}`
      label += ` (${aggregator.toUpperCase()})`

      if (config.value.columns.length > 0) {
        label += ` - ${colKey}`
      }

      columns.push({
        name: `${colKey}_${valueField}_${aggregator}`,
        label: label,
        field: `${colKey}_${valueField}_${aggregator}`,
        align: isNumeric ? 'right' : 'left',
        sortable: true
      })
    })
  })

  pivotColumns.value = columns

  // 4. Preparar filas para la tabla
  pivotRows.value = Array.from(rowKeys).map(rowKey => {
    const rowParts = rowKey.split('|')
    const rowData = {}

    config.value.rows.forEach((field, index) => {
      rowData[field] = rowParts[index]
    })

    Array.from(colKeys).forEach(colKey => {
      if (groupedData[rowKey]?.[colKey]) {
        config.value.values.forEach(valueField => {
          const aggregator = valueAggregators.value[valueField] || 'count'
          const group = groupedData[rowKey][colKey]
          let value = ''

          switch (aggregator) {
            case 'sum':
              value = group.sum[valueField]
              break
            case 'avg':
              value = group.sum[valueField] / group.count
              break
            case 'count':
              value = group.count
              break
            case 'min':
              value = group.min[valueField]
              break
            case 'max':
              value = group.max[valueField]
              break
            case 'distinct':
              value = group.distinctValues[valueField].size
              break
          }

          rowData[`${colKey}_${valueField}_${aggregator}`] =
            (aggregator === 'avg' && typeof value === 'number') ? value.toFixed(2) : value
        })
      }
    })

    return rowData
  })
}

// Función para exportar a XLSX usando ExcelJS (solución segura)
/*
async function exportToXLSX() {
  exporting.value = 'xlsx'
  $q.notify({
    message: 'Preparando archivo Excel...',
    color: 'info',
    icon: 'mdi-progress-clock',
    timeout: 1000
  })

  try {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('DatosPivote')

    // Agregar encabezados
    worksheet.addRow(pivotColumns.value.map(col => col.label))

    // Agregar datos
    pivotRows.value.forEach(row => {
      worksheet.addRow(pivotColumns.value.map(col => row[col.field]))
    })

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `pivot_table_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()

    // Limpiar objeto URL
    setTimeout(() => URL.revokeObjectURL(url), 100)

    $q.notify({
      message: 'Archivo Excel exportado con éxito',
      color: 'positive',
      icon: 'mdi-check-circle',
      timeout: 3000
    })
  } catch (error) {
    $q.notify({
      message: 'Error al exportar a Excel: ' + error.message,
      color: 'negative',
      icon: 'mdi-alert-circle',
      timeout: 5000
    })
    console.error('Error exporting to XLSX:', error)
  } finally {
    exporting.value = null
  }
}
*/
async function exportToXLSX() {
  exporting.value = 'xlsx'
  showNotification('Preparando archivo Excel...', 'info', 'mdi-progress-clock')

  try {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('DatosPivote')

    // Agregar encabezados
    worksheet.addRow(pivotColumns.value.map(col => col.label))

    // Agregar datos
    pivotRows.value.forEach(row => {
      worksheet.addRow(pivotColumns.value.map(col => row[col.field]))
    })

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `pivot_table_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()

    // Limpiar objeto URL
    setTimeout(() => URL.revokeObjectURL(url), 100)

    showNotification('Archivo Excel exportado con éxito', 'positive', 'mdi-check-circle')
  } catch (error) {
    showNotification('Error al exportar a Excel: ' + error.message, 'negative', 'mdi-alert-circle')
    console.error('Error exporting to XLSX:', error)
  } finally {
    exporting.value = null
  }
}

// Función helper para notificaciones
function showNotification(message, color, icon) {
  $q.notify({
    message,
    color,
    icon,
    timeout: color === 'negative' ? 5000 : 3000
  })
}
// Función para exportar a JSON
function exportToJSON() {
  exporting.value = 'json'
  $q.notify({
    message: 'Preparando archivo JSON...',
    color: 'info',
    icon: 'mdi-progress-clock',
    timeout: 1000
  })

  try {
    const data = {
      columns: pivotColumns.value,
      rows: pivotRows.value,
      config: config.value,
      exportedAt: new Date().toISOString()
    }

    const jsonStr = JSON.stringify(data, null, 2)
    const date = new Date().toISOString().slice(0, 10)

    exportFile(`pivot_table_${date}.json`, jsonStr, 'application/json')

    $q.notify({
      message: 'Archivo JSON exportado con éxito',
      color: 'positive',
      icon: 'mdi-check-circle',
      timeout: 3000
    })
  } catch (error) {
    $q.notify({
      message: 'Error al exportar a JSON: ' + error.message,
      color: 'negative',
      icon: 'mdi-alert-circle',
      timeout: 5000
    })
    console.error('Error exporting to JSON:', error)
  } finally {
    exporting.value = null
  }
}

// Función para exportar a CSV
function exportToCSV() {
  exporting.value = 'csv'
  $q.notify({
    message: 'Preparando archivo CSV...',
    color: 'info',
    icon: 'mdi-progress-clock',
    timeout: 1000
  })

  try {
    const header = pivotColumns.value.map(col => col.label).join(',')
    const rows = pivotRows.value.map(row => {
      return pivotColumns.value.map(col => {
        // Escapar comas y comillas en los valores
        let value = row[col.field] ?? ''
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"')) {
            value = `"${value.replace(/"/g, '""')}"`
          }
        }
        return value
      }).join(',')
    }).join('\n')

    const csvContent = `${header}\n${rows}`
    const date = new Date().toISOString().slice(0, 10)

    exportFile(`pivot_table_${date}.csv`, csvContent, 'text/csv')

    $q.notify({
      message: 'Archivo CSV exportado con éxito',
      color: 'positive',
      icon: 'mdi-check-circle',
      timeout: 3000
    })
  } catch (error) {
    $q.notify({
      message: 'Error al exportar a CSV: ' + error.message,
      color: 'negative',
      icon: 'mdi-alert-circle',
      timeout: 5000
    })
    console.error('Error exporting to CSV:', error)
  } finally {
    exporting.value = null
  }
}

// Watchers
watch(() => props.data, generatePivotData, { deep: true })
watch(() => config.value, generatePivotData, { deep: true })
watch(valueAggregators, generatePivotData, { deep: true })

// Inicialización
onMounted(() => {
  // Inicializar agregadores por defecto
  availableFields.value.forEach(field => {
    valueAggregators.value[field.value] = field.type === 'numeric' ? 'sum' : 'count'
  })
  generatePivotData()
})

defineExpose({ generatePivotData })
</script>

<style scoped>
.pivot-table-container {
  width: 100%;
  height: 100%;
}

.pivot-configuration {
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.pivot-table-display {
  overflow-x: auto;
}

.q-btn-group {
  margin-top: 10px;
}
</style>
