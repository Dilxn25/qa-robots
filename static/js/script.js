let currentTab = 'codes';
let extractionFields = new Set(['Brand']);
const NUMBER_FIELDS = ['Price', 'ImageCount', 'RatingSourceValue', 'ReviewCount'];

function copyOutput() {
    const outputElement = document.getElementById('output');
    const preBlock = outputElement.querySelector('pre');
    const textToCopy = preBlock ? preBlock.innerText : outputElement.innerText;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('btnCopy');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ ¡Copiado!';
        btn.style.background = 'var(--success)';
        setTimeout(() => { btn.innerHTML = originalText; btn.style.background = 'var(--accent)'; }, 2000);
    });
}

function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    const boxA = document.getElementById('boxA');
    const boxB = document.getElementById('boxB');
    const qaPanel = document.getElementById('qaConfigPanel');
    const compPanel = document.getElementById('compConfigPanel');
    const inputContainer = document.getElementById('inputContainer');
    const labelA = document.getElementById('labelA');
    const labelB = document.getElementById('labelB');
    const btnCopy = document.getElementById('btnCopy');

    // ESTADO BASE (Todo visible)
    boxB.style.display = 'flex';
    qaPanel.style.display = 'none';
    compPanel.style.display = 'none';
    inputContainer.style.gridTemplateColumns = '1fr 1fr';
    document.getElementById('dynamicTools').style.display = 'none';
    btnCopy.style.display = 'none';

    if (tab === 'codes') {
        labelA.innerText = "Input A (Config/Código JS Antiguo)";
        labelB.innerText = "Input B (Config/Código JS Nuevo)";
    } 
    else if (tab === 'results_comp') {
        labelA.innerText = "Input A (Crawler / Datos Anteriores)";
        labelB.innerText = "Input B (Updater / Datos Nuevos)";
        // AQUÍ ESTABA EL ERROR: Ahora Input B SÍ se muestra junto con los ajustes
        boxB.style.display = 'flex'; 
        compPanel.style.display = 'block';
        inputContainer.style.gridTemplateColumns = '1fr 1fr 300px'; // 3 Columnas para que quepa todo
    } 
    else if (tab === 'dupes') {
        labelA.innerText = "Input A (JSON a buscar duplicados)";
        boxB.style.display = 'none';
        inputContainer.style.gridTemplateColumns = '1fr';
    } 
    else if (tab === 'qa') {
        labelA.innerText = "Input A (Productos a Validar)";
        boxB.style.display = 'none';
        qaPanel.style.display = 'block';
        inputContainer.style.gridTemplateColumns = '1.5fr 1fr';
    } 
    else if (tab === 'extra') {
        labelA.innerText = "Input A (JSON para Extraer URLs)";
        boxB.style.display = 'none';
        inputContainer.style.gridTemplateColumns = '1fr';
        document.getElementById('dynamicTools').style.display = 'flex';
    }

    autoDetectFields();
}

function autoDetectFields() {
    try {
        const rawA = document.getElementById('jsonA').value.trim();
        if(!rawA) return;
        
        let data;
        try { data = JSON.parse(rawA); } catch(e) { return; } 
        
        const item = Array.isArray(data) ? data[0] : data;
        const keys = Object.keys(item);

        if (currentTab === 'qa') {
            const container = document.getElementById('qaDynamicDupes');
            container.innerHTML = keys.map(k => `
                <label class="check-label"><input type="checkbox" value="${k}" ${['ProductId', 'ProductName', 'ProductUrl'].includes(k) ? 'checked' : ''}> ${k}</label>
            `).join('');
        }
        
        if (currentTab === 'results_comp') {
            const container = document.getElementById('compDynamicFields');
            container.innerHTML = keys.map(k => `
                <label class="check-label"><input type="checkbox" value="${k}" checked> ${k}</label>
            `).join('');
        }

        if (currentTab === 'extra') {
            const tools = document.getElementById('dynamicTools');
            tools.innerHTML = '<span style="color:#8b949e; font-size:12px; margin-right:10px;">Incluir en UserData:</span>';
            keys.forEach(k => {
                const btn = document.createElement('button');
                btn.innerText = k;
                btn.className = `btn-chip ${extractionFields.has(k) ? 'active' : ''}`;
                btn.onclick = () => { btn.classList.toggle('active'); extractionFields.has(k) ? extractionFields.delete(k) : extractionFields.add(k); };
                tools.appendChild(btn);
            });
        }
    } catch(e) {}
}

function process() {
    const out = document.getElementById('output');
    out.innerHTML = "Procesando...";
    document.getElementById('btnCopy').style.display = 'none';

    const rawA = document.getElementById('jsonA').value.trim();
    const rawB = document.getElementById('jsonB').value.trim();

    if (!rawA) {
        out.innerHTML = `<span class="err">❌ ERROR: El Input A está vacío.</span>`;
        return;
    }

    // MAGIA PARA CÓDIGO JS CRUDO
    if (currentTab === 'codes') {
        try {
            const dataA = JSON.parse(rawA);
            const dataB = JSON.parse(rawB);
            compareCodesJSON(dataA, dataB);
        } catch(e) {
            // Falla parseo? Entonces es código JS y comparamos líneas
            compareCodesText(rawA, rawB);
        }
        document.getElementById('btnCopy').style.display = 'block';
        return;
    }

    try {
        const dataA = JSON.parse(rawA);

        switch(currentTab) {
            case 'results_comp': compareResults(dataA, JSON.parse(rawB)); break;
            case 'dupes': findDuplicates(dataA); break;
            case 'qa': runDynamicQA(dataA); break;
            case 'extra': runExtraction(dataA); break;
        }
        document.getElementById('btnCopy').style.display = 'block';
    } catch(e) {
        out.innerHTML = `<span class="err">❌ ERROR: Formato JSON inválido. (${e.message})</span>`;
    }
}

// ----------------------------------------------------
// COMPARADOR 1A: JSON PROFUNDO (CON FORMATO BONITO ARREGLADO)
// ----------------------------------------------------
function compareCodesJSON(a, b) {
    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    
    function deepCompare(obj1, obj2, path = "") {
        let diffHtml = "";
        const keys1 = obj1 ? Object.keys(obj1) : [];
        const keys2 = obj2 ? Object.keys(obj2) : [];
        const allKeys = new Set([...keys1, ...keys2]);

        allKeys.forEach(k => {
            const isArr = Array.isArray(obj1) || Array.isArray(obj2);
            const currentPath = path ? (isArr ? `${path}[${k}]` : `${path}.${k}`) : k;
            const v1 = obj1 ? obj1[k] : undefined;
            const v2 = obj2 ? obj2[k] : undefined;

            if (JSON.stringify(v1) === JSON.stringify(v2)) return;

            if (typeof v1 === 'object' && v1 !== null && typeof v2 === 'object' && v2 !== null) {
                diffHtml += deepCompare(v1, v2, currentPath);
            } else if (v1 === undefined) {
                diffHtml += `<li class="diff-item"><b style="color:var(--accent)">${currentPath}:</b> <br><div class="new" style="white-space:pre-wrap;">[+] NUEVO:\n${JSON.stringify(v2, null, 2)}</div></li>`;
            } else if (v2 === undefined) {
                diffHtml += `<li class="diff-item"><b style="color:var(--accent)">${currentPath}:</b> <br><div class="old" style="white-space:pre-wrap;">[-] ELIMINADO:\n${JSON.stringify(v1, null, 2)}</div></li>`;
            } else {
                diffHtml += `<li class="diff-item"><b style="color:var(--accent)">${currentPath}:</b> <br><div class="old" style="white-space:pre-wrap;">${JSON.stringify(v1, null, 2)}</div> ➡ <div class="new" style="white-space:pre-wrap;">${JSON.stringify(v2, null, 2)}</div></li>`;
            }
        });
        return diffHtml;
    }

    const differences = deepCompare(a, b);
    document.getElementById('output').innerHTML = differences ? html + differences + '</ul>' : '<h3 style="color:var(--success)">✅ Configuraciones idénticas.</h3>';
}

// ----------------------------------------------------
// COMPARADOR 1B: TEXTO/CÓDIGO LÍNEA A LÍNEA (JS CRUDO)
// ----------------------------------------------------
function compareCodesText(rawA, rawB) {
    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    const linesA = rawA.split('\n');
    const linesB = rawB.split('\n');
    const max = Math.max(linesA.length, linesB.length);
    let diffs = 0;

    for (let i = 0; i < max; i++) {
        const lA = linesA[i] !== undefined ? linesA[i].replace(/\r/g, '') : null;
        const lB = linesB[i] !== undefined ? linesB[i].replace(/\r/g, '') : null;

        if (lA !== lB) {
            diffs++;
            html += `<li class="diff-item" style="font-family:monospace; font-size:12px;">
                <b style="color:var(--warn)">Línea ${i + 1}:</b> <br>
                ${lA !== null ? `<div class="old" style="white-space:pre-wrap; word-break:break-all;">[-] ${lA || '(Línea vacía)'}</div>` : ''}
                ${lB !== null ? `<div class="new" style="white-space:pre-wrap; word-break:break-all;">[+] ${lB || '(Línea vacía)'}</div>` : ''}
            </li>`;
        }
    }
    
    const summary = `<div class="summary-json">INFO  Análisis de Código JS detectado.\nINFO  Se encontraron ${diffs} líneas modificadas.</div>`;
    document.getElementById('output').innerHTML = diffs > 0 ? summary + html + '</ul>' : '<h3 style="color:var(--success)">✅ El código es exactamente idéntico.</h3>';
}

// ----------------------------------------------------
// COMPARADOR DE RESULTADOS
// ----------------------------------------------------
function compareResults(listA, listB) {
    const arrA = Array.isArray(listA) ? listA : [listA];
    const arrB = Array.isArray(listB) ? listB : [listB];
    
    const compMode = document.getElementById('compMode').value;
    const checkedFields = Array.from(document.querySelectorAll('#compDynamicFields input:checked')).map(cb => cb.value);

    let passesObj = {};
    let failsObj = {};
    checkedFields.forEach(k => { passesObj[k] = 0; failsObj[k] = 0; });

    let html = '';
    const mapB_byID = new Map();
    const mapB_byName = new Map();
    
    arrB.forEach(item => {
        if(item.ProductId) mapB_byID.set(String(item.ProductId).trim(), item);
        if(item.ProductName) mapB_byName.set(String(item.ProductName).trim(), item);
    });

    arrA.forEach((itemA) => {
        let rawId = itemA.ProductId ? String(itemA.ProductId).trim() : null;
        let itemB = mapB_byID.get(rawId);

        if (!itemB && itemA.ProductName && mapB_byName.has(String(itemA.ProductName).trim())) {
            itemB = mapB_byName.get(String(itemA.ProductName).trim());
            html += `<div class="warn">⚠ [ID MODIFICADO] Producto: ${itemA.ProductName}. <br>Crawler ID: ${rawId} ➡ Updater ID: ${itemB.ProductId}</div>`;
        }

        if (!itemB) {
            html += `<div class="err">❌ [FALTANTE] El ID ${rawId} está en Crawler pero NO en la Comparación.</div>`;
            checkedFields.forEach(k => failsObj[k]++);
        } else {
            checkedFields.forEach(key => {
                let valA = itemA[key];
                let valB = itemB[key];

                if (compMode === 'updater' && valB === undefined) {
                    return; 
                }
                
                let sA = typeof valA === 'object' && valA !== null ? JSON.stringify(valA) : String(valA || "").trim();
                let sB = typeof valB === 'object' && valB !== null ? JSON.stringify(valB) : String(valB || "").trim();

                if (sA !== sB) {
                    failsObj[key]++;
                    html += `<div class="warn" style="margin-left: 15px;">↳ Campo <b>${key}</b>: <span class="old">${sA}</span> ➡ <span class="new">${sB}</span></div>`;
                } else {
                    passesObj[key]++;
                }
            });
        }
    });

    if (compMode === 'updater') {
        Object.keys(failsObj).forEach(k => { if (failsObj[k] === 0 && passesObj[k] === 0) { delete failsObj[k]; delete passesObj[k]; } });
    }

    const summaryJSON = { Failures: failsObj, Passes: passesObj };
    const summaryHtml = `<pre class="summary-json">INFO  Comparación Crawler vs ${compMode === 'updater' ? 'Updater' : 'Crawler'}:\nINFO  ${JSON.stringify(summaryJSON, null, 2)}</pre>`;
    
    document.getElementById('output').innerHTML = summaryHtml + (html || "<h3 style='color:var(--success)'>✅ Todos los campos evaluados coinciden exactamente.</h3>");
}

function findDuplicates(data) {
    const arr = Array.isArray(data) ? data : [data];
    const seen = { ProductId: new Set(), ProductUrl: new Set(), ProductName: new Set() };
    let html = '';

    arr.forEach(i => {
        ['ProductId', 'ProductUrl', 'ProductName'].forEach(f => {
            if (i[f]) {
                const valStr = String(i[f]).trim();
                if (seen[f].has(valStr)) html += `<div class="err">❌ ${f} REPETIDO: <b>${valStr}</b></div>`;
                seen[f].add(valStr);
            }
        });
    });
    document.getElementById('output').innerHTML = html || "<h3 style='color:var(--success)'>✅ No hay duplicados.</h3>";
}

function runDynamicQA(data) {
    const arr = Array.isArray(data) ? data : [data];
    let htmlDetails = '';
    
    const expRobot = document.getElementById('qaRobotType').value;
    const expManu = document.getElementById('qaManufacturer').value.trim();
    const expUrl = document.getElementById('qaUrl').value.trim();
    const expImg = document.getElementById('qaImage').value.trim();
    const dupCheckboxes = Array.from(document.querySelectorAll('#qaDynamicDupes input:checked'));
    const fieldsToDupCheck = dupCheckboxes.map(cb => cb.value);

    let stats = { Fields: {}, Codes: { CTINCode:0, EANCode:0, UPCCode:0, GTINCode:0, A2CCode:0, ASINCode:0, OTHERCode:0 }, Other: {} };
    
    if(arr.length > 0) {
        Object.keys(arr[0]).forEach(k => {
            if(k !== 'Codes' && k !== 'Other') stats.Fields[k] = { Name: k, Pass: 0, Fail: 0, Warnings: 0, Duplicates: 0 };
        });
    }

    let seenForDupes = {};
    fieldsToDupCheck.forEach(f => seenForDupes[f] = new Set());

    arr.forEach((item, idx) => {
        let itemErrors = [];
        const id = item.ProductId !== undefined ? String(item.ProductId).trim() : `POS_${idx}`;

        for (let key in item) {
            let val = item[key];
            if (val === null || val === undefined) continue;
            
            if (key !== 'Codes' && key !== 'Other' && !stats.Fields[key]) stats.Fields[key] = { Name: key, Pass: 0, Fail: 0, Warnings: 0, Duplicates: 0 };

            let fieldFailed = false;
            let fieldWarn = false;

            if (key === 'Codes') {
                let totalC = 0;
                for (let c in val) {
                    if (val[c] && val[c] !== 0 && val[c] !== "0") {
                        totalC++;
                        if(stats.Codes[c] !== undefined) stats.Codes[c]++;
                        else stats.Codes.OTHERCode++;
                    }
                }
                if (expRobot === 'Crawler' && totalC === 0) itemErrors.push(`[Codes] Crawler sin códigos.`);
            } 
            else if (key === 'Other') { for(let o in val) stats.Other[o] = (stats.Other[o] || 0) + 1; } 
            else if (NUMBER_FIELDS.includes(key)) {
                if (isNaN(parseFloat(val)) || !isFinite(val)) { itemErrors.push(`[${key}] Debe ser número.`); fieldFailed = true; }
            } else {
                if (typeof val !== 'string' && typeof val !== 'boolean') { itemErrors.push(`[${key}] Debe ser texto.`); fieldFailed = true; }
            }

            if (key === 'Manufacturer' && expManu && val && !(new RegExp(expManu, 'i')).test(String(val))) { itemErrors.push(`[Fabricante] Esperado: ${expManu}`); fieldFailed = true; }
            if (key === 'ProductUrl' && expUrl && val && !String(val).includes(expUrl)) { itemErrors.push(`[URL] Base incorrecta.`); fieldFailed = true; }
            if (key === 'ImageUri' && expImg && val && !String(val).includes(expImg)) { itemErrors.push(`[Imagen] Base incorrecta.`); fieldFailed = true; }

            if (expRobot === 'Crawler' && (key === 'RatingSourceValue' || key === 'ReviewCount') && val) { itemErrors.push(`[Crawler] No debe tener Ratings.`); fieldWarn = true; }
            if (expRobot === 'Updater' && (item.Price === undefined && item.Stock === undefined)) { itemErrors.push(`[Updater] Faltan campos actualizables.`); fieldWarn = true; }

            if (key === 'ProductName' && typeof val === 'string') {
                if (/\s\s+/.test(val)) { itemErrors.push(`[Nombre] Espacios dobles.`); fieldWarn = true; }
                if (/&amp|&#xE9|&#xE2|&#xEE|&#xE0|&#x2019|&#xB0/.test(val)) { itemErrors.push(`[Nombre] Entidades HTML.`); fieldWarn = true; }
            }

            if (fieldsToDupCheck.includes(key) && val) {
                const valStr = String(val).trim();
                if (seenForDupes[key].has(valStr)) {
                    itemErrors.push(`[${key}] Duplicado interno: ${valStr}`);
                    stats.Fields[key].Duplicates++;
                    fieldFailed = true;
                } else seenForDupes[key].add(valStr);
            }

            if (stats.Fields[key]) {
                if (fieldFailed) stats.Fields[key].Fail++;
                else if (fieldWarn) stats.Fields[key].Warnings++;
                else stats.Fields[key].Pass++;
            }
        }

        if (itemErrors.length > 0) {
            htmlDetails += `<div class="qa-item"><b style="color:var(--err)">ID: ${id}</b><ul style="color:var(--err); margin:5px 0;">${itemErrors.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
        }
    });

    const summaryObject = { Fields: Object.values(stats.Fields), Codes: stats.Codes, Other: stats.Other };
    const topHtml = `<pre class="summary-json">INFO  Summary results:\nINFO  ${JSON.stringify(summaryObject, null, 2)}\nINFO  QA Validation Complete</pre>`;
    document.getElementById('output').innerHTML = topHtml + htmlDetails;
}

function runExtraction(data) {
    const arr = Array.isArray(data) ? data : [data];
    const result = arr.map(i => {
        let uData = {};
        extractionFields.forEach(f => { if(i[f]) uData[f] = i[f]; });
        return { url: i.ProductUrl || "N/A", userData: uData, method: "GET" };
    });
    document.getElementById('output').innerHTML = `<pre class="summary-json">${JSON.stringify({startUrls: result}, null, 4)}</pre>`;
}

function clearAll() {
    document.getElementById('jsonA').value = '';
    document.getElementById('jsonB').value = '';
    document.getElementById('output').innerHTML = 'Consola limpia...';
    document.getElementById('btnCopy').style.display = 'none';
}

setTab('codes');