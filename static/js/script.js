let currentTab = 'codes';
let extractionFields = new Set(['Brand']);
const NUMBER_FIELDS = ['Price', 'ImageCount', 'RatingSourceValue', 'ReviewCount'];
// ====================================================
// SISTEMA DE NOTIFICACIONES PUSH (TOASTS)
// ====================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const textSpan = document.createElement('span');
    textSpan.innerText = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '✖';
    closeBtn.onclick = () => removeToast(toast);

    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    let timeLeft = 10000; // 10 segundos
    let intervalId;

    const startTimer = () => {
        intervalId = setInterval(() => {
            timeLeft -= 100;
            if (timeLeft <= 0) {
                clearInterval(intervalId);
                removeToast(toast);
            }
        }, 100);
    };

    const stopTimer = () => clearInterval(intervalId);

    // Pausar si el mouse está encima para poder copiar el texto
    toast.addEventListener('mouseenter', stopTimer);
    toast.addEventListener('mouseleave', startTimer);

    startTimer();
}

function removeToast(toast) {
    toast.classList.add('fadeOut');
    setTimeout(() => toast.remove(), 400); // Esperar animación CSS
}
// ====================================================
// ALGORITMO DE RESALTADO INTELIGENTE (SIN TACHADOS)
// ====================================================
function getDiffHtml(str1, str2) {
    const s1 = String(str1 || "");
    const s2 = String(str2 || "");
    if (s1 === s2) return { oldH: s1, newH: s2 };
    
    let start = 0;
    while(start < s1.length && start < s2.length && s1[start] === s2[start]) start++;
    
    let end1 = s1.length - 1;
    let end2 = s2.length - 1;
    while(end1 >= start && end2 >= start && s1[end1] === s2[end2]) { end1--; end2--; }
    
    const pre = s1.substring(0, start);
    const post = s1.substring(end1 + 1);
    
    const mid1 = s1.substring(start, end1 + 1);
    const mid2 = s2.substring(start, end2 + 1);
    
    const mark1 = mid1 ? `<span style="background:rgba(248,81,73,0.25); color:#ff7b72; padding:0 3px; border-radius:3px;">${mid1}</span>` : "";
    const mark2 = mid2 ? `<span style="background:rgba(63,185,80,0.25); color:#7ee787; padding:0 3px; border-radius:3px;">${mid2}</span>` : "";
    
    return { oldH: pre + mark1 + post, newH: pre + mark2 + post };
}

// ====================================================
// UTILIDADES GENERALES
// ====================================================
function toggleSidebar() {
    document.getElementById('mainSidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}

function copyOutput() {
    const outputElement = document.getElementById('output');
    const textToCopy = outputElement.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('btnCopy');
        const originalText = btn.innerHTML;
        btn.innerHTML = '¡Copiado!';
        btn.style.background = 'var(--success)';
        setTimeout(() => { 
            btn.innerHTML = originalText; 
            btn.style.background = 'var(--accent)'; 
        }, 2000);
    });
}

function copyAiDocs() {
    const text = document.getElementById('aiGeneratedDocs').value;
    navigator.clipboard.writeText(text).then(() => showToast("¡Documentación Markdown Copiada!"));
}

function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    if (typeof event !== 'undefined' && event && event.target && event.target.classList) {
        event.target.classList.add('active');
    } else {
        const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(tab));
        if(activeBtn) activeBtn.classList.add('active');
    }

    document.getElementById('mainSidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');

    // Ocultar todos los paneles primero
    const panels = ['boxA', 'boxB', 'qaConfigPanel', 'compConfigPanel', 'extraConfigPanel', 'apiTesterPanel', 'aiTrainPanel'];
    panels.forEach(id => document.getElementById(id).style.display = 'none');
    
    // Restaurar vistas por defecto
    document.getElementById('mainToolbar').style.display = 'flex'; 
    document.getElementById('mainOutputPanel').style.display = 'flex';
    document.getElementById('inputContainer').style.gridTemplateColumns = '1fr 1fr';
    document.getElementById('btnCopy').style.display = 'none';

    // Mostrar paneles según la pestaña
    if (tab === 'codes') { 
        document.getElementById('boxA').style.display = 'flex'; 
        document.getElementById('boxB').style.display = 'flex'; 
        document.getElementById('aiTrainPanel').style.display = 'block'; // Panel IA visible aquí
        document.getElementById('labelA').innerText = "Input A (Código Antiguo)"; 
        document.getElementById('labelB').innerText = "Input B (Código Nuevo)"; 
    } 
    else if (tab === 'results_comp') { 
        document.getElementById('boxA').style.display = 'flex'; 
        document.getElementById('boxB').style.display = 'flex'; 
        document.getElementById('compConfigPanel').style.display = 'flex'; 
        document.getElementById('inputContainer').style.gridTemplateColumns = '1fr 1fr 300px'; 
        document.getElementById('labelA').innerText = "A (Crawler/Viejos)"; 
        document.getElementById('labelB').innerText = "B (Updater/Nuevos)"; 
    } 
    else if (tab === 'dupes') { 
        document.getElementById('boxA').style.display = 'flex'; 
        document.getElementById('labelA').innerText = "JSON Buscar Duplicados"; 
        document.getElementById('inputContainer').style.gridTemplateColumns = '1fr'; 
    } 
    else if (tab === 'qa') { 
        document.getElementById('boxA').style.display = 'flex'; 
        document.getElementById('qaConfigPanel').style.display = 'flex'; 
        document.getElementById('labelA').innerText = "Productos a Validar QA"; 
        document.getElementById('inputContainer').style.gridTemplateColumns = '1.5fr 1fr'; 
        toggleQaCrawlerFields(); 
    } 
    else if (tab === 'extra') { 
        document.getElementById('boxA').style.display = 'flex'; 
        document.getElementById('extraConfigPanel').style.display = 'flex'; 
        document.getElementById('labelA').innerText = "JSON Extraer URLs"; 
        document.getElementById('inputContainer').style.gridTemplateColumns = '1.5fr 1fr'; 
    }
    else if (tab === 'api') { 
        document.getElementById('apiTesterPanel').style.display = 'block'; 
        document.getElementById('mainToolbar').style.display = 'none'; 
        document.getElementById('mainOutputPanel').style.display = 'none'; 
    }
    else if (tab === 'ai_train') { 
        document.getElementById('aiTrainPanel').style.display = 'block'; 
        document.getElementById('mainToolbar').style.display = 'none'; 
        document.getElementById('mainOutputPanel').style.display = 'none'; 
    }
    
    autoDetectFields();
}

function autoDetectFields() {
    if(currentTab === 'api' || currentTab === 'ai_train') return;
    try {
        const rawA = document.getElementById('jsonA').value.trim();
        if(!rawA) return;
        let data; 
        try { data = JSON.parse(rawA); } catch(e) { return; } 
        
        const arr = Array.isArray(data) ? data : [data];
        let item = arr.find(i => i.Handled !== true && i.handled !== true) || arr[0];
        if (!item) return;

        const keys = Object.keys(item).filter(k => k !== 'Handled' && k !== 'handled' && k !== 'Message');

        if (currentTab === 'qa') {
            document.getElementById('qaDynamicDupes').innerHTML = keys.map(k => `
                <label class="check-label"><input type="checkbox" value="${k}" ${['ProductId', 'ProductName', 'ProductUrl'].includes(k) ? 'checked' : ''}> ${k}</label>
            `).join('');
        }
        if (currentTab === 'results_comp') {
            document.getElementById('compDynamicFields').innerHTML = keys.map(k => `
                <label class="check-label"><input type="checkbox" value="${k}" checked> ${k}</label>
            `).join('');
        }
        if (currentTab === 'extra') {
            const tools = document.getElementById('dynamicTools'); 
            tools.innerHTML = '';
            keys.forEach(k => {
                const btn = document.createElement('button'); 
                btn.innerText = k; 
                btn.className = `btn-chip ${extractionFields.has(k) ? 'active' : ''}`;
                btn.onclick = () => { 
                    btn.classList.toggle('active'); 
                    extractionFields.has(k) ? extractionFields.delete(k) : extractionFields.add(k); 
                };
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
        out.innerHTML = `<span style="color:var(--err)">[ERROR] El Input A está vacío.</span>`; 
        return; 
    }

    if (currentTab === 'codes') {
        try { 
            compareCodesJSON(JSON.parse(rawA), JSON.parse(rawB)); 
        } catch(e) { 
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
        out.innerHTML = `<span style="color:var(--err)">[ERROR] Formato JSON inválido.</span>`; 
    }
}

// ====================================================
// COMPARAR CÓDIGOS (CON TARJETAS Y RESALTADO EXACTO)
// ====================================================
function compareCodesJSON(a, b) {
    let htmlDetails = ''; 
    let diffCount = 0;
    
    function deepCompare(obj1, obj2, path = "") {
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
                deepCompare(v1, v2, currentPath);
            } else {
                diffCount++;
                let content = '';
                if (v1 === undefined) {
                    content = `<span style="color:var(--success)">[+] NUEVO: ${JSON.stringify(v2)}</span>`;
                } else if (v2 === undefined) {
                    content = `<span style="color:var(--err)">[-] ELIMINADO: ${JSON.stringify(v1)}</span>`;
                } else {
                    const diffs = getDiffHtml(JSON.stringify(v1), JSON.stringify(v2));
                    content = `<span style="color:var(--err)">${diffs.oldH}</span> ➡ <span style="color:var(--success)">${diffs.newH}</span>`;
                }
                
                htmlDetails += `
                <div class="report-card warn">
                    <div class="report-card-header">
                        <strong style="color:var(--text); font-size:14px;">Clave JSON: <span style="color:var(--accent)">${currentPath}</span></strong>
                    </div>
                    <div style="margin:5px 0; font-family:monospace; font-size:13px; word-break:break-all;">${content}</div>
                </div>`;
            }
        });
    }
    
    deepCompare(a, b);
    document.getElementById('output').innerHTML = diffCount > 0 ? htmlDetails : '<h3 style="color:var(--success)">✅ El JSON es idéntico.</h3>';
}

function compareCodesText(rawA, rawB) {
    let htmlDetails = '';
    const linesA = rawA.split('\n'); 
    const linesB = rawB.split('\n');
    const max = Math.max(linesA.length, linesB.length);
    let diffCount = 0;

    for (let i = 0; i < max; i++) {
        const lA = linesA[i] !== undefined ? linesA[i].replace(/\r/g, '') : null;
        const lB = linesB[i] !== undefined ? linesB[i].replace(/\r/g, '') : null;

        if (lA !== lB) {
            diffCount++;
            let content = '';
            if (lA === null) {
                content = `<div style="color:var(--success)">[+] ${lB}</div>`;
            } else if (lB === null) {
                content = `<div style="color:var(--err)">[-] ${lA}</div>`;
            } else {
                const diffs = getDiffHtml(lA, lB);
                content = `<div style="color:var(--err); margin-bottom:4px;">${diffs.oldH}</div><div style="color:var(--success)">${diffs.newH}</div>`;
            }

            htmlDetails += `
            <div class="report-card warn">
                <div class="report-card-header" style="padding-bottom:4px; margin-bottom:4px; border-bottom:none;">
                    <strong style="color:var(--accent); font-size:12px;">Línea ${i + 1}</strong>
                </div>
                <div style="font-family:monospace; font-size:13px; word-break:break-all;">${content}</div>
            </div>`;
        }
    }
    const topHtml = `<h4 class="section-title">🔍 Se encontraron ${diffCount} líneas modificadas</h4>`;
    document.getElementById('output').innerHTML = diffCount > 0 ? topHtml + htmlDetails : '<h3 style="color:var(--success)">✅ El código es exactamente idéntico.</h3>';
}

// ====================================================
// COMPARADOR DE RESULTADOS
// ====================================================
function compareResults(listA, listB) {
    const arrA = Array.isArray(listA) ? listA : [listA];
    const arrB = Array.isArray(listB) ? listB : [listB];
    const compMode = document.getElementById('compMode').value;
    const checkedFields = Array.from(document.querySelectorAll('#compDynamicFields input:checked')).map(cb => cb.value);

    let passesObj = {}; 
    let failsObj = {};
    checkedFields.forEach(k => { passesObj[k] = 0; failsObj[k] = 0; });

    let htmlDetails = '';
    const mapB_byID = new Map();
    
    arrB.forEach(item => { 
        if(item.Handled === true || item.handled === true) return; 
        if(item.ProductId) mapB_byID.set(String(item.ProductId).trim(), item); 
    });

    let handledCount = 0; 
    let totalErrors = 0;
    
    arrA.forEach((itemA, idx) => {
        if (itemA.Handled === true || itemA.handled === true) { handledCount++; return; } 

        const displayId = itemA.ProductId ? String(itemA.ProductId).trim() : `POS_${idx}`;
        let itemErrors = [];
        let rawId = itemA.ProductId ? String(itemA.ProductId).trim() : null;
        let itemB = mapB_byID.get(rawId);

        if (!itemB) {
            itemErrors.push(`[FALTANTE] No encontrado en la base de comparación.`);
            checkedFields.forEach(k => failsObj[k]++);
        } else {
            checkedFields.forEach(key => {
                let valA = itemA[key]; let valB = itemB[key];
                if (compMode === 'updater' && valB === undefined) return; 
                let sA = typeof valA === 'object' && valA !== null ? JSON.stringify(valA) : String(valA || "").trim();
                let sB = typeof valB === 'object' && valB !== null ? JSON.stringify(valB) : String(valB || "").trim();

                if (sA !== sB) {
                    failsObj[key]++;
                    const diffs = getDiffHtml(sA, sB);
                    itemErrors.push(`[${key}] <span style="color:var(--err);">${diffs.oldH}</span> ➡ <span style="color:var(--success);">${diffs.newH}</span>`);
                } else {
                    passesObj[key]++;
                }
            });
        }

        if (itemErrors.length > 0) {
            totalErrors++;
            htmlDetails += `
            <div class="report-card err">
                <div class="report-card-header">
                    <strong style="color:var(--text); font-size:14px;">ProductId: <span style="color:var(--accent)">${displayId}</span></strong>
                    <span class="badge badge-err">${itemErrors.length} Diferencias</span>
                </div>
                <ul style="margin:5px 0; padding-left:0; font-family:monospace; color:#8b949e; font-size:13px; line-height:1.6; list-style-type: none;">
                    ${itemErrors.map(e => `<li>▪ ${e}</li>`).join('')}
                </ul>
            </div>`;
        }
    });

    if (compMode === 'updater') Object.keys(failsObj).forEach(k => { if (failsObj[k] === 0 && passesObj[k] === 0) { delete failsObj[k]; delete passesObj[k]; } });

    const validItemsCount = arrA.length - handledCount;
    const perfectProducts = validItemsCount - totalErrors;

    let compTableRows = '';
    Object.keys(passesObj).forEach(key => {
        let p = passesObj[key]; let f = failsObj[key];
        compTableRows += `<tr><td><b style="color:var(--accent)">${key}</b></td><td class="${p > 0 ? 't-pass' : 't-zero'}">${p}</td><td class="${f > 0 ? 't-fail' : 't-zero'}">${f}</td></tr>`;
    });

    const detailedTableHtml = `
    <div class="summary-table-container">
        <h4 class="section-title">📊 Resumen por Campo</h4>
        <table class="summary-table">
            <thead><tr><th>Campo Analizado</th><th>✅ Coinciden</th><th>❌ Fallan</th></tr></thead>
            <tbody>${compTableRows}</tbody>
        </table>
    </div>`;
    
    const topHtml = `
    <div class="stats-grid">
        <div class="stat-box"><h3>${arrA.length}</h3><span>Total Input A</span></div>
        <div class="stat-box" style="border-color:var(--warn)"><h3>${handledCount}</h3><span style="color:var(--warn)">Handled Ignorados</span></div>
        <div class="stat-box" style="border-color:var(--success)"><h3>${perfectProducts}</h3><span style="color:var(--success)">Productos Perfectos</span></div>
        <div class="stat-box" style="border-color:var(--err)"><h3>${totalErrors}</h3><span style="color:var(--err)">Con Fallos</span></div>
    </div>`;
    
    document.getElementById('output').innerHTML = topHtml + detailedTableHtml + (htmlDetails || `<div style="text-align:center; padding: 40px;"><h3 style="color:var(--success); margin:0;">Comparación Perfecta</h3><p style="color:#8b949e;">Todos los campos evaluados coinciden exactamente.</p></div>`);
}

// ====================================================
// VALIDADOR QA (FILTRO EXCLUDE MEJORADO)
// ====================================================
function toggleQaCrawlerFields() { 
    document.getElementById('qaExcludeGroup').style.display = document.getElementById('qaRobotType').value === 'Crawler' ? 'block' : 'none'; 
}

function runDynamicQA(data) {
    const arr = Array.isArray(data) ? data : [data];
    let htmlDetails = '';
    const expRobot = document.getElementById('qaRobotType').value;
    const expManu = document.getElementById('qaManufacturer').value.trim();
    const expUrl = document.getElementById('qaUrl').value.trim();
    const expImg = document.getElementById('qaImage').value.trim();
    
    const rawExclude = document.getElementById('qaExclude').value.trim();
    const excludeWords = rawExclude ? rawExclude.split(',').map(w => w.trim().toLowerCase()).filter(w => w) : [];
    const dupCheckboxes = Array.from(document.querySelectorAll('#qaDynamicDupes input:checked')).map(cb => cb.value);

    let handledCount = 0; let validItems = [];
    arr.forEach(i => { if (i.Handled === true || i.handled === true) handledCount++; else validItems.push(i); });

    let stats = { Fields: {}, Codes: { CTINCode:0, EANCode:0, UPCCode:0, GTINCode:0, A2CCode:0, ASINCode:0, OTHERCode:0 }, Other: {} };
    if(validItems.length > 0) Object.keys(validItems[0]).forEach(k => { if(k !== 'Codes' && k !== 'Other') stats.Fields[k] = { Name: k, Pass: 0, Fail: 0, Warnings: 0, Excluidos: 0, Duplicates: 0 }; });

    let seenForDupes = {}; dupCheckboxes.forEach(f => seenForDupes[f] = new Set());
    let totalErrors = 0;

    validItems.forEach((item, idx) => {
        let itemErrors = [];
        const id = item.ProductId !== undefined ? String(item.ProductId).trim() : `POS_${idx}`;
        let itemHasCriticalError = false;

        for (let key in item) {
            let val = item[key];
            if (val === null || val === undefined) continue;
            if (key !== 'Codes' && key !== 'Other' && !stats.Fields[key]) stats.Fields[key] = { Name: key, Pass: 0, Fail: 0, Warnings: 0, Excluidos: 0, Duplicates: 0 };

            let fieldFailed = false; let fieldWarn = false; let fieldExcluded = false;

            if (expRobot === 'Crawler' && excludeWords.length > 0 && typeof val === 'string' && (key === 'ProductUrl' || key === 'ProductName')) {
                const lowerVal = val.toLowerCase();
                const foundWord = excludeWords.find(w => lowerVal.includes(w));
                if (foundWord) {
                    itemErrors.push(`[Excluido] ${key} contiene palabra prohibida: '${foundWord}'`);
                    fieldExcluded = true; fieldFailed = true;
                }
            }

            if (key === 'Codes') {
                let totalC = 0; 
                for (let c in val) { if (val[c] && val[c] !== 0 && val[c] !== "0") { totalC++; if(stats.Codes[c] !== undefined) stats.Codes[c]++; else stats.Codes.OTHERCode++; } }
                if (expRobot === 'Crawler' && totalC === 0) { itemErrors.push(`[Codes] Crawler sin códigos.`); itemHasCriticalError = true; }
            } 
            else if (key === 'Other') { 
                for(let o in val) stats.Other[o] = (stats.Other[o] || 0) + 1; 
            } 
            else if (NUMBER_FIELDS.includes(key)) { 
                if (isNaN(parseFloat(val)) || !isFinite(val)) { itemErrors.push(`[${key}] Debe ser número.`); fieldFailed = true; itemHasCriticalError = true; } 
            } 
            else { 
                if (typeof val !== 'string' && typeof val !== 'boolean') { itemErrors.push(`[${key}] Debe ser texto.`); fieldFailed = true; itemHasCriticalError = true; } 
            }

            if (key === 'Manufacturer' && expManu && val && !(new RegExp(expManu, 'i')).test(String(val))) { itemErrors.push(`[Fabricante] Esperado: ${expManu}`); fieldFailed = true; }
            if (key === 'ProductUrl' && expUrl && val && !String(val).includes(expUrl)) { itemErrors.push(`[URL] Base incorrecta.`); fieldFailed = true; itemHasCriticalError = true; }
            if (key === 'ImageUri' && expImg && val && !String(val).includes(expImg)) { itemErrors.push(`[Imagen] Base incorrecta.`); fieldFailed = true; }
            if (expRobot === 'Crawler' && (key === 'RatingSourceValue' || key === 'ReviewCount') && val) { itemErrors.push(`[Crawler] No debe tener Ratings.`); fieldWarn = true; }
            if (expRobot === 'Updater' && (item.Price === undefined && item.Stock === undefined)) { itemErrors.push(`[Updater] Faltan campos actualizables.`); fieldWarn = true; }

            if (dupCheckboxes.includes(key) && val) {
                const valStr = String(val).trim();
                if (seenForDupes[key].has(valStr)) { 
                    itemErrors.push(`[${key}] Duplicado interno: ${valStr}`); 
                    stats.Fields[key].Duplicates++; fieldFailed = true; itemHasCriticalError = true; 
                } 
                else seenForDupes[key].add(valStr);
            }

            if (stats.Fields[key]) {
                if (fieldExcluded) stats.Fields[key].Excluidos++; 
                else if (fieldFailed) stats.Fields[key].Fail++; 
                else if (fieldWarn) stats.Fields[key].Warnings++; 
                else stats.Fields[key].Pass++;
            }
        }
        if (itemErrors.length > 0) {
            totalErrors++;
            const cardClass = itemHasCriticalError ? "err" : "warn";
            const badgeClass = itemHasCriticalError ? "badge-err" : "badge-warn";
            htmlDetails += `
            <div class="report-card ${cardClass}">
                <div class="report-card-header">
                    <strong style="color:var(--text); font-size:14px;">ProductId: <span style="color:var(--accent)">${id}</span></strong>
                    <span class="badge ${badgeClass}">${itemErrors.length} Fallos</span>
                </div>
                <ul style="margin:5px 0; padding-left:0; font-family:monospace; color:var(--err); font-size:13px; line-height: 1.6; list-style-type: none;">
                    ${itemErrors.map(e => `<li>▪ ${e}</li>`).join('')}
                </ul>
            </div>`;
        }
    });

    const perfectProducts = validItems.length - totalErrors;
    let qaTableRows = '';
    Object.values(stats.Fields).forEach(f => {
        qaTableRows += `<tr><td><b style="color:var(--accent)">${f.Name}</b></td><td class="${f.Pass > 0 ? 't-pass' : 't-zero'}">${f.Pass}</td><td class="${f.Fail > 0 ? 't-fail' : 't-zero'}">${f.Fail}</td><td class="${f.Warnings > 0 ? 't-warn' : 't-zero'}">${f.Warnings}</td><td class="${f.Duplicates > 0 ? 't-fail' : 't-zero'}">${f.Duplicates}</td><td class="${f.Excluidos > 0 ? 't-warn' : 't-zero'}">${f.Excluidos}</td></tr>`;
    });

    let codesRows = Object.keys(stats.Codes).map(k => `<span class="code-badge">${k}: <b class="${stats.Codes[k]>0?'t-pass':'t-zero'}">${stats.Codes[k]}</b></span>`).join('');

    const detailedTableHtml = `
    <div class="summary-table-container">
        <h4 class="section-title">📊 Resumen Analítico por Campo</h4>
        <table class="summary-table">
            <thead><tr><th>Campo</th><th>✅ Aprobados</th><th>❌ Fallos</th><th>⚠️ Alertas</th><th>📋 Dups</th><th>🚫 Excluidos</th></tr></thead>
            <tbody>${qaTableRows}</tbody>
        </table>
        <h4 class="section-title" style="margin-top:20px;">🏷️ Resumen Códigos</h4>
        <div>${codesRows}</div>
    </div>`;
    
    const topHtml = `
    <div class="stats-grid">
        <div class="stat-box"><h3>${arr.length}</h3><span>Total Json</span></div>
        <div class="stat-box" style="border-color:var(--warn)"><h3>${handledCount}</h3><span style="color:var(--warn)">Handled Ignorados</span></div>
        <div class="stat-box" style="border-color:var(--success)"><h3>${perfectProducts}</h3><span style="color:var(--success)">Productos Perfectos</span></div>
        <div class="stat-box" style="border-color:var(--err)"><h3>${totalErrors}</h3><span style="color:var(--err)">Con Fallos</span></div>
    </div>`;

    document.getElementById('output').innerHTML = topHtml + detailedTableHtml + (htmlDetails || `<div style="text-align:center; padding: 40px;"><h3 style="color:var(--success); margin:0;">Validación Exitosa</h3><p style="color:#8b949e;">Cero errores encontrados.</p></div>`);
}

// ====================================================
// BUSCAR DUPLICADOS
// ====================================================
function findDuplicates(data) {
    const arr = Array.isArray(data) ? data : [data];
    const seen = { ProductId: new Set(), ProductUrl: new Set(), ProductName: new Set() };
    let html = ''; let hasDupes = false;

    arr.forEach((i, idx) => {
        if (i.Handled === true || i.handled === true) return;
        let itemErrors = []; 
        const displayId = i.ProductId || `POS_${idx}`;
        
        ['ProductId', 'ProductUrl', 'ProductName'].forEach(f => {
            if (i[f]) { 
                const valStr = String(i[f]).trim(); 
                if (seen[f].has(valStr)) itemErrors.push(`<li>▪ <b style="color:var(--accent)">[${f}]</b> REPETIDO: <span style="color:#c9d1d9;">${valStr}</span></li>`); 
                seen[f].add(valStr); 
            }
        });
        
        if (itemErrors.length > 0) {
            hasDupes = true;
            html += `
            <div class="report-card err">
                <div class="report-card-header">
                    <strong style="color:var(--text); font-size:14px;">ProductId: <span style="color:var(--accent)">${displayId}</span></strong>
                    <span class="badge badge-err">REPETIDO</span>
                </div>
                <ul style="margin:5px 0; padding-left:0; font-family:monospace; color:#8b949e; font-size:13px; list-style-type: none;">${itemErrors.join('')}</ul>
            </div>`;
        }
    });
    document.getElementById('output').innerHTML = hasDupes ? html : "<h3 style='color:var(--success)'>El JSON está limpio.</h3>";
}

// ====================================================
// EXTRACTOR STARTURLS
// ====================================================
function runExtraction(data) {
    const arr = Array.isArray(data) ? data : [data];
    let handledCount = 0; 
    let seenUrls = new Set(); 
    let validItems = [];
    
    arr.forEach(i => {
        if (i.Handled === true || i.handled === true) { handledCount++; return; }
        const url = i.ProductUrl || i.Url || i.url;
        if (url) { 
            const cleanUrl = String(url).trim(); 
            if (!seenUrls.has(cleanUrl)) { seenUrls.add(cleanUrl); validItems.push(i); } 
        } 
        else validItems.push(i);
    });

    const totalSinRepetidos = validItems.length;
    
    for (let i = validItems.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [validItems[i], validItems[j]] = [validItems[j], validItems[i]]; 
    }
    
    const limitInput = parseInt(document.getElementById('extLimit').value);
    const limit = document.getElementById('extAll').checked || isNaN(limitInput) || limitInput < 1 ? validItems.length : limitInput;
    const finalItems = validItems.slice(0, limit);

    const result = finalItems.map(i => {
        let uData = {}; 
        extractionFields.forEach(f => { if(i[f] !== undefined) uData[f] = i[f]; });
        return { url: i.ProductUrl || i.Url || i.url || "N/A", userData: uData, method: "GET" };
    });

    const reportHtml = `
    <div class="stats-grid">
        <div class="stat-box"><h3>${arr.length}</h3><span>Total Original</span></div>
        <div class="stat-box" style="border-color:var(--warn)"><h3>${handledCount}</h3><span style="color:var(--warn)">Handled Ignorados</span></div>
        <div class="stat-box" style="border-color:var(--accent)"><h3>${arr.length - handledCount - totalSinRepetidos}</h3><span style="color:var(--accent)">Duplicados Borrados</span></div>
        <div class="stat-box" style="border-color:var(--success)"><h3>${finalItems.length}</h3><span style="color:var(--success)">Extraídos</span></div>
    </div>`;
    document.getElementById('output').innerHTML = reportHtml + `<pre class="summary-json" style="margin-top:0;">${JSON.stringify({"startUrls": result}, null, 4)}</pre>`;
}

// ====================================================
// API TESTER LOGIC
// ====================================================
function switchApiTab(tabId) { 
    document.querySelectorAll('.api-tab-btn').forEach(btn => btn.classList.remove('active')); 
    document.querySelectorAll('.api-tab-content').forEach(content => content.classList.remove('active')); 
    event.target.classList.add('active'); 
    document.getElementById(tabId).classList.add('active'); 
}

function importCurlPrompt() {
    const curl = prompt("Pega tu comando cURL (Copiar como bash):");
    if (!curl) return;

    try {
        const urlMatch = curl.match(/curl\s+(?:-X\s+[A-Z]+\s+)?['"]?([^'"\s]+)['"]?/);
        if (urlMatch) document.getElementById('apiUrl').value = urlMatch[1];

        const methodMatch = curl.match(/-X\s+([A-Z]+)/);
        if (methodMatch) document.getElementById('apiMethod').value = methodMatch[1];
        else document.getElementById('apiMethod').value = 'GET';

        const headerMatches = [...curl.matchAll(/-H\s+['"]([^'"]+)['"]/g)];
        let headersObj = {};
        headerMatches.forEach(m => {
            const parts = m[1].split(':');
            if (parts.length >= 2) headersObj[parts[0].trim()] = parts.slice(1).join(':').trim();
        });
        if (Object.keys(headersObj).length > 0) {
            document.getElementById('apiHeadersInput').value = JSON.stringify(headersObj, null, 2);
        }

        const dataMatch = curl.match(/--data(?:-raw)?\s+['"]([^'"]+)['"]/);
        if (dataMatch) {
            document.getElementById('apiBodyInput').value = dataMatch[1];
            if(!methodMatch) document.getElementById('apiMethod').value = 'POST'; 
        }
    } catch(e) { showToast("Error procesando cURL: " + e.message); }
}

async function sendApiRequest() {
    const url = document.getElementById('apiUrl').value.trim();
    const method = document.getElementById('apiMethod').value;
    const rawHeaders = document.getElementById('apiHeadersInput').value.trim();
    const rawBody = document.getElementById('apiBodyInput').value.trim();
    const responseOut = document.getElementById('apiResponseOutput');
    const statusOut = document.getElementById('apiStatus');

    if (!url) { showToast("Ingresa una URL válida"); return; }

    let headers = {};
    try { if (rawHeaders) headers = JSON.parse(rawHeaders); } catch(e) { showToast("Formato de Headers inválido. Debe ser JSON."); return; }

    const options = { method, headers };
    if (method !== 'GET' && method !== 'HEAD' && rawBody) options.body = rawBody;

    statusOut.innerText = "Enviando..."; statusOut.style.color = "var(--warn)"; responseOut.value = "Cargando...";
    const startTime = performance.now();

    try {
        const response = await fetch(url, options);
        const time = Math.round(performance.now() - startTime);
        let color = response.ok ? "var(--success)" : "var(--err)";
        statusOut.innerHTML = `<span style="color:${color}">${response.status} ${response.statusText}</span> <span style="margin-left:10px; color:#8b949e;">⏱️ ${time}ms</span>`;

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const json = await response.json(); responseOut.value = JSON.stringify(json, null, 4);
        } else {
            const text = await response.text(); responseOut.value = text;
        }
    } catch (e) {
        statusOut.innerHTML = `<span style="color:var(--err)">Error de Red</span>`;
        responseOut.value = "Error al conectar. \n1. La URL no existe.\n2. Bloqueo CORS.\nDetalle técnico: " + e.message;
    }
}

function clearAll() { 
    document.querySelectorAll('textarea').forEach(t => t.value = ''); 
    document.getElementById('output').innerHTML = 'Consola limpia...'; 
    document.getElementById('btnCopy').style.display = 'none'; 
}

// ====================================================
// IA Y MONGODB (CON MARKDOWN GENERATOR)
// ====================================================
function addConceptCard(concepto, justificacion) {
    const container = document.getElementById('aiConceptsContainer');
    const id = 'concept_' + Date.now() + Math.random().toString(36).substr(2, 9);
    container.insertAdjacentHTML('beforeend', `<div class="concept-card" id="${id}"><button class="concept-card-delete" onclick="document.getElementById('${id}').remove()">X Eliminar</button><input type="text" class="concept-title" value="${concepto}"><textarea class="concept-just">${justificacion}</textarea></div>`);
}

async function extractAIMetadata() {
    const url = document.getElementById('aiUrl').value.trim();
    const rawReason = document.getElementById('aiRawReason').value.trim();
    
    // Extrayendo el código directamente de los inputs de comparación principal
    const oldCode = document.getElementById('jsonA').value.trim();
    const newCode = document.getElementById('jsonB').value.trim();

    const btn = event.target; const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ La IA está leyendo y documentando..."; btn.disabled = true;

    try {
        const response = await fetch('/api/analyze', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ url, reason: rawReason, old_code: oldCode, new_code: newCode }) 
        });
        
        // --- NUEVO MANEJO DE ERRORES INTELIGENTE ---
        if (!response.ok) {
            let errorMsg = "Error desconocido del servidor.";
            try {
                // Intentamos leer el JSON de error que manda Flask (ej: límite de cuota)
                const errorJson = await response.json();
                errorMsg = errorJson.error || errorMsg;
            } catch(err) {
                // Si no es un JSON, leemos el texto crudo (ej: error 502 de Render)
                errorMsg = await response.text() || `Error HTTP: ${response.status}`;
            }
            throw new Error(errorMsg);
        }
        // -------------------------------------------

        const aiData = await response.json();

        document.getElementById('aiFinalDomain').value = aiData.dominio || "Desconocido";
        document.getElementById('aiFinalCountry').value = aiData.pais || "Global";
        document.getElementById('aiFinalType').value = aiData.tipo_robot || "Desconocido";
        document.getElementById('aiFinalStack').value = aiData.actor || "Desconocido";
        
        // Populando campos de Machine Learning
        if (aiData.analisis_entrenamiento) {
            document.getElementById('aiRootProblem').value = aiData.analisis_entrenamiento.problema_raiz || "";
            document.getElementById('aiSolutionApplied').value = aiData.analisis_entrenamiento.solucion_aplicada || "";
            document.getElementById('aiRepairPattern').value = aiData.analisis_entrenamiento.patron_reparacion || "";
        }
        
        document.getElementById('aiGeneratedDocs').value = aiData.documentacion_md || "No se pudo generar la documentación.";

        const container = document.getElementById('aiConceptsContainer'); container.innerHTML = '';
        const conceptosArray = aiData.conceptos_ia || [];
        if (conceptosArray.length === 0) addConceptCard("Ninguno", "No hay datos");
        else conceptosArray.forEach(c => addConceptCard(c.concepto, c.justificacion));

        document.getElementById('aiSupervisionArea').style.display = 'block';
        showToast("¡Análisis completado con éxito!", "success");

    } catch (e) { 
        // Ahora si falla, dirá si es Render durmiendo, JSON malo, o cuota excedida
        let msg = e.message;
        if (msg.includes("Failed to fetch")) msg = "Error de conexión: El servidor (Render) está apagado o tardó mucho en responder. Intenta de nuevo.";
        showToast("Fallo IA: " + msg, "error"); 
    } finally { 
        btn.innerHTML = originalText; btn.disabled = false; 
    }
}

async function saveToDatabase() {
    const btn = event.target; const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Guardando..."; btn.disabled = true;

    const finalConcepts = [];
    document.querySelectorAll('.concept-card').forEach(node => {
        const title = node.querySelector('.concept-title').value.trim();
        const just = node.querySelector('.concept-just').value.trim();
        if (title) finalConcepts.push({ concepto: title, justificacion: just });
    });

    const payload = {
        contexto_web: { start_url: document.getElementById('aiUrl').value.trim(), dominio: document.getElementById('aiFinalDomain').value.trim(), pais: document.getElementById('aiFinalCountry').value.trim() },
        arquitectura: { tipo_robot: document.getElementById('aiFinalType').value.trim(), actor: document.getElementById('aiFinalStack').value.trim() },
        analisis_entrenamiento: {
            problema_raiz: document.getElementById('aiRootProblem').value.trim(),
            solucion_aplicada: document.getElementById('aiSolutionApplied').value.trim(),
            patron_reparacion: document.getElementById('aiRepairPattern').value.trim()
        },
        justificacion: { texto_crudo: document.getElementById('aiRawReason').value.trim(), conceptos_ia: finalConcepts, supervisado_por_humano: true },
        documentacion: document.getElementById('aiGeneratedDocs').value.trim()
    };

    try {
        const response = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (response.ok) { btn.innerHTML = "✅ ¡Guardado en Mongo!"; btn.style.background = "#2ea043"; setTimeout(() => { btn.innerHTML = originalText; btn.style.background = "var(--success)"; btn.disabled = false; }, 3000); } 
        else throw new Error("Error Servidor");
    } catch (e) { showToast("Error DB: " + e.message); btn.innerHTML = originalText; btn.disabled = false; }
}

setTab('codes');