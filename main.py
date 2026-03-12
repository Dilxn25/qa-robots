import os
import json
from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from datetime import datetime

app = Flask(__name__)

MONGO_URI = os.getenv("MONGO_URI")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

db = None
if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client.qa_robots_db
    except Exception as e:
        print("Error configurando Mongo:", e)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_with_ai():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Falta GEMINI_API_KEY en Render"}), 500
    
    data = request.json
    
    # Nuevo prompt estrictamente para generación de documentación en bloques Markdown
    prompt = f"""
Eres un Ingeniero Principal de QA experto en Web Scraping (Apify, Puppeteer, Cheerio).
Analiza los cambios entre el código antiguo y nuevo que se te proporcionan al final.
Tu objetivo es generar EXACTAMENTE CUATRO bloques de código independientes (dos para la versión en INGLÉS y dos para la versión en ESPAÑOL) para evitar conflictos de formato al copiar y pegar.

REGLAS DE ORO (PUNTUALIDAD Y FORMATO):
1. PROHIBIDO explicar código básico.
2. AGRUPA los cambios técnicos.
3. CERO REPETICIONES en 'Extra notes'.
4. REGLA DE SALIDA: Tu única respuesta deben ser los 4 bloques de código exigidos. SIN texto fuera de los bloques.
5. DETECCIÓN CRAWLER vs UPDATER: Revisa el bloque `startUrls`. Si `userData` tiene múltiples variables (Brand, ExcludedKeyWords, Paginated, etc.), es un **Crawler**. Si tiene muy pocas (solo Manufacturer, Id, etc.), es un **Updater**. REEMPLAZA la palabra "Crawler" por "Updater" (y "crawler" por "updater") en toda la plantilla generada si corresponde. En la tabla, si es Updater, la prueba cruzada será "Updater-crawler comparison".
6. FORMATO DE INPUT ESTRICTO Y ANIDACIÓN: Para poder incluir la etiqueta ```json debajo del título **[Tipo] Input** SIN romper el botón de copiar de la interfaz, **DEBES ENVOLVER TUS 4 BLOQUES EXTERIORES CON CUATRO COMILLAS INVERTIDAS** (es decir, usa ````markdown para abrir el bloque y ```` para cerrarlo).
7. RESPETA ESTRICTAMENTE LAS NEGRITAS Y VIÑETAS EXACTAS DEL FORMATO EXIGIDO.
8. USO DE JSON INTERNO: Al usar 4 comillas para el exterior, debes usar obligatoriamente las 3 comillas clásicas (```json) para envolver el código JSON internamente en los bloques 1 y 3.
9. CAMBIOS DE ACTOR/VERSIÓN CONDICIONALES: Las viñetas sobre "Change the Actor", "Changed version" y la justificación del cambio de bot en "Extra notes" son SOLO EJEMPLOS. **SOLO DEBES GENERARLAS** si en los códigos proporcionados realmente existe un cambio de actor o versión. Si no hay cambio, **OMITE** esas líneas por completo; no inventes que cambió de Cheerio a Puppeteer.

REGLAS DE VERSIONES Y PROXY:
- Cheerio = 3.0.17 | Puppeteer = 3.0.14
- Formato de Proxy Estricto: TIPO (PAÍS) [CONFIGURACIÓN]. Ej: 'RESIDENTIAL (JP) [RECOMMENDED]'.

FORMATO EXIGIDO DE SALIDA (Genera los 4 bloques en este orden exacto, usando ````markdown para cada uno):

--- INGLÉS ---
1. Genera un bloque de código (con 4 comillas) que contenga EXACTAMENTE esta estructura literal (reemplaza [Tipo] por Crawler o Updater según corresponda):

**[Tipo] Input**
```json
[AQUÍ EL JSON LITERAL DE STARTURLS EXTRAÍDO DEL CÓDIGO NUEVO]
```

2. Genera OTRO bloque de código (con 4 comillas) ````markdown con el resto de la documentación respetando esta jerarquía exacta de negritas y viñetas:

**About [tipo] robot**

**Made the following fixes**
* [SI APLICA] Change the Actor:
  * From: [Actor Antiguo]
  * To: [Actor Nuevo]
* [SI APLICA] Change the Input Url:
  * From: [Url Antiguo]
  * To: [Url Nuevo]
* [Acción técnica agrupada 1]
* [Acción técnica agrupada 2]

**Made the following improvements**
* [Mejora técnica 1]

**Results and main settings**
* [SI APLICA] Changed version:
  * From: [Actor Antiguo] ([Versión fija según reglas])
  * To: [Actor Nuevo] ([Versión fija según reglas])
* [SI APLICA CAMBIO DE PROXY] Changed proxy configuration:
  * From: [Formato estricto antiguo]
  * To: [Formato estricto nuevo]
* [SI EL PROXY SE MANTUVO] Preserved proxy configuration: [Formato estricto]
* Preserved ID of each product
* Preserved the rest of original production logic

**Extra notes**
* [SI APLICA] The bot was changed to [Actor Nuevo] because the page required the execution of JavaScript code.
* [SI APLICA] The entry URLs were changed because a more efficient one was found.. 
* [Justificación agrupada 1]
* [Justificación agrupada 2]

**Robot Testing**

| Tested (with/between) | Last [Tipo] run (Apify Last Run) | Tested with Production [Robot Opuesto] Robot in CS_QA environment | [Tipo] Validation (validation robot test) | [Tipo]-[Robot Opuesto] comparison (comparison robot test) | Extra Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Tipo] results | [Apify Console]() | [Apify Console]() | [Apify Console]() | [Apify Console]() | |

--- ESPAÑOL ---
3. Genera un bloque de código (con 4 comillas) ````markdown idéntico al primero (con el título **[Tipo] Input** y el bloque de ```json anidado).

4. Genera OTRO bloque de código (con 4 comillas) ````markdown con la TRADUCCIÓN EXACTA de la documentación en inglés (respetando las mismas negritas, viñetas, tabla y adaptación de Crawler/Updater).

CÓDIGO ANTIGUO:
{data.get('old_code', 'N/A')}

CÓDIGO NUEVO:
{data.get('new_code', 'N/A')}
"""
    
    try:
        response = model.generate_content(prompt)
        
        # Como el prompt ya no retorna JSON, sino bloques de Markdown crudo,
        # devolvemos el texto generado directamente en lugar de intentar parsearlo.
        # Ajusta tu frontend (script.js) si antes esperaba un objeto JSON estructurado.
        return jsonify({"raw_markdown": response.text})
        
    except ResourceExhausted:
        return jsonify({"error": "⚠️ Límite de cuota de la API alcanzado. Has excedido las solicitudes por minuto de Gemini. Espera 60 segundos e intenta de nuevo."}), 429
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save', methods=['POST'])
def save_to_mongo():
    if db is None:
        return jsonify({"error": "La base de datos no está conectada."}), 500
    
    data = request.json
    data['fecha_auditoria'] = datetime.utcnow().isoformat()
    
    try:
        db.entrenamiento_ia.insert_one(data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": f"Fallo al guardar: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)