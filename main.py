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
    Eres un Analista QA experto en Web Scraping.
    Analiza los cambios en este robot:
    URL: {data.get('url', 'N/A')}
    Motivo (Crudo): {data.get('reason', 'N/A')}
    Código: {data.get('code', 'N/A')}
    
    Devuelve ÚNICAMENTE un JSON con esta estructura:
    {{
        "dominio": "Nombre del dominio",
        "pais": "País deducido o Global",
        "tipo_robot": "Crawler o Updater",
        "actor": "Cheerio, Puppeteer o Metamorph",
        "conceptos_ia": [
            {{ "concepto": "Ej: Evasión Antibot", "justificacion": "Ej: Se añadió User-Agent" }}
        ],
        "documentacion_md": "TEXTO_MARKDOWN_AQUI"
    }}

    REGLAS ESTRICTAS PARA 'documentacion_md' (DEBE ESTAR EN INGLÉS):
    1. Inicia con 'Crawler Input' o 'Updater Input' seguido de un bloque de código JSON con la URL de ejemplo.
    2. Luego pon el título '**About crawler robot**' o '**About updater robot**'.
    3. Crea la viñeta '* **Made the following fixes**' y añade sub-viñetas muy directas (Ej: The price extraction was changed to use...).
    4. Crea la viñeta '* **Made the following improvements**' y añade sub-viñetas directas.
    5. Crea la viñeta '* **Results and main settings**' y pon EXACTAMENTE Y SOLO ESTAS 4 LÍNEAS (no inventes más):
       * Preserved version 3.0.17 [version-3]
       * Preserved proxy configuration DATACENTER [AUTOMATIC]
       * Preserved ID of each product
       * Preserved the rest of original production logic
    6. Crea la viñeta '* **Extra notes**' y pon justificaciones naturales, muy simples, SIN adjetivos (Ej: The stock logic was updated because the button label changes...).
    """
    try:
        response = model.generate_content(prompt)
        clean_text = response.text.replace('```json', '').replace('```', '').strip()
        resultado = json.loads(clean_text)
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