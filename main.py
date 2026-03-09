import os
import json
from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
import google.generativeai as genai
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
Eres un Ingeniero Principal de QA y Arquitecto de Datos experto en Web Scraping (Apify, Puppeteer, Cheerio, Metamorph).
Tu objetivo es analizar un parche de código y extraer conocimiento técnico estructurado que será usado para entrenar a un futuro modelo de IA especializado en auto-reparar scrapers.

URL Objetivo: {data.get('url', 'N/A')}
Motivo del desarrollador (Crudo): {data.get('reason', 'N/A')}
Código Antiguo: {data.get('old_code', 'N/A')}
Código Nuevo: {data.get('new_code', 'N/A')}

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{{
    "dominio": "Nombre del dominio extraído de la URL",
    "pais": "País deducido o Global",
    "tipo_robot": "Crawler o Updater",
    "actor": "Cheerio, Puppeteer o Metamorph",
    "analisis_entrenamiento": {{
        "problema_raiz": "Explicación técnica profunda de por qué fallaba el código antiguo (Ej: 'Cambio en la estructura del DOM de .product-list a .grid-items', 'Bloqueo por huella TLS', 'Paginación infinita alterada').",
        "solucion_aplicada": "Explicación algorítmica de cómo el código nuevo resuelve el problema.",
        "patron_reparacion": "Clasificación del parche. SÓLO USA ESTOS VALORES: [DOM Traversal, Anti-bot Evasion, Network Interception, State Management, Data Parsing, Pagination Logic, Proxy Configuration, Unknown]"
    }},
    "conceptos_ia": [
        {{ "concepto": "Técnica avanzada detectada", "justificacion": "Análisis técnico de la técnica en el contexto del código." }}
    ],
    "documentacion_md": "TEXTO_MARKDOWN_AQUI"
}}

REGLAS ESTRICTAS PARA 'documentacion_md' (INGLÉS, EXTREMADAMENTE TÉCNICO, CERO LENGUAJE ROBÓTICO):
1. Inicia con '**Crawler Input**' o '**Updater Input**' y un bloque ```json con la URL en texto plano.
2. Título '**About crawler robot**' o '**About updater robot**'.
3. Viñeta '* **Made the following fixes**'. SÓLO sub-viñetas con la acción técnica directa de la reparación (Ej: 'Updated extraction logic to target .items property'). PROHIBIDO justificar o explicar el "para qué".
4. Viñeta '* **Made the following improvements**'. SÓLO optimizaciones o logs añadidos, no reparaciones. Sola la acción técnica cruda.
5. Viñeta '* **Results and main settings**'. Analiza los códigos y usa EXACTAMENTE estas 4 líneas evaluando si se mantuvo o cambió:
   * [Preserved/Changed] version [detectar versión] [version-X]
   * [Preserved/Changed] proxy configuration [detectar proxy] [AUTOMATIC]
   * [Preserved/Changed] ID of each product
   * [Preserved/Changed] the rest of original production logic
6. Viñeta '* **Extra notes**'. AQUÍ Y SOLO AQUÍ van las justificaciones técnicas de los fixes/improvements. Ve al grano, sin introducciones.
7. Al final, añade el subtítulo '**Robot Testing**' y la siguiente tabla exacta en Markdown:

| Tested (with/between) | Last Crawler run (Apify Last Run) | Tested with Production Updater Robot in CS_QA environment | Crawler Validation (validation robot test) | Crawler-updater comparison (comparison robot test) | Extra Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Crawler results | [Apify Console](#) | [Apify Console](#) | [Apify Console](#) | [Apify Console](#) | |

IMPORTANTE PARA FORMATO: Escapa correctamente todos los saltos de línea (usa \\n) y las comillas dobles (\\") dentro del string de 'documentacion_md' para que el JSON sea estrictamente válido. No incluyas texto introductorio, devuelve directamente el objeto JSON.
"""
    
    try:
        # Forzamos la respuesta nativa en JSON para evitar errores de parseo
        response = model.generate_content(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Como forzamos application/json, el texto ya viene limpio sin bloques de código Markdown alrededor
        resultado = json.loads(response.text)
        return jsonify(resultado)
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