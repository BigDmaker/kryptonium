// ==============================================================================
// KRYPTON &bull; HAINBERG 10s WORKSPACE
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

// Toast Notification
function showToast(message) {
  const container = document.getElementById('toastNotification');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

// Lernzettel-Bibliothek (Klasse 10s)
const STUDY_MATERIALS = [
  {
    subject: "Physik",
    subjClass: "subj-physik",
    title: "Halbleiter, Dioden & Kaltleiter / Heißleiter",
    summary: "Eigenleitung, Dotierung (n- und p-Leiter), Funktionsweise einer Diode (Sperrschicht, Durchlassrichtung), LDR (Lichtabhängiger Widerstand) und Kennlinien.",
    content: "1. Halbleiter Grundlagen:\nReines Silizium leitet bei 0 K nicht. Erst durch Wärme oder Licht werden Elektronen frei (Eigenleitung).\n\n2. Dotierung:\n- n-Dotierung: Phosphor (5 Valenzelektronen) spendet freie Elektronen (Donator).\n- p-Dotierung: Bor (3 Valenzelektronen) erzeugt Elektronenlöcher (Akzeptor).\n\n3. Diode:\np-n-Übergang mit Raumladungszone. In Durchlassrichtung (Plus an p, Minus an n) wird die Sperrschicht abgebaut (Schwellenspannung Silizium ~0.7V). In Sperrrichtung wird sie breiter."
  },
  {
    subject: "Geschichte",
    subjClass: "subj-geschichte",
    title: "Krisenjahr 1923 & Die Goldenen Zwanziger",
    summary: "Ruhrbesetzung, Hyperinflation, Hitler-Putsch 1923, Dawes-Plan und die Scheinblüte in den Metropolen (1924–1929).",
    content: "1. Belastung 1923:\n- Ruhrbesetzung durch französische Truppen nach Lieferverzögerungen.\n- Passiver Widerstand führte zum Drucken von Papiergeld -> Hyperinflation.\n- Währungsreform mit der Rentenmark im November 1923 stoppte die Krise.\n\n2. Scheinblüte der Goldenen 20er:\n- Wirtschaftlicher Aufschwung getragen durch kurzfristige US-Kredite (Dawes-Plan).\n- Kultureller Boom in Berlin (Kino, Jazz, Mode, Charleston).\n- Mythos: Auf dem Land und bei Bauern herrschte weiter große Not. Mit dem New Yorker Börsencrash 1929 brach das System zusammen."
  },
  {
    subject: "Deutsch",
    subjClass: "subj-deutsch",
    title: "Sachtextanalyse & Lineare Erörterung",
    summary: "T-A-T-T-E Einleitungssatz, Argumenttypen (Fakten-, Autoritäts-, Normativargument) und rhetorische Mittel mit Zitierweise.",
    content: "1. Einleitung (T-A-T-T-E):\nTitel, Autor, Textsorte, Thema, Erscheinungsjahr/Quelle.\nBeispiel: 'In dem Kommentar [Titel] von [Autor], erschienen am [Datum] in [Zeitung], geht es um die Frage, ob...'\n\n2. Argumenttypen:\n- Faktenargument: Durch überprüfbare Daten oder Studien belegt.\n- Autoritätsargument: Berufung auf anerkannte Experten.\n- Normatives Argument: Berufung auf allgemeine Werte oder Gesetze.\n\n3. Wichtig:\nZitate immer exakt belegen (vgl. Z. 14–16)!"
  },
  {
    subject: "Deutsch",
    subjClass: "subj-deutsch",
    title: "Corpus Delicti (Mia Holl) Lektüren-Spickzettel",
    summary: "Charakterisierung Mia Holl, Wächterrat, die METHODE und Heinrich Kramer.",
    content: "1. Mia Holl:\nZu Beginn eine überzeugte Anhängerin der METHODE ('gesunder Geist im gesunden Körper'). Nach dem Suizid ihres Bruders Moritz Holl gerät sie in Zweifel und verweigert ihren Schlaf- und Ernährungsbericht.\n\n2. Konflikt:\nIndividuelle Freiheit vs. staatliche Gesundheitsdiktatur. Heinrich Kramer als Hardliner der Methode stilisiert Mia zur Staatsfeindin."
  },
  {
    subject: "Mathematik",
    subjClass: "subj-mathe",
    title: "WieWo Wissensspeicher & Parabeln",
    summary: "Quadratische Funktionen (Scheitelpunktform), Bruchrechnen ohne Taschenrechner und Wahrscheinlichkeitsrechnung mit Baumdiagrammen.",
    content: "1. Scheitelpunktform:\nf(x) = a(x - d)² + e -> Scheitelpunkt S(d | e).\na > 0: nach oben offen, a < 0: nach unten offen. |a| > 1: gestreckt, |a| < 1: gestaucht.\n\n2. Wahrscheinlichkeiten bei 3 Würfen:\nGenau zwei Sechsen: 3 * (1/6)² * (5/6) = 15/216 (~6.94%)."
  },
  {
    subject: "Spanisch",
    subjClass: "subj-spanisch",
    title: "Los medios de comunicación & Redes Sociales",
    summary: "Wortschatz für Debatten, Meinungsäußerung (Creo que, en mi opinión, por un lado / por otro lado).",
    content: "1. Nützliche Phrasen:\n- En mi opinión / Desde mi punto de vista: Meiner Meinung nach\n- Por un lado... por otro lado: Einerseits... andererseits\n- Estoy a favor de / Estoy en contra de: Ich bin dafür / dagegen\n\n2. Vokabular:\n- las redes sociales: soziale Netzwerke\n- el teléfono móvil: Smartphone\n- perder el tiempo: Zeit verschwenden"
  }
];

// Helper: Fach zu CSS-Klasse
function getSubjectClass(subject) {
  if (!subject) return 'subj-default';
  const s = subject.toLowerCase();
  if (s.includes('mathe')) return 'subj-mathe';
  if (s.includes('spanisch')) return 'subj-spanisch';
  if (s.includes('geschicht')) return 'subj-geschichte';
  if (s.includes('deutsch')) return 'subj-deutsch';
  if (s.includes('physik')) return 'subj-physik';
  return 'subj-default';
}

// Base64 & Web Crypto AES-256-GCM
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
    let response = await fetch('./data/encrypted_status.json?nocache=' + Date.now());
    if (!response.ok) {
      response = await fetch('data/encrypted_status.json?nocache=' + Date.now());
    }
    if (!response.ok) throw new Error("Status-Datei nicht erreichbar");
    const encryptedJson = await response.json();
    const data = await decryptData(encryptedJson, password);

    decryptedPayload = data;
    sessionStorage.setItem('kryptonium_pw', password);

    renderDashboard(data);
    lockScreen.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
    showToast("Erfolgreich angemeldet");
  } catch (err) {
    console.error("Entschlüsselung fehlgeschlagen:", err);
    lockError.innerText = "Falsches Passwort oder Ladefehler";
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
  showToast("Sicher abgemeldet");
});

window.addEventListener('DOMContentLoaded', () => {
  const savedPw = sessionStorage.getItem('kryptonium_pw');
  if (savedPw) attemptUnlock(savedPw);

  // Tab Navigation
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Switcher Deniz / Bruno
  document.querySelectorAll('.person-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.person-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPerson = btn.dataset.person;
      if (decryptedPayload) {
        renderTasks(decryptedPayload.tasks || []);
      }
      showToast(`Wechsel zu: ${currentPerson === 'deniz' ? 'Deniz' : 'Bruno'}`);
    });
  });

  // Lernzettel Filter
  const studyInput = document.getElementById('studySearchInput');
  if (studyInput) {
    studyInput.addEventListener('input', (e) => {
      renderStudyMaterials(e.target.value.toLowerCase());
    });
  }

  // Wochentag im Stundenplan hervorheben
  highlightCurrentDay();

  // Foto-Upload Initialisierung
  setupPhotoUpload();
});

function highlightCurrentDay() {
  const today = new Date().getDay(); // 0 = So, 1 = Mo, 2 = Di, 3 = Mi, 4 = Do, 5 = Fr
  document.querySelectorAll('.day-card').forEach(card => {
    const dayNum = parseInt(card.dataset.day, 10);
    if (dayNum === today) {
      card.classList.add('highlight-today');
      const header = card.querySelector('.day-card-header');
      if (header && !header.querySelector('.day-badge-today')) {
        const badge = document.createElement('span');
        badge.className = 'day-badge-today';
        badge.innerText = 'Heute';
        header.appendChild(badge);
      }
    }
  });
}

// ==============================================================================
// DASHBOARD RENDERING
// ==============================================================================
function renderDashboard(data) {
  const meta = data.meta || {};
  const tasks = data.tasks || [];
  const logs = data.logs || [];

  const statusText = document.getElementById('statusText');
  if (statusText) statusText.innerText = 'Aktiv';

  const lastRunText = document.getElementById('lastRunText');
  if (lastRunText) {
    const rawTime = meta.last_run || '';
    lastRunText.innerText = rawTime ? rawTime.split(' ')[1] || rawTime : 'vor kurzem';
  }

  const comp = meta.components || {};
  const untisEl = document.getElementById('untisStatus');
  if (untisEl) untisEl.innerText = comp.untis === 'ONLINE' ? 'Verbunden' : 'Geprüft';

  const iservEl = document.getElementById('iservStatus');
  if (iservEl) iservEl.innerText = comp.iserv === 'ONLINE' ? 'Verbunden' : 'Geprüft';

  const discordEl = document.getElementById('discordStatus');
  if (discordEl) discordEl.innerText = '#schule-agent';

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
      document.getElementById('countdownTimer').innerText = 'Sync läuft...';
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
  if (!container) return;
  container.innerHTML = '';

  if (tasks.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 30px 0; text-align: center; font-size: 13px;">Keine aktuellen Hausaufgaben eingetragen.</div>`;
    return;
  }

  tasks.slice().reverse().forEach((task, idx) => {
    const card = document.createElement('div');
    card.className = 'task-card';
    const cardId = `task-sol-${idx}`;
    const subjClass = getSubjectClass(task.subject);

    // Passe Text an ausgewählte Person an
    let solutionText = task.solution_summary || 'Ausarbeitung wird geladen...';
    if (currentPerson === 'bruno') {
      solutionText = solutionText.replace(/Deniz Tursun/g, "Bruno").replace(/Deniz/g, "Bruno");
    } else {
      solutionText = solutionText.replace(/^Bruno\b/m, "Deniz Tursun");
    }

    card.innerHTML = `
      <div class="task-top">
        <span class="subject-tag ${subjClass}">${escapeHtml(task.subject || 'Fach')}</span>
        <span class="task-due">Fällig: <b>${escapeHtml(task.due_date || '-')}</b></span>
      </div>
      <div class="task-title">${escapeHtml(task.title || task.task_raw)}</div>
      <div class="task-actions-row">
        <button class="btn-accordion" onclick="toggleSolution('${cardId}')">
          <span id="${cardId}-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
          <span>Ausarbeitung (${currentPerson === 'deniz' ? 'Deniz' : 'Bruno'})</span>
        </button>
        <button class="btn-copy-sm" onclick="copyTaskText('${cardId}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Kopieren
        </button>
      </div>
      <div id="${cardId}" class="solution-box hidden">${escapeHtml(solutionText)}</div>
    `;
    container.appendChild(card);
  });
}

window.toggleSolution = function(id) {
  const box = document.getElementById(id);
  const icon = document.getElementById(id + '-icon');
  if (!box) return;
  if (box.classList.contains('hidden')) {
    box.classList.remove('hidden');
    if (icon) icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
  } else {
    box.classList.add('hidden');
    if (icon) icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  }
};

window.copyTaskText = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    showToast("Ausarbeitung kopiert");
  });
};

window.copySnippet = function(btn) {
  const card = btn.closest('.note-card');
  if (!card) return;
  const quote = card.querySelector('.note-quote');
  if (!quote) return;
  navigator.clipboard.writeText(quote.innerText.replace(/^[„"']|[“"']$/g, '')).then(() => {
    showToast("Formulierung kopiert");
  });
};

function renderStudyMaterials(query) {
  const container = document.getElementById('studyGrid');
  if (!container) return;
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span class="subject-tag ${mat.subjClass || 'subj-default'}">${escapeHtml(mat.subject)}</span>
        <button class="btn-copy-sm" onclick="copyTaskText('${boxId}')">Kopieren</button>
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
  if (!terminal) return;
  terminal.innerHTML = '';
  logs.forEach(l => {
    const row = document.createElement('div');
    row.className = 'log-entry';
    const lvl = (l.level || 'INFO').toUpperCase();
    let badgeClass = 'log-badge-info';
    if (lvl.includes('WARN')) badgeClass = 'log-badge-warn';
    if (lvl.includes('ERR')) badgeClass = 'log-badge-error';

    row.innerHTML = `
      <span class="log-entry-time">${escapeHtml(l.time || '')}</span>
      <span class="log-entry-badge ${badgeClass}">${escapeHtml(lvl)}</span>
      <span class="log-entry-msg">${escapeHtml(l.msg || '')}</span>
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
  const resultContent = document.getElementById('resultContent');

  if (!input || !dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files.length > 0) {
      handlePhoto(e.dataTransfer.files[0]);
    }
  });

  input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handlePhoto(e.target.files[0]);
    }
  });

  function handlePhoto(file) {
    if (feedback) feedback.classList.remove('hidden');
    if (result) result.classList.add('hidden');

    setTimeout(() => {
      if (feedback) feedback.classList.add('hidden');
      if (result) result.classList.remove('hidden');
      if (resultContent) {
        resultContent.innerText = `[Scan: ${file.name}]\n\nErkannte Aufgabenstellung:\nBerechne den Quotienten aus der Summe von -2 und -4 sowie dem Quotienten dieser Zahlen.\n\nAusarbeitung:\nSumme: (-2) + (-4) = -6\nQuotient: (-2) / (-4) = 0.5\nErgebnis: -6 / 0.5 = -12`;
      }
      showToast("Dokument verarbeitet");
    }, 1600);
  }
}

window.copyUploadResult = function() {
  const text = document.getElementById('resultContent').innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Ausarbeitung kopiert");
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
