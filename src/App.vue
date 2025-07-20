<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          <q-icon name="pivot_table_chart" class="q-mr-sm" />
          Tabla Pivote Demo
        </q-toolbar-title>

        <q-btn flat round dense icon="refresh" @click="loadData" :loading="loading">
          <q-tooltip>Recargar datos</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="q-pa-md">
        <div class="row q-mb-md">
          <div class="col-12">
            <q-card>
              <q-card-section>
                <div class="text-h6">Información de los Datos</div>
                <div class="text-body2 text-grey-7">
                  <div>Total de registros: {{ data.length }}</div>
                  <div v-if="data.length > 0">
                    Campos disponibles: {{ Object.keys(data[0]).join(', ') }}
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div v-if="error" class="row q-mb-md">
          <div class="col-12">
            <q-banner class="bg-negative text-white">
              <template v-slot:avatar>
                <q-icon name="error" />
              </template>
              Error al cargar los datos: {{ error }}
              <template v-slot:action>
                <q-btn flat label="Reintentar" @click="loadData" />
              </template>
            </q-banner>
          </div>
        </div>

        <div v-if="loading" class="row">
          <div class="col-12 text-center q-pa-xl">
            <q-spinner-dots size="3rem" color="primary" />
            <div class="text-h6 q-mt-md">Cargando datos...</div>
          </div>
        </div>

        <div v-else-if="data.length === 0 && !error" class="row">
          <div class="col-12 text-center q-pa-xl">
            <q-icon name="warning" size="4rem" color="orange" />
            <div class="text-h6 q-mt-md text-grey-6">
              No hay datos disponibles
            </div>
            <q-btn label="Cargar Datos" color="primary" @click="loadData" class="q-mt-md" />
          </div>
        </div>

        <div v-else>
          <!-- Componente de tabla pivote -->
          <PivotTable :data="data" :loading="loading" />
        </div>

        <!-- Datos de ejemplo -->
        <div class="row q-mt-lg">
          <div class="col-12">
            <q-expansion-item expand-separator icon="data_object" label="Ver datos de ejemplo (JSON)"
              caption="Muestra los primeros 3 registros de la API">
              <q-card>
                <q-card-section>
                  <pre class="text-caption">{{ JSON.stringify(data.slice(0, 3), null, 2) }}</pre>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </div>
        </div>

        <!-- Instrucciones de uso -->
        <div class="row q-mt-md">
          <div class="col-12">
            <q-expansion-item expand-separator icon="help" label="Instrucciones de uso"
              caption="Cómo utilizar la tabla pivote">
              <q-card>
                <q-card-section>
                  <div class="text-h6 q-mb-md">Cómo usar la Tabla Pivote:</div>

                  <div class="q-mb-md">
                    <div class="text-subtitle1 q-mb-sm">1. Filtros</div>
                    <div class="text-body2 text-grey-7 q-mb-sm">
                      Selecciona campos para filtrar los datos. Podrás elegir valores específicos para cada filtro.
                    </div>
                  </div>

                  <div class="q-mb-md">
                    <div class="text-subtitle1 q-mb-sm">2. Columnas</div>
                    <div class="text-body2 text-grey-7 q-mb-sm">
                      Los campos seleccionados se mostrarán como columnas en la tabla.
                      Cada combinación única de valores creará una columna.
                    </div>
                  </div>

                  <div class="q-mb-md">
                    <div class="text-subtitle1 q-mb-sm">3. Filas</div>
                    <div class="text-body2 text-grey-7 q-mb-sm">
                      Los campos seleccionados se mostrarán como filas en la tabla.
                      Cada combinación única de valores creará una fila.
                    </div>
                  </div>

                  <div class="q-mb-md">
                    <div class="text-subtitle1 q-mb-sm">4. Valores</div>
                    <div class="text-body2 text-grey-7 q-mb-sm">
                      Selecciona campos numéricos y la función de agregación:
                    </div>
                    <ul class="q-pl-md">
                      <li><strong>Suma:</strong> Suma todos los valores</li>
                      <li><strong>Promedio:</strong> Calcula el promedio</li>
                      <li><strong>Contar:</strong> Cuenta el número de registros</li>
                      <li><strong>Máximo:</strong> Valor máximo</li>
                      <li><strong>Mínimo:</strong> Valor mínimo</li>
                    </ul>
                  </div>

                  <div class="bg-blue-1 q-pa-md rounded-borders">
                    <div class="text-subtitle2 text-primary q-mb-sm">
                      <q-icon name="lightbulb" class="q-mr-sm" />
                      Ejemplo de configuración:
                    </div>
                    <div class="text-body2">
                      - <strong>Filas:</strong> estado, área_conocimiento<br>
                      - <strong>Columnas:</strong> editorial<br>
                      - <strong>Valores:</strong> Contar de id<br>
                      - <strong>Filtros:</strong> idioma = "ESPAÑOL"
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PivotTable from './components/PivotTable.vue'

// Estado reactivo
const data = ref([])
const loading = ref(false)
const error = ref('')

// API URL
const API_URL = 'http://poi-r.vps.co.ve:3000/'

// Función para cargar datos
const loadData = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const jsonData = await response.json()

    // Validar que sea un array
    if (Array.isArray(jsonData)) {
      data.value = jsonData
    } else {
      throw new Error('Los datos recibidos no son un array válido')
    }

  } catch (err) {
    console.error('Error al cargar datos:', err)
    error.value = err.message || 'Error desconocido al cargar los datos'

    // Usar datos de ejemplo en caso de error
    data.value = [
      {
        "id": 1,
        "revista": "REVISTA 1",
        "area_conocimiento": "ANTROPOLOGIA",
        "indice": " NO PERTENECE A NINGÚN INDICE",
        "idioma": "ESPAÑOL",
        "editorial": "ELSEVIER",
        "periodicidad": "DIARIO",
        "formato": "IMPRESO",
        "estado": "AMAZONAS",
        "ciudad": "MAROA",
        "nombres_editor": "NOMBRE EDITOR",
        "apellidos_editor": "APELLIDO EDITOR",
        "correo_editor": "editor@correo.com",
        "deposito_legal_impreso": "DL-C-00007-2025",
        "deposito_legal_digital": "DL-DIG-00007-2025",
        "issn_impreso": "7890-1234",
        "issn_digital": "3210-9876",
        "url": "https://www.svbe.org/acta-cientifica/",
        "anio_inicial": 1992,
        "direccion": "AVENIDA PRINCIPAL C/C ALFREDO JAHN Y ÁLVAREZ MICHAUD, CASA COLEGIO DE BIOANALISTAS, N° 13-01, URBANIZACIÓN LOS CHORROS.",
        "telefono": "2122396072",
        "resumen": "REVISTA ARBITRADA E INDIZADA DEDICADA A PUBLICAR LOS TRABAJOS DE LOS PROFESIONALES DEL BIOANÁLISIS EN INVESTIGACIÓN BÁSICA Y APLICADA.",
        "portada": "revista01.jpg"
      },
      {
        "id": 2,
        "revista": "ASTRONOMIA Y ASTROFISICA",
        "area_conocimiento": "ANTROPOLOGIA",
        "indice": " NO PERTENECE A NINGÚN INDICE",
        "idioma": "ESPAÑOL",
        "editorial": "ELSEVIER",
        "periodicidad": "DIARIO",
        "formato": "IMPRESO",
        "estado": "ARAGUA",
        "ciudad": "PUERTO AYACUCHO",
        "nombres_editor": "FDSDFSDFSDF",
        "apellidos_editor": "SDFSDF",
        "correo_editor": "editor2@correo.com",
        "deposito_legal_impreso": "DL-E-00010-2025",
        "deposito_legal_digital": "DL-DIG-00010-2025",
        "issn_impreso": "0123-4567",
        "issn_digital": "0987-6543",
        "url": "https://revistas.upel.edu.ve/index.php/actividadfi",
        "anio_inicial": 2009,
        "direccion": " AV. LAS DELICIAS, ANTIGUO PARQUE DE FERIAS. EDIFICIO ADMINISTRATIVO, 2DO PISO.",
        "telefono": "2742524192",
        "resumen": "REVISTA ACTUAL, TIENE CASI CUARENTA Y CINCO AÑOS DE PERMANENCIA CON SUS ALTIBAJOS Y SUS LUCHAS PARA GANARSE LA CONTINUIDAD Y TRASCENDENCIA DENTRO DEL ARTE Y LA CULTURA.",
        "portada": "revista02.jpg"
      }
    ]
  } finally {
    loading.value = false
  }
}

// Cargar datos al montar el componente
onMounted(() => {
  loadData()
})
</script>

<style>
body {
  font-family: 'Roboto', sans-serif;
}

pre {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}
</style>
