<template>
  <div class="pivot-table-container">
    <!-- Configuración de campos -->
    <div class="pivot-configuration q-pa-md">
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Configuración de Tabla Pivote</div>
          <q-btn-group flat>
            <q-btn color="primary" label="Cargar consulta" @click="showLoadDialog = true" />
            <q-btn color="secondary" label="Guardar como..." @click="showSaveDialog = true" :disable="!canSaveQuery" />
          </q-btn-group>
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
                        :options="getAggregatorsForField(scope.opt.value)" option-label="label" option-value="value"
                        emit-value map-options dense borderless @update:model-value="generatePivotData" />
                    </q-item-section>
                  </q-item>
                </template>

                <template v-slot:selected-item="scope">
                  <q-chip removable @remove="removeValue(scope.opt.value)" :tabindex="scope.tabindex" color="primary">
                    <span class="value-chip">
                      {{ scope.opt.label }}
                      <q-badge color="secondary" class="q-ml-sm">
                        {{ getAggregatorLabel(scope.opt.value, valueAggregators[scope.opt.value]) }}
                      </q-badge>
                    </span>
                  </q-chip>
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

    <!-- Diálogo para cargar consultas -->
    <q-dialog v-model="showLoadDialog" persistent>
      <q-card style="min-width: 70vw">
        <q-card-section>
          <div class="text-h6">Cargar consulta guardada</div>
        </q-card-section>

        <q-card-section>
          <q-input v-model="searchQuery" label="Buscar consultas" clearable>
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-list bordered separator>
            <q-item v-for="query in filteredQueries" :key="query.id">
              <q-item-section>
                <q-item-label>{{ query.name }}</q-item-label>
                <q-item-label caption>
                  Creada: {{ formatDate(query.created) }} |
                  Usada: {{ formatDate(query.lastUsed) }} ({{ query.usageCount }} veces)
                </q-item-label>
                <q-item-label caption v-if="query.tags.length > 0">
                  <q-chip v-for="tag in query.tags" :key="tag" size="sm">
                    {{ tag }}
                  </q-chip>
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-btn-group flat>
                  <q-btn color="primary" icon="mdi-content-save-move" @click="loadQuery(query)" label="Cargar" />
                  <q-btn color="negative" icon="mdi-delete" @click="confirmDeleteQuery(query)" />
                </q-btn-group>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Diálogo para guardar consultas -->
    <q-dialog v-model="showSaveDialog" persistent>
      <q-card style="min-width: 50vw">
        <q-card-section>
          <div class="text-h6">Guardar consulta actual</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input v-model="newQueryName" label="Nombre de la consulta"
            :rules="[val => !!val || 'Nombre es requerido']" />

          <q-select v-model="newQueryTags" label="Etiquetas" multiple use-chips input-debounce="0" use-input
            @new-value="addTag" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn flat label="Guardar" color="positive" @click="saveCurrentQuery" :disable="!newQueryName" />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
import { mdiMicrosoftExcel, mdiCodeJson, mdiFileDelimited } from '@mdi/js'
import { usePivotStorage } from 'src/services/pivotStorage'
import { format } from 'date-fns'

const $q = useQuasar()
const pivotStorage = usePivotStorage()

// Estado para los diálogos
const showLoadDialog = ref(false)
const showSaveDialog = ref(false)
const searchQuery = ref('')
const newQueryName = ref('')
const newQueryTags = ref([])

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

// Props del componente
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

// Inicializar agregadores
function initializeAggregators() {
  availableFields.value.forEach(field => {
    if (!valueAggregators.value[field.value]) {
      valueAggregators.value[field.value] = field.type === 'numeric' ? 'sum' : 'count'
    }
  })
}

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

// Obtener valores únicos para un campo
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

// Obtener la etiqueta del agregador
function getAggregatorLabel(field, aggregatorValue) {
  const aggregators = getAggregatorsForField(field)
  const found = aggregators.find(agg => agg.value === aggregatorValue)
  return found ? found.label : aggregatorValue
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
      if (!activeFilters.value[filterField] || activeFilters.value[filterField].length === 0) {
        return true
      }
      return activeFilters.value[filterField].includes(item[filterField])
    })
  })

  // 2. Agrupar datos
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

  // 3. Preparar columnas
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
      label += ` (${getAggregatorLabel(valueField, aggregator)})`

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

  // 4. Preparar filas
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

// Funciones de exportación
async function exportToXLSX() {
  exporting.value = 'xlsx'
  showNotification('Preparando archivo Excel...', 'info', 'mdi-progress-clock')

  try {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('DatosPivote')

    worksheet.addRow(pivotColumns.value.map(col => col.label))
    pivotRows.value.forEach(row => {
      worksheet.addRow(pivotColumns.value.map(col => row[col.field]))
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `pivot_table_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()

    setTimeout(() => URL.revokeObjectURL(url), 100)

    showNotification('Archivo Excel exportado con éxito', 'positive', 'mdi-check-circle')
  } catch (error) {
    showNotification('Error al exportar a Excel: ' + error.message, 'negative', 'mdi-alert-circle')
    console.error('Error exporting to XLSX:', error)
  } finally {
    exporting.value = null
  }
}

function exportToJSON() {
  exporting.value = 'json'
  showNotification('Preparando archivo JSON...', 'info', 'mdi-progress-clock')

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

    showNotification('Archivo JSON exportado con éxito', 'positive', 'mdi-check-circle')
  } catch (error) {
    showNotification('Error al exportar a JSON: ' + error.message, 'negative', 'mdi-alert-circle')
    console.error('Error exporting to JSON:', error)
  } finally {
    exporting.value = null
  }
}

function exportToCSV() {
  exporting.value = 'csv'
  showNotification('Preparando archivo CSV...', 'info', 'mdi-progress-clock')

  try {
    const header = pivotColumns.value.map(col => col.label).join(',')
    const rows = pivotRows.value.map(row => {
      return pivotColumns.value.map(col => {
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

    showNotification('Archivo CSV exportado con éxito', 'positive', 'mdi-check-circle')
  } catch (error) {
    showNotification('Error al exportar a CSV: ' + error.message, 'negative', 'mdi-alert-circle')
    console.error('Error exporting to CSV:', error)
  } finally {
    exporting.value = null
  }
}

// Funciones para manejar consultas guardadas
const filteredQueries = computed(() => {
  const queries = pivotStorage.getQueries()
  if (!searchQuery.value) return queries

  const search = searchQuery.value.toLowerCase()
  return queries.filter(q =>
    q.name.toLowerCase().includes(search) ||
    q.tags.some(tag => tag.toLowerCase().includes(search))
  )
})

const currentConfigPreview = computed(() => {
  return {
    rows: config.value.rows,
    columns: config.value.columns,
    filters: config.value.filters,
    values: config.value.values.map(field => ({
      field,
      aggregation: valueAggregators.value[field],
      type: fieldTypes.value[field]
    })),
    activeFilters: activeFilters.value
  }
})

const canSaveQuery = computed(() => {
  return config.value.values.length > 0
})

function formatDate(dateStr) {
  return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
}

function loadQuery(query) {
  config.value.rows = [...query.config.rows]
  config.value.columns = [...query.config.columns]
  config.value.filters = [...query.config.filters]
  config.value.values = [...query.config.values.map(v => v.field)]

  query.config.values.forEach(v => {
    valueAggregators.value[v.field] = v.aggregation
  })

  if (query.config.activeFilters) {
    activeFilters.value = { ...query.config.activeFilters }
  }

  pivotStorage.updateQueryUsage(query.id)
  showLoadDialog.value = false
  generatePivotData()

  showNotification(`Consulta "${query.name}" cargada`, 'positive', 'mdi-check-circle')
}

function confirmDeleteQuery(query) {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de eliminar la consulta "${query.name}"?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    pivotStorage.deleteQuery(query.id)
    showNotification(`Consulta "${query.name}" eliminada`, 'positive', 'mdi-check-circle')
  })
}

function saveCurrentQuery() {
  const success = pivotStorage.saveQuery(
    newQueryName.value,
    currentConfigPreview.value,
    newQueryTags.value
  )

  if (success) {
    showSaveDialog.value = false
    newQueryName.value = ''
    newQueryTags.value = []

    showNotification('Consulta guardada correctamente', 'positive', 'mdi-check-circle')
  }
}

function addTag(val, done) {
  if (val.length > 0) {
    if (!newQueryTags.value.includes(val)) {
      newQueryTags.value.push(val)
    }
    done(val, 'add')
  } else {
    done()
  }
}

function showNotification(message, color, icon) {
  $q.notify({
    message,
    color,
    icon,
    timeout: color === 'negative' ? 5000 : 3000
  })
}

// Watchers
watch(() => props.data, generatePivotData, { deep: true })
watch(() => config.value, generatePivotData, { deep: true })
watch(valueAggregators, generatePivotData, { deep: true })
watch(availableFields, () => {
  initializeAggregators()
  generatePivotData()
}, { immediate: true })

// Inicialización
onMounted(() => {
  pivotStorage.cleanOldQueries()
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

.value-chip {
  display: flex;
  align-items: center;
}
</style>
