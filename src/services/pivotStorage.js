import { v4 as uuidv4 } from 'uuid'
import { useQuasar } from 'quasar'

const STORAGE_KEY = 'pivotQueries'
const CURRENT_VERSION = 'v1'

export function usePivotStorage() {
  const $q = useQuasar()

  // Inicializar el almacenamiento si no existe
  function initStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          [CURRENT_VERSION]: {
            queries: [],
            settings: {
              maxQueries: 50,
              autoCleanDays: 90,
            },
          },
        }),
      )
    }
  }

  // Obtener todas las consultas
  function getQueries() {
    initStorage()
    const storage = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return storage[CURRENT_VERSION].queries.sort(
      (a, b) => new Date(b.lastUsed) - new Date(a.lastUsed),
    )
  }

  // Guardar una nueva consulta
  function saveQuery(name, config, tags = []) {
    initStorage()
    const storage = JSON.parse(localStorage.getItem(STORAGE_KEY))
    const queries = storage[CURRENT_VERSION].queries

    // Validar nombre único
    if (queries.some((q) => q.name === name)) {
      $q.notify({
        message: 'Ya existe una consulta con ese nombre',
        color: 'negative',
        icon: 'mdi-alert-circle',
      })
      return false
    }

    const newQuery = {
      id: uuidv4(),
      name,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      usageCount: 0,
      tags,
      config,
    }

    queries.push(newQuery)

    // Aplicar límite máximo de consultas
    if (queries.length > storage[CURRENT_VERSION].settings.maxQueries) {
      queries.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      queries.splice(storage[CURRENT_VERSION].settings.maxQueries)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    return true
  }

  // Actualizar una consulta existente (solo lastUsed y usageCount)
  function updateQueryUsage(id) {
    initStorage()
    const storage = JSON.parse(localStorage.getItem(STORAGE_KEY))
    const query = storage[CURRENT_VERSION].queries.find((q) => q.id === id)

    if (query) {
      query.lastUsed = new Date().toISOString()
      query.usageCount = (query.usageCount || 0) + 1
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    }
  }

  // Eliminar una consulta
  function deleteQuery(id) {
    initStorage()
    const storage = JSON.parse(localStorage.getItem(STORAGE_KEY))
    storage[CURRENT_VERSION].queries = storage[CURRENT_VERSION].queries.filter((q) => q.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
  }

  // Limpiar consultas antiguas
  function cleanOldQueries() {
    initStorage()
    const storage = JSON.parse(localStorage.getItem(STORAGE_KEY))
    const { autoCleanDays } = storage[CURRENT_VERSION].settings
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - autoCleanDays)

    storage[CURRENT_VERSION].queries = storage[CURRENT_VERSION].queries.filter((q) => {
      return new Date(q.lastUsed) > cutoffDate
    })

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
  }

  return {
    initStorage,
    getQueries,
    saveQuery,
    updateQueryUsage,
    deleteQuery,
    cleanOldQueries,
  }
}
