// ==============================================================================
// Kryptonium Web Crypto Client & Command Center
// ==============================================================================

const lockScreen = document.getElementById('lockScreen');
const mainDashboard = document.getElementById('mainDashboard');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const lockError = document.getElementById('lockError');
const lockAgainBtn = document.getElementById('lockAgainBtn');

let decryptedPayload = null;
let countdownInterval = null;
let currentPerson = 'deniz';

// Lernzettel-Bibliothek (Klasse 10s)
const STUDY_MATERIALS = [
  {
    subject: "Physik",
    title: "Halbleiter, Dioden & Kaltleiter / Heißleiter",
    summary: "Vorbereitung Klassenarbeit Nr. 1: Eigenleitung, Dotierung (n- und p-Leiter), Funktionsweise einer Diode (Sperrschicht, Durchlassrichtung), LDR (Lichtabhängiger Widerstand) und Kennlinien.",
    content: "1. Halbleiter Grundlagen:\nReines Silizium leitet bei 0 K nicht. Erst durch Wärme oder Licht werden Elektronen frei (Eigenleitung).\n\n2. Dotierung:\n- n-Dotierung: Phosphor (5 Valenzelektronen) spendet freie Elektronen (Donator).\n- p-Dotierung: Bor (3 Valenzelektronen) erzeugt Elektronenlöcher (Akzeptor).\n\n3. Diode:\np-n-Übergang mit Raumladungszone. In Durchlassrichtung (Plus an p, Minus an n) wird die Sperrschicht abgebaut (Schwellenspannung Silizium ~0.7V). In Sperrrichtung wird sie breiter."
  },
  {
    subject: "Geschichte",
    title: "Krisenjahr 1923 & Die Goldenen Zwanziger",
    summary: "Ruhrbesetzung, Hyperinflation, Hitler-Putsch 1923, Dawes-Plan und die Scheinblüte in den Metropolen (1924–1929).",
    content: "1. Belastung 1923:\n- Ruhrbesetzung durch französische Truppen nach Lieferverzögerungen.\n- Passiver Widerstand führte zum Drucken von Papiergeld -> Hyperinflation.\n- Währungsreform mit der Rentenmark im November 1923 stoppte die Krise.\n\n2. Scheinblüte der Goldenen 20er:\n- Wirtschaftlicher Aufschwung getragen durch kurzfristige US-Kredite (Dawes-Plan).\n- Kultureller Boom in Berlin (Kino, Jazz, Mode, Charleston).\n- Mythos: Auf dem Land und bei Bauern herrschte weiter große Not. Mit dem New Yorker Börsencrash 1929 brach das System zusammen."
  },
  {
    subject: "Deutsch",
    title: "Sachtextanalyse & Lineare Erörterung",
    summary: "T-A-T-T-E Einleitungssatz, Argumenttypen (Fakten-, Autoritäts-, Normativargument) und rhetorische Mittel mit Zitierweise.",
    content: "1. Einleitung (T-A-T-T-E):\nTitel, Autor, Textsorte, Thema, Erscheinungsjahr/Quelle.\nBeispiel: 'In dem Kommentar [Titel] von [Autor], erschienen am [Datum] in [Zeitung], geht es um die Frage, ob...'\n\n2. Argumenttypen:\n- Faktenargument: Durch überprüfbare Daten oder Studien belegt.\n- Autoritätsargument: Berufung auf anerkannte Experten.\n- Normatives Argument: Berufung auf allgemeine Werte oder Gesetze.\n\n3. Wichtig:\nZitate immer exakt belegen (vgl. Z. 14–16)!"
  },
  {
    subject: "Deutsch",
    title: "Corpus Delicti (Mia Holl) Lektüren-Spickzettel",
    summary: "Charakterisierung Mia Holl, Wächterrat, die METHODE und Heinrich Kramer.",
    content: "1. Mia Holl:\nZu Beginn eine überzeugte Anhängerin der METHODE ('gesunder Geist im gesunden Körper'). Nach dem Suizid ihres Bruders Moritz Holl gerät sie in Zweifel und verweigert ihren Schlaf- und Ernährungsbericht.\n\n2. Konflikt:\nIndividuelle Freiheit vs. staatliche Gesundheitsdiktatur. Heinrich Kramer als Hardliner der Methode stilisiert Mia zur Staatsfeindin."
  },
  {
    subject: "Mathematik",
    title: "WieWo Wissensspeicher & Parabeln",
    summary: "Quadratische Funktionen (Scheitelpunktform), Bruchrechnen ohne Taschenrechner und Wahrscheinlichkeitsrechnung mit Baumdiagrammen.",
    content: "1. Scheitelpunktform:\nf(x) = a(x - d)² + e -> Scheitelpunkt S(d | e).\na > 0: nach oben offen, a < 0: nach unten offen. |a| > 1: gestreckt, |a| < 1: gestaucht.\n\n2. Wahrscheinlichkeiten bei 3 Würfen:\nGenau zwei Sechsen: 3 * (1/6)² * (5/6) = 15/216 (~6.94%)."
  },
  {
    subject: "Spanisch",
    title: "Los medios de comunicación & Redes Sociales",
    summary: "Wortschatz für Debatten, Meinungsäußerung (Creo que, en mi opinión, por un lado / por otro lado).",
    content: "1. Nützliche Phrasen:\n- En mi opinión / Desde mi punto de vista: Meiner Meinung nach\n- Por un lado... por otro lado: Einerseits... andererseits\n- Estoy a favor de / Estoy en contra de: Ich bin dafür / dagegen\n\n2. Vokabular:\n- las redes sociales: soziale Netzwerke\n- el teléfono móvil: Smartphone\n- perder el tiempo: Zeit verschwenden"
  }
];

// Base64 & Web Crypto AES-256-GCM Entschlüsselung
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

async function decryptData(encryptedObj, password) {
  const enc = new TextEncoder();
  const salt = base64ToArrayBuffer(encryptedObj.salt);
  const iv = base64ToArrayBuffer(encryptedObj.iv);
  const ciphertext = base64ToArrayBuffer(encryptedObj.ciphertext);

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

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

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}

async function attemptUnlock(password) {
  try {
    lockError.classList.add('hidden');
    const response = await fetch('data/encrypted_status.json?nocache=' + Date.now());
    if (!response.ok) throw new Error("Status-Datei nicht gefunden");
    const encryptedJson = await response.json();
    const data = await decryptData(encryptedJson, password);

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

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const pw = passwordInput.value.trim();
  if (pw) attemptUnlock(pw);
});

lockAgainBtn.addEventListener('click', () => {
  sessionStorage.removeItem('kryptonium_pw');
  decryptedPayload = null;
  if (countdownInterval) clearInterval(countdownInterval);
  mainDashboard.classList.add('hidden');
  lockScreen.classList.remove('hidden');
  passwordInput.value = '';
});

window.addEventListener('DOMContentLoaded', () => {
  const savedPw = sessionStorage.getItem('kryptonium_pw');
  if (savedPw) attemptUnlock(savedPw);

  // Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Person Switcher (Deniz / Bruno)
  document.querySelectorAll('.person-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.person-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPerson = btn.dataset.person;
      if (decryptedPayload) {
        renderTasks(decryptedPayload.tasks || []);
      }
    });
  });

  // Lernzettel Suche
  document.getElementById('studySearchInput').addEventListener('input', (e) => {
    renderStudyMaterials(e.target.value.toLowerCase());
  });

  // Foto Upload Mock
  setupPhotoUpload();
});

// ==============================================================================
// DASHBOARD RENDERING
// ==============================================================================
function renderDashboard(data) {
  const meta = data.meta || {};
  const tasks = data.tasks || [];
  const logs = data.logs || [];

  document.getElementById('statusText').innerText = meta.overall_status || 'ONLINE / OK';
  document.getElementById('lastRunText').innerText = 'Letzter Check: ' + (meta.last_run || 'vor wenigen Minuten');

  const comp = meta.components || {};
  document.getElementById('untisStatus').innerText = comp.untis || 'ONLINE';
  document.getElementById('iservStatus').innerText = comp.iserv || 'ONLINE';
  document.getElementById('discordStatus').innerText = comp.discord || 'ONLINE';

  startCountdown(meta.next_run_iso);
  renderTasks(tasks);
  renderStudyMaterials('');
  renderLogs(logs);
}

function startCountdown(nextIso) {
  if (countdownInterval) clearInterval(countdownInterval);
  const targetTime = nextIso ? new Date(nextIso).getTime() : Date.now() + 6 * 3600 * 1000;

  function update() {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      document.getElementById('countdownTimer').innerText = 'Check läuft...';
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

function renderTasks(tasks) {
  const container = document.getElementById('tasksList');
  container.innerHTML = '';

  if (tasks.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 20px 0;">Keine aktuellen Hausaufgaben vorhanden.</div>`;
    return;
  }

  tasks.slice().reverse().forEach((task, idx) => {
    const card = document.createElement('div');
    card.className = 'task-card';
    const cardId = `task-sol-${idx}`;

    // Passe Text an ausgewählte Person an
    let solutionText = task.solution_summary || 'Lösung wird erstellt.';
    if (currentPerson === 'bruno') {
      solutionText = solutionText.replace(/Deniz Tursun/g, "Bruno");
    }

    card.innerHTML = `
      <div class="task-top">
        <span class="task-subject">${escapeHtml(task.subject || 'Fach')}</span>
        <span class="task-due">Fällig: <b>${escapeHtml(task.due_date || '-')}</b></span>
      </div>
      <div class="task-title">${escapeHtml(task.title || task.task_raw)}</div>
      <div class="solution-toggle">
        <button class="btn-toggle" onclick="toggleSolution('${cardId}')">
          <span id="${cardId}-icon">▶</span> Lösung (${currentPerson === 'deniz' ? 'Deniz' : 'Bruno'}) anzeigen
        </button>
        <button class="btn-copy" onclick="copyText('${cardId}')">Lösung Kopieren</button>
      </div>
      <div id="${cardId}" class="solution-box hidden">${escapeHtml(solutionText)}</div>
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

window.copyText = function(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert("In die Zwischenablage kopiert!");
  });
};

function renderStudyMaterials(query) {
  const container = document.getElementById('studyGrid');
  container.innerHTML = '';

  const filtered = STUDY_MATERIALS.filter(s =>
    s.subject.toLowerCase().includes(query) ||
    s.title.toLowerCase().includes(query) ||
    s.summary.toLowerCase().includes(query)
  );

  filtered.forEach((mat, idx) => {
    const card = document.createElement('div');
    card.className = 'study-card';
    const boxId = `study-box-${idx}`;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="task-subject">${escapeHtml(mat.subject)}</span>
        <button class="btn-copy" onclick="copyText('${boxId}')">Kopieren</button>
      </div>
      <h3>${escapeHtml(mat.title)}</h3>
      <p>${escapeHtml(mat.summary)}</p>
      <div id="${boxId}" class="solution-box">${escapeHtml(mat.content)}</div>
    `;
    container.appendChild(card);
  });
}

function renderLogs(logs) {
  const terminal = document.getElementById('logsTerminal');
  terminal.innerHTML = '';
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

function setupPhotoUpload() {
  const input = document.getElementById('fileUploadInput');
  const dropZone = document.getElementById('dropZone');
  const feedback = document.getElementById('uploadFeedback');
  const result = document.getElementById('uploadResult');
  const resultBox = document.getElementById('resultContent');

  input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handlePhoto(e.target.files[0]);
    }
  });

  function handlePhoto(file) {
    feedback.classList.remove('hidden');
    result.classList.add('hidden');

    setTimeout(() => {
      feedback.classList.add('hidden');
      result.classList.remove('hidden');
      resultBox.innerText = `[Foto-Analyse für: ${file.name}]\n\nKryptonium hat die handschriftliche Aufgabe erkannt:\nAufgabe: Berechne den Quotienten aus der Summe von -2 und -4 sowie dem Quotienten dieser Zahlen.\n\nLösung:\nSumme: (-2) + (-4) = -6\nQuotient: (-2) / (-4) = 0.5\nEndergebnis: -6 / 0.5 = -12\n\n(Fertige Schülerversion ohne Kommas generiert)`;
    }, 2000);
  }
}

window.copyUploadResult = function() {
  const text = document.getElementById('resultContent').innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert("Korrektur kopiert!");
  });
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
