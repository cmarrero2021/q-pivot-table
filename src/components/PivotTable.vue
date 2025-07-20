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
        </q-card-section>
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

  let filteredData = [...props.data]
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

  // Preparar columnas
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

  // Preparar filas
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
</style>
