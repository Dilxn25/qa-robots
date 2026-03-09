import os
import json
from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
import google.generativeai as genai
from datetime import datetime

app = Flask(__name__)

# Cargar variables de Render
MONGO_URI = os.getenv("MONGO_URI")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Conectar a MongoDB Atlas
db = None
if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI)
        db = client.qa_robots_db
    except Exception as e:
        print("Error conectando a Mongo:", e)

# Configurar Gemini IA
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
    Eres un Arquitecto de Software experto en Web Scraping.
    Analiza esta modificación de un robot:
    URL: {data.get('url', 'N/A')}
    Motivo del DEV (Texto Crudo): {data.get('reason', 'N/A')}
    Código: {data.get('code', 'N/A')}
    
    Devuelve ÚNICAMENTE un JSON válido (sin formato markdown ```json) con esta estructura exacta:
    {{
        "dominio": "Nombre limpio del dominio",
        "pais": "País deducido por la URL o Global",
        "tipo_robot": "Crawler o Updater",
        "actor": "Cheerio o Puppeteer",
        "conceptos_ia": ["Concepto 1", "Concepto 2"]
    }}
    Extrae los conceptos_ia limpiando el motivo del DEV (Ej: "Evasión Antibot", "Migración a Puppeteer").
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
    if not db:
        return jsonify({"error": "Falta MONGO_URI en Render"}), 500
    
    data = request.json
    data['fecha_auditoria'] = datetime.utcnow().isoformat()
    
    try:
        db.entrenamiento_ia.insert_one(data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5050)