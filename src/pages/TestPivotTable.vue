<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Tabla Pivote de Revistas</div>

    <q-card>
      <q-card-section>
        <div class="row items-center q-gutter-md">
          <q-btn color="primary" label="Cargar Datos" @click="fetchData" :loading="loading" />

          <q-btn color="secondary" label="Limpiar" @click="resetTable" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <PivotTable :data="tableData" :loading="loading" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import PivotTable from 'components/PivotTable.vue'

const tableData = ref([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const response = await fetch('http://poi-r.vps.co.ve:3000/')
    const data = await response.json()
    tableData.value = data

    // Convertir campos numéricos de string a number
    tableData.value = tableData.value.map(item => ({
      ...item,
      id: Number(item.id),
      anio_inicial: Number(item.anio_inicial)
    }))
  } catch (error) {
    console.error('Error fetching data:', error)
    // Datos de ejemplo en caso de error
    tableData.value = [
      {
        "id": 1,
        "revista": "REVISTA 1",
        "area_conocimiento": "ANTROPOLOGIA",
        "anio_inicial": 1992
      },
      {
        "id": 2,
        "revista": "ASTRONOMIA Y ASTROFISICA",
        "area_conocimiento": "ANTROPOLOGIA",
        "anio_inicial": 2009
      }
    ]
  } finally {
    loading.value = false
  }
}

function resetTable() {
  tableData.value = []
}
</script>
