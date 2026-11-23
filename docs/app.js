// ==============================================================================
// Kryptonium Web Crypto Client - AES-256-GCM Entschlüsselung
// ==============================================================================

const lockScreen = document.getElementById('lockScreen');
const mainDashboard = document.getElementById('mainDashboard');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const lockError = document.getElementById('lockError');
const lockAgainBtn = document.getElementById('lockAgainBtn');

let decryptedPayload = null;
let countdownInterval = null;

// Hilfsfunktion: Base64 zu ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// AES-256-GCM Entschlüsselung mit nativer Web Crypto API
async function decryptData(encryptedObj, password) {
  const enc = new TextEncoder();
  const salt = base64ToArrayBuffer(encryptedObj.salt);
  const iv = base64ToArrayBuffer(encryptedObj.iv);
  const ciphertext = base64ToArrayBuffer(encryptedObj.ciphertext);

  // 1. Password Key ableiten
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // 2. AES-GCM Key erzeugen (PBKDF2 mit 100.000 Iterationen)
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // 3. Entschlüsseln
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}

// Lade verschlüsselte Statusdatei & entschlüssele
async function attemptUnlock(password) {
  try {
    lockError.classList.add('hidden');
    const response = await fetch('data/encrypted_status.json?nocache=' + Date.now());
    if (!response.ok) {
      throw new Error("encrypted_status.json konnte nicht geladen werden.");
    }
    const encryptedJson = await response.json();
    const data = await decryptData(encryptedJson, password);

    // Erfolgreich entschlüsselt!
    decryptedPayload = data;
    sessionStorage.setItem('kryptonium_pw', password);

    renderDashboard(data);
    lockScreen.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
  } catch (err) {
    console.error("Entschlüsselung fehlgeschlagen:", err);
    lockError.classList.remove('hidden');
  }
}

// Event: Passwort abschicken
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const pw = passwordInput.value.trim();
  if (pw) {
    attemptUnlock(pw);
  }
});

// Event: Manuell wieder sperren
lockAgainBtn.addEventListener('click', () => {
  sessionStorage.removeItem('kryptonium_pw');
  decryptedPayload = null;
  if (countdownInterval) clearInterval(countdownInterval);
  mainDashboard.classList.add('hidden');
  lockScreen.classList.remove('hidden');
  passwordInput.value = '';
});

// Prüfe ob bereits ein Passwort in sessionStorage existiert
window.addEventListener('DOMContentLoaded', () => {
  const savedPw = sessionStorage.getItem('kryptonium_pw');
  if (savedPw) {
    attemptUnlock(savedPw);
  }
});

// ==============================================================================
// DASHBOARD RENDERING
// ==============================================================================
function renderDashboard(data) {
  const meta = data.meta || {};
  const stats = data.stats || {};
  const tasks = data.tasks || [];
  const logs = data.logs || [];

  // 1. Status Banner
  document.getElementById('statusText').innerText = meta.overall_status || 'ONLINE / OK';
  document.getElementById('lastRunText').innerText = 'Letzter Lauf: ' + (meta.last_run || 'Unbekannt');

  const statusDot = document.getElementById('statusDot');
  statusDot.className = 'dot ' + (meta.overall_status.includes('OK') ? 'green' : 'red');

  // Service Status
  const comp = meta.components || {};
  document.getElementById('untisStatus').innerText = comp.untis || 'ONLINE';
  document.getElementById('iservStatus').innerText = comp.iserv || 'ONLINE';
  document.getElementById('discordStatus').innerText = comp.discord || 'ONLINE';

  // 2. Metriken
  document.getElementById('totalTasksCount').innerText = stats.total_tasks || '0';
  document.getElementById('newTasksCount').innerText = stats.new_tasks_last_run || '0';
  document.getElementById('successRate').innerText = stats.success_rate || '100%';

  if (data.repo_url) {
    document.getElementById('ghActionBtn').href = data.repo_url;
  }

  // 3. Countdown Timer bis zum nächsten Run
  startCountdown(meta.next_run_iso);

  // 4. Aufgaben Board
  renderTasks(tasks, 'all');

  // Filter Event Listeners
  document.querySelectorAll('.pill').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTasks(tasks, btn.dataset.filter);
    };
  });

  // 5. System Logs
  renderLogs(logs);
}

function startCountdown(nextIso) {
  if (countdownInterval) clearInterval(countdownInterval);
  const targetTime = nextIso ? new Date(nextIso).getTime() : Date.now() + 6 * 3600 * 1000;

  function update() {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      document.getElementById('countdownTimer').innerText = 'Wird jetzt ausgeführt...';
      return;
    }
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => n.toString().padStart(2, '0');
    document.getElementById('countdownTimer').innerText = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

function renderTasks(tasks, filter) {
  const container = document.getElementById('tasksList');
  container.innerHTML = '';

  let filtered = tasks;
  if (filter === 'exam') {
    filtered = tasks.filter(t => t.title.toLowerCase().includes('klausur') || t.title.toLowerCase().includes('arbeit'));
  } else if (filter === 'homework') {
    filtered = tasks.filter(t => !t.title.toLowerCase().includes('klausur') && !t.title.toLowerCase().includes('arbeit'));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 14px; padding: 20px 0;">Keine Aufgaben für diesen Filter gefunden.</div>`;
    return;
  }

  filtered.slice().reverse().forEach((task, idx) => {
    const card = document.createElement('div');
    card.className = 'task-card';

    const cardId = `task-sol-${idx}`;
    card.innerHTML = `
      <div class="task-top">
        <span class="task-subject">${escapeHtml(task.subject || 'Fach')}</span>
        <span class="task-due">Fällig: <b>${escapeHtml(task.due_date || '-')}</b></span>
      </div>
      <div class="task-title">${escapeHtml(task.title || task.task_raw || 'Aufgabe')}</div>
      <div class="solution-toggle">
        <button class="btn-toggle" onclick="toggleSolution('${cardId}')">
          <span id="${cardId}-icon">▶</span> Lösung anzeigen
        </button>
        <button class="btn-copy" onclick="copySolution('${cardId}')">Kopieren</button>
      </div>
      <div id="${cardId}" class="solution-box hidden">${escapeHtml(task.solution_summary || 'Kein Vorschau-Text hinterlegt.')}</div>
    `;
    container.appendChild(card);
  });
}

window.toggleSolution = function(id) {
  const box = document.getElementById(id);
  const icon = document.getElementById(id + '-icon');
  if (box.classList.contains('hidden')) {
    box.classList.remove('hidden');
    icon.innerText = '▼';
  } else {
    box.classList.add('hidden');
    icon.innerText = '▶';
  }
};

window.copySolution = function(id) {
  const box = document.getElementById(id);
  const text = box.innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert("Lösung in die Zwischenablage kopiert!");
  });
};

function renderLogs(logs) {
  const terminal = document.getElementById('logsTerminal');
  terminal.innerHTML = '';

  if (logs.length === 0) {
    terminal.innerHTML = `<div class="log-line"><span class="log-msg">Keine Logs vorhanden.</span></div>`;
    return;
  }

  logs.forEach(l => {
    const row = document.createElement('div');
    row.className = 'log-line';
    row.innerHTML = `
      <span class="log-time">[${escapeHtml(l.time || '')}]</span>
      <span class="log-level ${escapeHtml(l.level || 'INFO')}">[${escapeHtml(l.level || 'INFO')}]</span>
      <span class="log-msg">${escapeHtml(l.msg || '')}</span>
    `;
    terminal.appendChild(row);
  });

  terminal.scrollTop = terminal.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
