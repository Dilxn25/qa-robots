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
    
    prompt = f"""
Eres un Ingeniero Principal de QA y Arquitecto de Datos experto en Web Scraping.
Tu objetivo es analizar un parche de código y extraer conocimiento técnico para un dataset ML, además de generar documentación de QA MUY PUNTUAL y EXACTA en ESPAÑOL.

URL Objetivo: {data.get('url', 'N/A')}
Motivo del desarrollador (Crudo): {data.get('reason', 'N/A')}
Código Antiguo: {data.get('old_code', 'N/A')}
Código Nuevo: {data.get('new_code', 'N/A')}

REGLAS ESTRICTAS DE VERSIONES:
- Si el actor es Cheerio, su versión es SIEMPRE 3.0.17
- Si el actor es Puppeteer, su versión es SIEMPRE 3.0.14

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{{
    "dominio": "Nombre del dominio extraído",
    "pais": "País deducido o Global",
    "tipo_robot": "Crawler o Updater",
    "actor": "Cheerio, Puppeteer o Metamorph",
    "analisis_entrenamiento": {{
        "problema_raiz": "Explicación técnica del fallo en español.",
        "solucion_aplicada": "Explicación algorítmica de la solución en español.",
        "patron_reparacion": "Clasificación. SÓLO: [DOM Traversal, Anti-bot Evasion, Network Interception, State Management, Data Parsing, Pagination Logic, Proxy Configuration, Unknown]"
    }},
    "conceptos_ia": [
        {{ "concepto": "Técnica avanzada", "justificacion": "Análisis en español." }}
    ],
    "documentacion_md": "TEXTO_MARKDOWN_AQUI"
}}

REGLAS INNEGOCIABLES PARA 'documentacion_md' (EN ESPAÑOL, PUNTUAL, SIN VERBOSIDAD):
1. Inicia con '**Crawler Input**' o '**Updater Input**'.
2. Debajo, extrae literalmente del "Código Nuevo" el objeto JSON que define los startUrls (incluyendo la url y el userData completo). Ponlo dentro de un bloque ```json y asegúrate de que las URLs sean texto plano.
3. Título '**About crawler robot**' o '**About updater robot**'.
4. Viñeta '* **Made the following fixes**'. 
   - SI HUBO CAMBIO DE ACTOR, documenta el cambio de actor, inputs o userData EXACTAMENTE con este formato:
     Change the Actor:
     From: [Actor Antiguo]
     To: [Actor Nuevo]
   - Para el resto de fixes, usa viñetas MUY CORTAS. Solo la acción. (Ej: 'Se añadió .trim().replace(/\\s+/g, ' ') para limpieza de nombre'). PROHIBIDO explicar el motivo aquí.
5. Viñeta '* **Made the following improvements**'. Solo optimizaciones directas (ej: preNavigationHooks).
6. Viñeta '* **Results and main settings**'. Usa EXACTAMENTE este formato:
   - Si cambió el actor/versión:
     * Changed version:
       From: [Actor Antiguo] ([Versión Antigua según reglas])
       To: [Actor Nuevo] ([Versión Nueva según reglas])
   - Si no cambió:
     * Preserved version [Actor] ([Versión según reglas])
   - Y luego las 3 configuraciones obligatorias:
     * [Preserved/Changed] proxy configuration [detectar proxy]
     * [Preserved/Changed] ID of each product
     * [Preserved/Changed] the rest of original production logic
7. Viñeta '* **Extra notes**'. Justificaciones en español, cortas, al grano. (Ej: 'Se cambió de Cheerio a Puppeteer porque la página requiere renderizado de JavaScript').
8. Al final, subtítulo '**Robot Testing**' y esta tabla exacta:

| Tested (with/between) | Last Crawler run (Apify Last Run) | Tested with Production Updater Robot in CS_QA environment | Crawler Validation (validation robot test) | Crawler-updater comparison (comparison robot test) | Extra Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Crawler results | [Apify Console](#) | [Apify Console](#) | [Apify Console](#) | [Apify Console](#) | |

IMPORTANTE: Escapa correctamente los saltos de línea (\\n) y comillas (\\") dentro de 'documentacion_md'. No incluyas explicaciones fuera del JSON.
"""
    
    try:
        response = model.generate_content(prompt)
        # Limpieza manual que es 100% compatible con tu librería actual (v0.4.1)
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        resultado = json.loads(clean_text)
        return jsonify(resultado)
    except ResourceExhausted:
        # Aquí capturamos específicamente el error de límite de tarifa de la API
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