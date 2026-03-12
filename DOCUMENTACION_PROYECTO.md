# Documentación Completa del Proyecto QA Robots Workstation

## Estructura de Archivos

- **main.py**: Servidor principal Flask. Expone endpoints para análisis con IA y guardado en MongoDB. Gestiona la lógica backend y la integración con Gemini AI y MongoDB.
- **requirements.txt**: Lista de dependencias Python necesarias para el proyecto.
- **static/**: Archivos estáticos (CSS, JS).
  - **css/style.css**: Estilos visuales de la aplicación web.
  - **js/script.js**: Lógica de frontend, notificaciones, resaltado de diferencias, utilidades.
- **templates/index.html**: Plantilla HTML principal. Interfaz de usuario con paneles, formularios y áreas de resultados.

## main.py

### Variables y Configuración
- **MONGO_URI**: Variable de entorno para la conexión a MongoDB.
- **GEMINI_API_KEY**: Variable de entorno para la API de Google Gemini.
- **db**: Conexión a la base de datos MongoDB.
- **model**: Modelo generativo Gemini 2.5 Flash.

### Funciones y Endpoints

#### Detalle de todas las funciones en `main.py`

- **index()**
  - **Ruta:** `/`
  - **Descripción:** Renderiza la plantilla principal `index.html` para mostrar la interfaz web al usuario.

- **analyze_with_ai()**
  - **Ruta:** `/api/analyze` (POST)
  - **Descripción:**
    - Recibe un JSON con los campos: `url`, `reason`, `old_code`, `new_code`.
    - Construye un prompt muy detallado y estricto para la IA Gemini, siguiendo reglas de formato y validación específicas para QA y Web Scraping.
    - Envía el prompt al modelo generativo Gemini 2.5 Flash y espera una respuesta estructurada en JSON.
    - Procesa la respuesta, limpia el formato y la retorna al frontend.
    - Maneja errores de cuota de la API y errores generales, devolviendo mensajes claros al usuario.

- **save_to_mongo()**
  - **Ruta:** `/api/save` (POST)
  - **Descripción:**
    - Recibe un JSON con los datos generados por la IA y el usuario.
    - Añade la fecha de auditoría (`fecha_auditoria`) en formato UTC.
    - Inserta el documento en la colección `entrenamiento_ia` de la base de datos MongoDB.
    - Devuelve un mensaje de éxito o error según el resultado de la operación.

- **Configuración de la base de datos y modelo IA**
  - **Bloque de inicialización:**
    - Lee las variables de entorno `MONGO_URI` y `GEMINI_API_KEY`.
    - Si existe `MONGO_URI`, intenta conectar a MongoDB y asigna la base de datos a `db`.
    - Si existe `GEMINI_API_KEY`, configura el cliente Gemini y el modelo generativo.
    - Si ocurre un error en la conexión, lo imprime en consola.

- **if __name__ == '__main__':**
  - Lanza el servidor Flask en modo debug, puerto 5000.

---

**Resumen de funciones clave:**

| Función              | Ruta/Trigger         | ¿Qué hace?                                                                                 |
|----------------------|---------------------|--------------------------------------------------------------------------------------------|
| index                | `/`                 | Renderiza la interfaz principal.                                                           |
| analyze_with_ai      | `/api/analyze`      | Analiza código y metadatos con IA Gemini, devuelve documentación y análisis estructurado.   |
| save_to_mongo        | `/api/save`         | Guarda los resultados del análisis en MongoDB.                                             |
| (init config)        | (al iniciar script) | Configura conexión a MongoDB y Gemini AI usando variables de entorno.                      |
| __main__             | (al ejecutar)       | Lanza el servidor Flask en modo debug.                                                     |

Cada función está documentada para que cualquier auditor pueda entender su propósito y lógica principal.

## static/js/script.js


### Funciones y utilidades principales de `script.js`

- **showToast(message, type = 'info')**: Muestra una notificación temporal (toast) en pantalla, con mensaje y tipo (info, success, error, etc). Permite copiar el texto y se cierra automáticamente o manualmente.
- **removeToast(toast)**: Elimina un toast de la interfaz con animación.
- **getDiffHtml(str1, str2)**: Algoritmo de resaltado inteligente. Compara dos cadenas y devuelve HTML con diferencias resaltadas (sin tachados, solo colores).
- **toggleSidebar()**: Abre/cierra la barra lateral y su overlay en la interfaz móvil.
- **copyOutput()**: Copia el contenido de la consola de resultados al portapapeles y muestra feedback visual.
- **copyAiDocs(lang)**: Copia la documentación generada por IA (en inglés o español) al portapapeles y muestra notificación.
- **setTab(tab)**: Cambia la pestaña activa de la interfaz, mostrando/ocultando paneles y restaurando vistas según el contexto.
- **autoDetectFields()**: Detecta automáticamente los campos presentes en el JSON de entrada y actualiza dinámicamente los paneles de la UI según la pestaña activa.
- **process()**: Orquesta el procesamiento principal según la pestaña: comparación de códigos, comparación de resultados, búsqueda de duplicados, validación QA o extracción de URLs. Muestra los resultados en la consola.
- **compareCodesJSON(a, b)**: Compara dos objetos JSON profundamente, mostrando diferencias clave por clave en tarjetas visuales.
- **compareCodesText(rawA, rawB)**: Compara dos textos línea por línea, resaltando diferencias y mostrando un resumen visual.
- **compareResults(listA, listB)**: Compara dos listas de productos/códigos, campo a campo, mostrando resumen de coincidencias y diferencias por campo y producto.
- **toggleQaCrawlerFields()**: Muestra/oculta campos de exclusión según el tipo de robot seleccionado en el validador QA.
- **runDynamicQA(data)**: Valida un JSON de productos según reglas QA dinámicas, mostrando errores, advertencias, duplicados y estadísticas por campo.
- **findDuplicates(data)**: Busca y muestra productos duplicados por ID, URL o nombre en un JSON.
- **runExtraction(data)**: Extrae y muestra un JSON de startUrls únicos, con los campos seleccionados, para entrenamiento o scraping.
- **switchApiTab(tabId)**: Cambia la pestaña activa del tester de API (headers/body).
- **importCurlPrompt()**: Permite importar un comando cURL y autocompletar los campos del tester de API (URL, método, headers, body).
- **sendApiRequest()**: Envía una petición HTTP usando los parámetros del tester de API, muestra el resultado y el tiempo de respuesta.
- **clearAll()**: Limpia todos los campos de texto y la consola de resultados.
- **addConceptCard(concepto, justificacion)**: Añade una tarjeta visual para conceptos clave de IA en el panel de entrenamiento.
- **extractAIMetadata()**: Envía los datos de entrada a la API de análisis IA, procesa la respuesta y actualiza los campos de documentación y metadatos en la UI.
- **saveToDatabase()**: Envía los datos generados y supervisados a la API para guardarlos en MongoDB, mostrando feedback visual.

---

**Resumen de funciones clave:**

| Función                | ¿Qué hace?                                                                                       |
|------------------------|--------------------------------------------------------------------------------------------------|
| showToast              | Muestra notificaciones temporales (toasts) en la interfaz.                                        |
| removeToast            | Elimina un toast de la interfaz.                                                                  |
| getDiffHtml            | Resalta diferencias entre dos cadenas en HTML.                                                    |
| toggleSidebar          | Abre/cierra la barra lateral.                                                                    |
| copyOutput             | Copia el resultado de la consola al portapapeles.                                                |
| copyAiDocs             | Copia la documentación IA generada (en/es) al portapapeles.                                      |
| setTab                 | Cambia la pestaña activa y actualiza la UI.                                                      |
| autoDetectFields       | Detecta campos en el JSON de entrada y actualiza la UI.                                           |
| process                | Ejecuta el flujo principal según la pestaña activa.                                               |
| compareCodesJSON       | Compara dos JSON y muestra diferencias clave por clave.                                           |
| compareCodesText       | Compara dos textos línea a línea y resalta diferencias.                                           |
| compareResults         | Compara listas de productos/códigos y muestra resumen de diferencias.                            |
| toggleQaCrawlerFields  | Muestra/oculta campos de exclusión en QA según el tipo de robot.                                 |
| runDynamicQA           | Valida productos según reglas QA dinámicas y muestra errores/estadísticas.                       |
| findDuplicates         | Busca y muestra duplicados en un JSON.                                                           |
| runExtraction          | Extrae startUrls únicos y muestra el JSON resultante.                                            |
| switchApiTab           | Cambia la pestaña activa del tester de API.                                                      |
| importCurlPrompt       | Importa un comando cURL y autocompleta el tester de API.                                         |
| sendApiRequest         | Envía una petición HTTP desde el tester de API y muestra el resultado.                           |
| clearAll               | Limpia todos los campos y la consola.                                                            |
| addConceptCard         | Añade una tarjeta de concepto clave en el panel de IA.                                           |
| extractAIMetadata      | Llama a la API de análisis IA, procesa y muestra la documentación y metadatos generados.         |
| saveToDatabase         | Guarda los datos generados/supervisados en MongoDB vía la API.                                   |

Cada función está documentada para que cualquier auditor o desarrollador entienda su propósito y lógica principal.

## templates/index.html

### Estructura de la Interfaz
- **Sidebar**: Navegación entre módulos (auditoría, comparación, validadores, extractor, API tester).
- **Input Area**: Paneles para pegar código antiguo/nuevo, configuración de QA, comparación, extracción y pruebas de API.
- **AI Train Panel**: Formulario para generar documentación y dataset con IA, mostrando resultados en inglés y español, y permitiendo guardar en MongoDB.
- **Toolbar y Output Panel**: Botón para ejecutar análisis visual y consola de resultados.
- **Integración con JS**: Carga el script principal para la lógica de frontend.

## requirements.txt

- **Flask==3.0.2**: Framework web principal.
- **gunicorn==21.2.0**: Servidor WSGI para producción.
- **pymongo[srv]==4.6.2**: Cliente MongoDB.
- **google-generativeai==0.5.0**: Cliente para la API de Gemini AI.

## Resumen de Flujo
1. El usuario interactúa con la interfaz web (index.html + script.js).
2. Envía código y parámetros a `/api/analyze`.
3. El backend (main.py) construye un prompt y consulta Gemini AI.
4. El resultado se muestra y puede guardarse en MongoDB vía `/api/save`.
5. Notificaciones y diferencias visuales se gestionan en el frontend.

## Consideraciones de Seguridad y Configuración
- Las claves y URIs sensibles se gestionan por variables de entorno.
- El backend valida la presencia de claves antes de procesar.
- El frontend está desacoplado del backend, usando AJAX para comunicación.

## Extensibilidad
- Se pueden agregar más endpoints Flask para nuevas funcionalidades.
- El frontend permite añadir más paneles o validadores fácilmente.
- El sistema de prompts y reglas para Gemini AI es fácilmente modificable en `main.py`.

---

**Autor:** Generado automáticamente por GitHub Copilot (GPT-4.1)
**Fecha:** 12 de marzo de 2026
