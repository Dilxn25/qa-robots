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
Tu objetivo es extraer conocimiento técnico para un dataset ML, y generar DOS documentaciones de QA (una en INGLÉS y otra en ESPAÑOL) que sean MUY PUNTUALES y DIRECTAS.

URL Objetivo: {data.get('url', 'N/A')}
Motivo del desarrollador (Crudo): {data.get('reason', 'N/A')}
Código Antiguo: {data.get('old_code', 'N/A')}
Código Nuevo: {data.get('new_code', 'N/A')}

REGLAS ESTRICTAS DE VERSIONES Y PROXY:
- Actor Cheerio = versión 3.0.17
- Actor Puppeteer = versión 3.0.14
- Formato de Proxy SÓLO debe ser: TIPO (PAÍS) [CONFIGURACIÓN]. Ejemplos correctos: 'RESIDENTIAL (JP) [AUTOMATIC]', 'DATACENTER [RECOMMENDED]', 'RESIDENTIAL [AUTOMATIC]'. ESTÁ ESTRICTAMENTE PROHIBIDO poner el JSON crudo del proxy.

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
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
    "documentacion_md_en": "TEXTO_MARKDOWN_EN_INGLÉS",
    "documentacion_md_es": "TEXTO_MARKDOWN_EN_ESPAÑOL"
}}

REGLAS INNEGOCIABLES PARA AMBOS MARKDOWNS ('documentacion_md_en' y 'documentacion_md_es'):
1. Inicia con '**Crawler Input**' o '**Updater Input**'. Debajo, extrae literalmente del "Código Nuevo" el JSON de startUrls (url y userData). Ponlo dentro de ```json.
2. Título '**About crawler robot**' o '**About updater robot**'.
3. Viñeta '* **Made the following fixes**'. 
   - Si hubo cambio de actor documenta así:
     Change the Actor:
     From: [Actor Antiguo]
     To: [Actor Nuevo]
   - Para el resto: viñetas MUY CORTAS. Solo la acción técnica directa. PROHIBIDO explicar el motivo aquí.
4. Viñeta '* **Made the following improvements**'. Solo optimizaciones directas.
5. Viñeta '* **Results and main settings**'. EXACTAMENTE este formato y orden:
   * [Changed/Preserved] version [Actor] ([Versión según reglas])
   * [Changed/Preserved] proxy configuration [Formato de proxy estricto: ej. RESIDENTIAL (JP) [AUTOMATIC]]
   * [Changed/Preserved] ID of each product
   * [Changed/Preserved] the rest of original production logic
6. Viñeta '* **Extra notes**'. Aquí van las justificaciones cortas y al grano.
7. Al final, subtítulo '**Robot Testing**' y la tabla exacta en Markdown:
| Tested (with/between) | Last Crawler run (Apify Last Run) | Tested with Production Updater Robot in CS_QA environment | Crawler Validation (validation robot test) | Crawler-updater comparison (comparison robot test) | Extra Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Crawler results | [Apify Console](#) | [Apify Console](#) | [Apify Console](#) | [Apify Console](#) | |

IMPORTANTE: Escapa correctamente los saltos de línea (\\n) y comillas (\\") dentro de los markdowns para no quebrar el JSON.
"""
    
    try:
        # AQUI ESTA LA CORRECCIÓN: Volvemos al código robusto sin el generation_config
        response = model.generate_content(prompt)
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        resultado = json.loads(clean_text)
        return jsonify(resultado)
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