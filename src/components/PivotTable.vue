<template>
  <div class="pivot-table-container">
    <!-- Panel de configuración -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Configuración de Tabla Pivote</div>

        <div class="row q-gutter-md">
          <!-- Filtros -->
          <div class="col-12 col-md-2">
            <div class="text-subtitle2 q-mb-sm">Filtros</div>
            <q-select v-model="filters" :options="availableFields" multiple emit-value map-options option-value="key"
              option-label="label" outlined dense clearable />

            <!-- Controles de filtros -->
            <div v-if="filters.length > 0" class="q-mt-sm">
              <div v-for="filter in filters" :key="filter" class="q-mb-sm">
                <div class="text-caption">{{ getFieldLabel(filter) }}</div>
                <q-select v-model="filterValues[filter]" :options="getUniqueValues(filter)" multiple outlined dense
                  clearable @update:model-value="updatePivotData" />
              </div>
            </div>
          </div>

          <!-- Columnas -->
          <div class="col-12 col-md-2">
            <div class="text-subtitle2 q-mb-sm">Columnas</div>
            <q-select v-model="columns" :options="availableFields" multiple emit-value map-options option-value="key"
              option-label="label" outlined dense clearable @update:model-value="updatePivotData" />
          </div>

          <!-- Filas -->
          <div class="col-12 col-md-2">
            <div class="text-subtitle2 q-mb-sm">Filas</div>
            <q-select v-model="rows" :options="availableFields" multiple emit-value map-options option-value="key"
              option-label="label" outlined dense clearable @update:model-value="updatePivotData" />
          </div>

          <!-- Valores -->
          <div class="col-12 col-md-3">
            <div class="text-subtitle2 q-mb-sm">Valores</div>
            <div v-for="(value, index) in values" :key="index" class="q-mb-sm">
              <div class="row q-gutter-sm">
                <div class="col">
                  <q-select v-model="value.field" :options="numericFields" emit-value map-options option-value="key"
                    option-label="label" outlined dense @update:model-value="updatePivotData" />
                </div>
                <div class="col-4">
                  <q-select v-model="value.aggregation" :options="aggregationOptions" emit-value map-options outlined
                    dense @update:model-value="updatePivotData" />
                </div>
                <div class="col-auto">
                  <q-btn icon="close" size="sm" flat round @click="removeValue(index)" />
                </div>
              </div>
            </div>
            <q-btn label="Agregar Valor" icon="add" size="sm" flat @click="addValue" />
          </div>

          <!-- Controles -->
          <div class="col-12 col-md-2">
            <q-btn label="Actualizar" color="primary" @click="updatePivotData" class="full-width q-mb-sm" />
            <q-btn label="Limpiar" color="negative" outline @click="clearConfiguration" class="full-width" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla pivote -->
    <q-card>
      <q-card-section>
        <div class="text-h6 q-mb-md">Tabla Pivote</div>

        <div v-if="pivotData.length === 0" class="text-center q-pa-lg">
          <q-icon name="table_view" size="4rem" color="grey-5" />
          <div class="text-h6 text-grey-6 q-mt-md">
            Configura los campos para generar la tabla pivote
          </div>
        </div>

        <div v-else class="pivot-table-wrapper" style="overflow-x: auto;">
          <table class="pivot-table full-width">
            <thead>
              <tr>
                <th v-for="rowField in rows" :key="rowField" class="text-left q-pa-sm border"
                  style="background-color: #f5f5f5; min-width: 120px;">
                  {{ getFieldLabel(rowField) }}
                </th>
                <th v-for="colCombination in columnCombinations" :key="colCombination.key"
                  class="text-center q-pa-sm border" style="background-color: #f5f5f5; min-width: 100px;">
                  {{ colCombination.label }}
                </th>
                <th v-if="columnCombinations.length === 0" v-for="value in values"
                  :key="value.field + '_' + value.aggregation" class="text-center q-pa-sm border"
                  style="background-color: #f5f5f5; min-width: 120px;">
                  {{ getAggregationLabel(value.aggregation) }} de {{ getFieldLabel(value.field) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in pivotData" :key="rowIndex">
                <td v-for="rowField in rows" :key="rowField" class="q-pa-sm border text-left"
                  style="background-color: #fafafa;">
                  {{ row.rowValues[rowField] }}
                </td>
                <td v-for="colCombination in columnCombinations" :key="colCombination.key"
                  class="q-pa-sm border text-right">
                  {{ formatValue(row.columnData[colCombination.key]) }}
                </td>
                <td v-if="columnCombinations.length === 0" v-for="value in values"
                  :key="value.field + '_' + value.aggregation" class="q-pa-sm border text-right">
                  {{ formatValue(row.aggregatedValues[value.field + '_' + value.aggregation]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// Props
const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Estado reactivo
const filters = ref([])
const columns = ref([])
const rows = ref([])
const values = ref([])
const filterValues = ref({})
const pivotData = ref([])

// Opciones de agregación
const aggregationOptions = [
  { label: 'Suma', value: 'sum' },
  { label: 'Promedio', value: 'avg' },
  { label: 'Contar', value: 'count' },
  { label: 'Máximo', value: 'max' },
  { label: 'Mínimo', value: 'min' }
]

// Campos disponibles (computados desde los datos)
const availableFields = computed(() => {
  if (!props.data || props.data.length === 0) return []

  const sample = props.data[0]
  return Object.keys(sample).map(key => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }))
})

// Campos numéricos para valores
const numericFields = computed(() => {
  if (!props.data || props.data.length === 0) return []

  const sample = props.data[0]
  return Object.keys(sample)
    .filter(key => {
      const value = sample[key]
      return !isNaN(Number(value)) && value !== null && value !== ''
    })
    .map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }))
})

// Combinaciones de columnas
const columnCombinations = computed(() => {
  if (columns.value.length === 0) return []

  const filteredData = getFilteredData()
  const combinations = new Set()

  filteredData.forEach(item => {
    const combination = columns.value.map(col => item[col]).join('|')
    combinations.add(combination)
  })

  return Array.from(combinations).map(combo => {
    const parts = combo.split('|')
    return {
      key: combo,
      label: parts.join(' - ')
    }
  })
})

// Métodos
const getFieldLabel = (fieldKey) => {
  const field = availableFields.value.find(f => f.key === fieldKey)
  return field ? field.label : fieldKey
}

const getAggregationLabel = (aggregation) => {
  const agg = aggregationOptions.find(a => a.value === aggregation)
  return agg ? agg.label : aggregation
}

const getUniqueValues = (field) => {
  if (!props.data || props.data.length === 0) return []

  const uniqueValues = new Set()
  props.data.forEach(item => {
    if (item[field] !== null && item[field] !== undefined) {
      uniqueValues.add(item[field])
    }
  })

  return Array.from(uniqueValues).sort()
}

const getFilteredData = () => {
  let filtered = [...props.data]

  // Aplicar filtros
  filters.value.forEach(filter => {
    if (filterValues.value[filter] && filterValues.value[filter].length > 0) {
      filtered = filtered.filter(item =>
        filterValues.value[filter].includes(item[filter])
      )
    }
  })

  return filtered
}

const addValue = () => {
  values.value.push({
    field: '',
    aggregation: 'sum'
  })
}

const removeValue = (index) => {
  values.value.splice(index, 1)
  updatePivotData()
}

const clearConfiguration = () => {
  filters.value = []
  columns.value = []
  rows.value = []
  values.value = []
  filterValues.value = {}
  pivotData.value = []
}

const formatValue = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  if (Number.isInteger(Number(value))) {
    return Number(value).toLocaleString()
  }

  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const aggregate = (data, field, aggregationType) => {
  if (!data || data.length === 0) return 0

  const values = data.map(item => Number(item[field])).filter(val => !isNaN(val))

  switch (aggregationType) {
    case 'sum':
      return values.reduce((sum, val) => sum + val, 0)
    case 'avg':
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
    case 'count':
      return values.length
    case 'max':
      return values.length > 0 ? Math.max(...values) : 0
    case 'min':
      return values.length > 0 ? Math.min(...values) : 0
    default:
      return 0
  }
}

const updatePivotData = () => {
  if (rows.value.length === 0 && columns.value.length === 0) {
    pivotData.value = []
    return
  }

  const filteredData = getFilteredData()

  if (rows.value.length === 0) {
    pivotData.value = []
    return
  }

  // Agrupar por filas
  const rowGroups = new Map()

  filteredData.forEach(item => {
    const rowKey = rows.value.map(row => item[row]).join('|')

    if (!rowGroups.has(rowKey)) {
      rowGroups.set(rowKey, {
        rowValues: {},
        items: []
      })

      rows.value.forEach(row => {
        rowGroups.get(rowKey).rowValues[row] = item[row]
      })
    }

    rowGroups.get(rowKey).items.push(item)
  })

  // Generar datos pivote
  const result = []

  rowGroups.forEach((rowGroup, rowKey) => {
    const pivotRow = {
      rowValues: rowGroup.rowValues,
      columnData: {},
      aggregatedValues: {}
    }

    // Si hay columnas definidas
    if (columns.value.length > 0) {
      columnCombinations.value.forEach(colComb => {
        const colItems = rowGroup.items.filter(item => {
          const itemColKey = columns.value.map(col => item[col]).join('|')
          return itemColKey === colComb.key
        })

        if (values.value.length > 0) {
          const valueResults = values.value.map(value => {
            if (value.field) {
              return aggregate(colItems, value.field, value.aggregation)
            }
            return 0
          })

          pivotRow.columnData[colComb.key] = valueResults.length === 1 ?
            valueResults[0] : valueResults.join(' / ')
        } else {
          pivotRow.columnData[colComb.key] = colItems.length
        }
      })
    } else {
      // Sin columnas, solo valores agregados
      values.value.forEach(value => {
        if (value.field) {
          const key = value.field + '_' + value.aggregation
          pivotRow.aggregatedValues[key] = aggregate(rowGroup.items, value.field, value.aggregation)
        }
      })
    }

    result.push(pivotRow)
  })

  pivotData.value = result
}

// Watchers
watch(() => props.data, () => {
  if (props.data && props.data.length > 0) {
    updatePivotData()
  }
}, { deep: true, immediate: true })

// Inicialización
onMounted(() => {
  if (props.data && props.data.length > 0) {
    // Configuración inicial de ejemplo
    addValue()
  }
})
</script>

<style scoped>
.pivot-table-container {
  width: 100%;
}

.pivot-table {
  border-collapse: collapse;
  font-size: 0.875rem;
}

.pivot-table th,
.pivot-table td {
  border: 1px solid #e0e0e0;
  white-space: nowrap;
}

.pivot-table th {
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

.pivot-table-wrapper {
  max-height: 600px;
  overflow-y: auto;
}

.border {
  border: 1px solid #e0e0e0;
}
</style>
