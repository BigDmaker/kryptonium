"""
Kryptonium 24/7 Cloud Assistant (6-Stunden Dauerbetrieb & Dashboard Edition)
Schüler: Deniz Tursun (Klasse 10s, Hainberg-Gymnasium Göttingen)
Freund: Bruno (Klasse 10s)

Hauptfunktionen:
1. Frischer Login für WebUntis & IServ (inkl. Retries & Jitter gegen Rate-Limits)
2. State-Management & SHA-256 Deduplizierung (Verhindert jeglichen Spam)
3. Schülergerechte Aufgabenerledigung: Genau 1x für Deniz und 1x für Bruno (keine 2x Deniz)
4. Symmetrische AES-256-GCM Verschlüsselung aller Logs & Aufgaben fürs GitHub Pages Dashboard
5. Automatischer Discord-Fehleralarm bei Problemen
"""

import os
import sys
import json
import time
import random
import hashlib
import base64
import traceback
import datetime
from datetime import date, timedelta
import requests
import urllib.parse
from bs4 import BeautifulSoup
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

# AES-256-GCM Verschlüsselung
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# ==============================================================================
# CONFIG & SECRETS MANAGEMENT
# ==============================================================================
CONFIG_FILE = "config.json"
def load_full_config():
    cfg = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception:
            pass
    env_cfg = os.environ.get("CONFIG_JSON")
    if env_cfg:
        try:
            cfg.update(json.loads(env_cfg))
        except Exception:
            pass
    return cfg

_cfg = load_full_config()

# Secrets aus Environment oder Fallback auf config.json
UNTIS_SERVER = os.environ.get("UNTIS_SERVER") or _cfg.get("untis", {}).get("server", "hainberg-gymnasium.webuntis.com")
UNTIS_SCHOOL = os.environ.get("UNTIS_SCHOOL") or _cfg.get("untis", {}).get("school", "hainberg-gymnasium")
UNTIS_USER = os.environ.get("UNTIS_USERNAME") or _cfg.get("untis", {}).get("username", "")
UNTIS_PW = os.environ.get("UNTIS_PASSWORD") or _cfg.get("untis", {}).get("password", "")

ISERV_SERVER = os.environ.get("ISERV_SERVER") or _cfg.get("iserv", {}).get("server", "hg-gym.de")
ISERV_USER = os.environ.get("ISERV_USERNAME") or _cfg.get("iserv", {}).get("username", "")
ISERV_PW = os.environ.get("ISERV_PASSWORD") or _cfg.get("iserv", {}).get("password", "")

DISCORD_WEBHOOK = os.environ.get("DISCORD_WEBHOOK") or _cfg.get("discord_webhook", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or _cfg.get("gemini_api_key", "")
DASHBOARD_PASSWORD = os.environ.get("DASHBOARD_PASSWORD") or "kryptonium123"

STATE_FILE = os.path.join("data", "bot_state.json")
STATUS_FILE = os.path.join("docs", "data", "encrypted_status.json")

# Mapping der Untis Fach-Kürzel auf echte Namen & IServ-Ordner
SUBJECT_MAP = {
    "GE": "Geschichte", "MA": "Mathematik", "SN": "Spanisch", "PH": "Physik",
    "DE": "Deutsch", "EN": "Englisch", "IF": "Informatik", "CH": "Chemie",
    "BI": "Biologie", "EK": "Erdkunde", "PO": "Politik", "KU": "Kunst",
    "MU": "Musik", "RE": "Religion", "SP": "Sport", "WP9/10": "Wahlpflicht"
}

# OFFIZIELLE LEHRWERKE & SCHULBÜCHER DER KLASSE 10s (HG GÖTTINGEN)
TEXTBOOKS = {
    "Mathematik": "Fundamente der Mathematik 10 (Gymnasium Niedersachsen, Cornelsen Verlag)",
    "Geschichte": "Zeit für Geschichte 9/10 (Gymnasium Niedersachsen, Westermann / Schroedel Verlag)",
    "Spanisch": "¡Qué pasa! 3 (Spanisch als 3. Fremdsprache, Diesterweg / Westermann Verlag)",
    "Deutsch": "Texte, Themen und Strukturen / Juli Zeh: Corpus Delicti (10. Klasse Gymnasium)",
    "Physik": "Dorn Bader Physik 9/10 (Gymnasium Niedersachsen)"
}

# Logger im Speicher für das Dashboard
RUN_LOGS = []
def log(msg, level="INFO"):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}"
    print(line)
    RUN_LOGS.append({"time": timestamp, "level": level, "msg": str(msg)})

# ==============================================================================
# STATE & DEDUPLIZIERUNG (SHA-256)
# ==============================================================================
def load_bot_state():
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                state = json.load(f)
        except Exception as e:
            log(f"Fehler beim Laden von {STATE_FILE}: {e}", "WARNING")
            state = {}

    # Migration von alter processed_homeworks.json falls vorhanden
    legacy_ids = []
    if os.path.exists("processed_homeworks.json"):
        try:
            with open("processed_homeworks.json", "r", encoding="utf-8") as f:
                legacy_ids = json.load(f)
        except Exception:
            pass

    default_state = {
        "processed_hashes": [],
        "processed_ids": [str(x) for x in legacy_ids],
        "tasks_history": [],
        "runs_history": []
    }
    for k, v in default_state.items():
        state.setdefault(k, v)
    return state

def save_bot_state(state):
    try:
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log(f"Fehler beim Speichern von {STATE_FILE}: {e}", "ERROR")

def compute_task_hash(subject, due_date, text):
    raw = f"{str(subject or '').strip()}_{str(due_date or '').strip()}_{str(text or '').strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

# ==============================================================================
# DISCORD NOTIFICATIONS
# ==============================================================================
def send_discord(content, file_path=None, is_error=False):
    if not DISCORD_WEBHOOK:
        log("Kein Discord Webhook vorhanden!", "WARNING")
        return False
    avatar = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&q=80"
    username = "Kryptonium Alert" if is_error else "Kryptonium (24/7 Cloud)"
    payload = {"username": username, "avatar_url": avatar, "content": content}

    for attempt in range(2):
        try:
            if file_path and os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    files = {"file": (os.path.basename(file_path), f, "application/pdf")}
                    r = requests.post(DISCORD_WEBHOOK, data={"payload_json": json.dumps(payload)}, files=files, timeout=25)
            else:
                r = requests.post(DISCORD_WEBHOOK, json=payload, timeout=10)
            if r.status_code in [200, 204]:
                return True
            log(f"Discord Rückmeldung Code {r.status_code}: {r.text[:100]}", "WARNING")
        except Exception as e:
            log(f"Fehler beim Discord-Versand (Versuch {attempt+1}): {e}", "WARNING")
            time.sleep(2)
    return False

def send_discord_error_alarm(error_msg, context="Allgemein"):
    tb = traceback.format_exc()
    if len(tb) > 900:
        tb = tb[-900:]
    msg = (
        f"🚨 **KRYPTONIUM FEHLER-ALARM** 🚨\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"⚠️ **Bereich:** `{context}`\n"
        f"❌ **Fehler:** {error_msg}\n"
        f"```python\n{tb}\n```\n"
        f"ℹ️ *Der Status und Fehler wurde auch im Dashboard protokolliert.*"
    )
    send_discord(msg, is_error=True)

# ==============================================================================
# RESILIENTER WEBUNTIS CLIENT
# ==============================================================================
def fetch_untis_homeworks():
    """Holt frische WebUntis Hausaufgaben mit Retries und Jitter."""
    if not UNTIS_USER or not UNTIS_PW:
        raise ValueError("Untis Benutzername oder Passwort fehlt!")

    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

    auth_success = False
    for attempt in range(2):
        try:
            time.sleep(random.uniform(1.0, 3.0))
            r_auth = s.post(f"https://{UNTIS_SERVER}/WebUntis/jsonrpc.do?school={UNTIS_SCHOOL}", json={
                "id": "1",
                "method": "authenticate",
                "params": {"user": UNTIS_USER, "password": UNTIS_PW, "client": "KryptoniumCloud"},
                "jsonrpc": "2.0"
            }, timeout=12)
            if r_auth.status_code == 200 and "result" in r_auth.json():
                auth_success = True
                break
        except Exception as e:
            log(f"Untis Login Versuch {attempt+1} fehlgeschlagen: {e}", "WARNING")
            time.sleep(2)

    if not auth_success:
        raise RuntimeError("Authentifizierung bei WebUntis fehlgeschlagen!")

    time.sleep(random.uniform(1.5, 3.5))
    # Fächer abfragen
    r_sub = s.post(f"https://{UNTIS_SERVER}/WebUntis/jsonrpc.do?school={UNTIS_SCHOOL}", json={
        "id": "2", "method": "getSubjects", "params": {}, "jsonrpc": "2.0"
    }, timeout=10)
    sub_map = {x["id"]: x["name"] for x in r_sub.json().get("result", [])} if r_sub.status_code == 200 else {}

    # Hausaufgaben für heute bis +14 Tage abfragen
    today_str = date.today().strftime("%Y%m%d")
    future_str = (date.today() + timedelta(days=14)).strftime("%Y%m%d")
    time.sleep(random.uniform(1.0, 2.5))
    r_hw = s.get(f"https://{UNTIS_SERVER}/WebUntis/api/homeworks/lessons?startDate={today_str}&endDate={future_str}", timeout=12)
    if r_hw.status_code != 200:
        raise RuntimeError(f"Hausaufgaben-Abfrage fehlgeschlagen: HTTP {r_hw.status_code}")

    data = r_hw.json().get("data", {})
    homeworks = data.get("homeworks", [])
    lessons = {l["id"]: l for l in data.get("lessons", [])}

    normalized = []
    for h in homeworks:
        lesson = lessons.get(h.get("lessonId"), {})
        short_s = lesson.get("subject") or ""
        # Zuordnung: Erst Kürzel, dann sub_map
        subject_name = SUBJECT_MAP.get(short_s) or sub_map.get(lesson.get("subjectId")) or short_s or "Hausaufgabe"
        due_raw = str(h.get("dueDate") or "")
        due_fmt = f"{due_raw[6:8]}.{due_raw[4:6]}.{due_raw[:4]}" if len(due_raw) == 8 else (due_raw or "-")
        text = (h.get("text") or "").strip()

        normalized.append({
            "id": str(h.get("id")),
            "subject": subject_name,
            "short_subject": short_s,
            "due_raw": due_raw,
            "due_fmt": due_fmt,
            "text": text,
            "completed": h.get("completed", False)
        })
    log(f"[Untis] {len(normalized)} anstehende Hausaufgabe(n) geladen.", "INFO")
    return normalized

# ==============================================================================
# ISERV READ-ONLY SCANNER (PLAYWRIGHT HEADLESS MIT RETRIES)
# ==============================================================================
def get_iserv_subject_material(page, subject_name, homework_text):
    """Sucht strikt nur im isolierten Fachordner der Klasse 10s auf IServ."""
    if not ISERV_USER or not ISERV_PW:
        return ""
    folder_name = subject_name
    log(f"[IServ] Lese strikt nur Fachordner: Klasse 10s/{folder_name}", "INFO")

    try:
        time.sleep(random.uniform(1.5, 3.0))
        page.goto(f"https://{ISERV_SERVER}/iserv/app/login", timeout=25000)
        page.fill('input[name="_username"]', ISERV_USER)
        page.fill('input[name="_password"]', ISERV_PW)
        page.keyboard.press("Enter")
        page.wait_for_load_state("networkidle", timeout=20000)

        encoded_folder = urllib.parse.quote(folder_name)
        folder_url = f"https://{ISERV_SERVER}/iserv/file/-/Groups/Klasse%2010s/{encoded_folder}"
        page.goto(folder_url, timeout=20000)
        page.wait_for_load_state("networkidle", timeout=15000)

        soup = BeautifulSoup(page.content(), "html.parser")
        files_to_download = []
        for a in soup.find_all("a", href=True):
            href = a.get("href")
            txt = a.get_text(strip=True)
            if f"/iserv/file/-/Groups/Klasse%2010s/{encoded_folder}/" in href and txt:
                if "?show=true" in href or href.endswith(".pdf"):
                    files_to_download.append((txt, f"https://{ISERV_SERVER}" + href.replace("?show=true", "")))

        os.makedirs("cache", exist_ok=True)
        extracted = []
        for fname, furl in files_to_download[:2]:
            resp = page.request.get(furl)
            if resp.status == 200:
                fpath = os.path.join("cache", "temp_read.pdf")
                with open(fpath, "wb") as f:
                    f.write(resp.body())
                reader = PdfReader(fpath)
                for idx, p in enumerate(reader.pages):
                    t = p.extract_text()
                    if t:
                        extracted.append(f"[{fname} S.{idx+1}]: {t[:800]}")
        return "\n\n".join(extracted)
    except Exception as e:
        log(f"[IServ] Hinweis: Fachordner nicht verfügbar oder keine Dateien: {e}", "WARNING")
        return ""

# ==============================================================================
# KI LÖSUNGS-GENERATOR (DENIZ & BRUNO)
# ==============================================================================
def generate_solution_html(subject, topic, due_date, task_text, material, student_name="Deniz Tursun"):
    """
    Erstellt das schülergerechte Dokument (genau 1x Deniz ODER 1x Bruno).
    STIL: Schlichtes 10.-Klasse Blatt, keine Kommas, keine Bullets/Striche.
    Berücksichtigt exakt die offiziellen Lehrwerke der Klasse 10s am HG Göttingen.
    """
    is_bruno = "Bruno" in student_name
    bruno_instruction = "Schreibe als Bruno. Verwende eine eigenständige Wortwahl und andere Formulierungen damit es nicht abgeschrieben wirkt." if is_bruno else "Schreibe als Deniz."
    textbook = TEXTBOOKS.get(subject, f"Standard Schulbuch 10. Klasse Gymnasium Niedersachsen für {subject}")

    prompt = f"""
Du bist {student_name}, ein fauler Schüler der 10. Klasse (10s) am Hainberg-Gymnasium Göttingen.
Erstelle die schriftliche Hausaufgabe für {subject}. {bruno_instruction}

OFFIZIELLES SCHULBUCH: {textbook}
Aufgabe: {task_text}
Zusatz-Material: {material if material else "Keins"}

HINWEIS ZUR AUFGABENSTELLUNG:
Falls in der Aufgabe eine Seitenzahl oder Aufgabennummer aus dem Buch genannt wird (z. B. S. 57, S. 217), beziehe dich exakt auf das Lehrwerk '{textbook}'. Löse genau die dort typischen mathematischen Aufgabenstellungen, historischen Quellenanalysen oder spanischen Grammatik- und Textaufgaben.

REGELN:
1. GANZ SCHLICHTES A4 BLATT wie in Word getippt. Absolut KEIN KI-Aussehen!
2. KEINE PUNKTE ODER STRICHE! Keine Aufzählungszeichen, keine Bullets, keine Gedankenstriche.
3. NIEMALS KOMMAS SETZEN! Kein einziges Komma im Text!
4. Tippfehler und flapsige Sprache einbauen (weill, kriese, das statt dass, auserdem).
5. Kopfzeile: {student_name}<br>Klasse 10s<br>{subject} Hausaufgabe {topic}
6. Exakt 1 A4 Seite. Schriftart Arial, @page {{ size: A4; margin: 18mm 20mm; }}.

Antworte NUR mit HTML-Code (<!DOCTYPE html> bis </html>).
"""
    models = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-flash-latest"]
    html_code = ""
    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={GEMINI_KEY}"
        try:
            r = requests.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=25)
            if r.status_code == 200:
                t = r.json()["candidates"][0]["content"]["parts"][0]["text"]
                if "```html" in t:
                    html_code = t.split("```html")[1].split("```")[0].strip()
                elif "<!DOCTYPE html>" in t:
                    html_code = t.strip()
                if html_code:
                    break
        except Exception:
            pass

    # Post-Processing: Komma-Entfernung
    if html_code:
        import re
        parts = re.split(r"(<[^>]+>)", html_code)
        for i in range(len(parts)):
            if not parts[i].startswith("<"):
                parts[i] = parts[i].replace(",", "")
        html_code = "".join(parts)
    return html_code

def create_one_page_pdf(page, html_content, output_pdf_path):
    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
    page.set_content(html_content, wait_until="load")
    page.pdf(
        path=output_pdf_path,
        format="A4",
        print_background=True,
        margin={"top": "16mm", "bottom": "16mm", "left": "18mm", "right": "18mm"}
    )
    if os.path.exists(output_pdf_path):
        reader = PdfReader(output_pdf_path)
        log(f"[PDF] {os.path.basename(output_pdf_path)} erstellt ({len(reader.pages)} Seite(n))", "INFO")
        return True
    return False

# ==============================================================================
# AES-256-GCM VERSCHLÜSSELUNG FÜRS DASHBOARD
# ==============================================================================
def encrypt_dashboard_data(data_obj, password):
    """
    Verschlüsselt das Dictionary mit AES-256-GCM und PBKDF2.
    Format für Web Crypto API:
    {
      "salt": base64,
      "iv": base64,
      "ciphertext": base64 (inkl. Auth Tag)
    }
    """
    json_bytes = json.dumps(data_obj, ensure_ascii=False).encode("utf-8")
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000
    )
    key = kdf.derive(password.encode("utf-8"))

    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, json_bytes, None)

    return {
        "salt": base64.b64encode(salt).decode("utf-8"),
        "iv": base64.b64encode(iv).decode("utf-8"),
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

def update_encrypted_dashboard(state, overall_status="ONLINE / OK", untis_ok=True, iserv_ok=True, discord_ok=True, new_count=0):
    try:
        now = datetime.datetime.now()
        # Nächster Lauf: In 6 Stunden
        next_run = now + timedelta(hours=6)

        total_processed = len(state.get("tasks_history", []))
        runs_history = state.get("runs_history", [])
        successful_runs = sum(1 for r in runs_history if r.get("status") == "OK")
        total_runs = len(runs_history)
        success_rate = round((successful_runs / total_runs * 100), 1) if total_runs > 0 else 100.0

        dashboard_payload = {
            "meta": {
                "assistant_name": "Kryptonium 24/7 Cloud",
                "version": "2.5.0",
                "last_run": now.strftime("%Y-%m-%d %H:%M:%S"),
                "next_run_iso": next_run.isoformat(),
                "overall_status": overall_status,
                "components": {
                    "untis": "ONLINE" if untis_ok else "FEHLER",
                    "iserv": "ONLINE" if iserv_ok else "WARNUNG",
                    "discord": "ONLINE" if discord_ok else "FEHLER"
                }
            },
            "stats": {
                "total_tasks": total_processed,
                "new_tasks_last_run": new_count,
                "success_rate": f"{success_rate}%",
                "total_runs": total_runs
            },
            "tasks": state.get("tasks_history", [])[-30:],  # Die letzten 30 Aufgaben
            "logs": RUN_LOGS[-50:],  # Letzte 50 Zeilen
            "repo_url": "https://github.com/BigDmaker/kryptonium/actions"
        }

        enc_payload = encrypt_dashboard_data(dashboard_payload, DASHBOARD_PASSWORD)
        os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(enc_payload, f, indent=2)
        log("[Dashboard] Verschlüsselte Status-Datei docs/data/encrypted_status.json erfolgreich aktualisiert.", "INFO")
    except Exception as e:
        log(f"[Dashboard] Fehler beim Erstellen der verschlüsselten Statusdatei: {e}", "ERROR")

# ==============================================================================
# HAUPT-SYNCHRONISATION
# ==============================================================================
def main():
    log("=== KRYPTONIUM CLOUD RUNNER (6-STUNDEN-DAUERBETRIEB) START ===", "INFO")
    state = load_bot_state()

    untis_ok = False
    iserv_ok = True
    discord_ok = True
    overall_status = "ONLINE / OK"
    new_tasks_count = 0

    try:
        # 1. Untis Aufgaben resilient abfragen
        try:
            homeworks = fetch_untis_homeworks()
            untis_ok = True
        except Exception as ue:
            untis_ok = False
            log(f"Fehler bei Untis-Abfrage: {ue}", "ERROR")
            send_discord_error_alarm(str(ue), context="WebUntis Abfrage")
            homeworks = []

        # 2. Aufgaben filtern & verarbeiten
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
            )
            try:
                page = browser.new_page()

                for hw in homeworks:
                    hw_id = str(hw.get("id"))
                    subject_name = hw.get("subject") or "Hausaufgabe"
                    due_fmt = hw.get("due_fmt") or "-"
                    due_raw = hw.get("due_raw") or ""
                    hw_text = hw.get("text") or ""
                    clean_topic = hw_text.split("\n")[0][:45].strip() if hw_text else "Hausaufgabe"

                    # Deduplizierung per SHA-256 Hash
                    task_hash = compute_task_hash(subject_name, due_raw, hw_text)

                    # Prüfung: Bereits per Hash ODER per ID verarbeitet?
                    if task_hash in state.get("processed_hashes", []) or hw_id in state.get("processed_ids", []):
                        log(f"Aufgabe bereits bearbeitet: {subject_name} ({due_fmt}) -> Überspringe.", "INFO")
                        continue

                    # NEUE AUFGABE GEFUNDEN!
                    new_tasks_count += 1
                    log(f"--- Neue Aufgabe gefunden: {subject_name} ({due_fmt}) ---", "INFO")

                    # Material auf IServ suchen (isoliert im Fachordner)
                    iserv_mat = get_iserv_subject_material(page, subject_name, hw_text)

                    # GENAU 2 LÖSUNGEN: 1x Deniz & 1x Bruno
                    def make_info(target):
                        return (
                            f"📚 **NEUE HAUSAUFGABE BEARBEITET**\n"
                            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            f"👤 **Für wen:** {target}\n"
                            f"📖 **Fach:** `{subject_name}`\n"
                            f"📅 **Fällig am:** **{due_fmt}**\n"
                            f"📝 **Thema:** {clean_topic}\n"
                            f"✨ **Format:** 1 Seite &bull; ohne Kommas\n"
                            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                        )

                    # 1. Deniz Lösung
                    html_deniz = generate_solution_html(subject_name, clean_topic, due_fmt, hw_text, iserv_mat, "Deniz Tursun")
                    p_deniz = f"output/{due_raw}_{subject_name}_Deniz.pdf"
                    if html_deniz and create_one_page_pdf(page, html_deniz, p_deniz):
                        send_discord(make_info("Deniz Tursun"), p_deniz)

                    # 2. Bruno Lösung
                    html_bruno = generate_solution_html(subject_name, clean_topic, due_fmt, hw_text, iserv_mat, "Bruno")
                    p_bruno = f"output/{due_raw}_{subject_name}_Bruno.pdf"
                    if html_bruno and create_one_page_pdf(page, html_bruno, p_bruno):
                        send_discord(make_info("Bruno"), p_bruno)

                    # State aktualisieren
                    state["processed_hashes"].append(task_hash)
                    if hw_id not in state["processed_ids"]:
                        state["processed_ids"].append(hw_id)

                    # Lösungstext für Dashboard aufbereiten (Textversion)
                    soup_deniz = BeautifulSoup(html_deniz, "html.parser") if html_deniz else None
                    summary_text = soup_deniz.get_text(separator="\n").strip() if soup_deniz else "Lösung erstellt."

                    state["tasks_history"].append({
                        "id": hw_id,
                        "hash": task_hash,
                        "subject": subject_name,
                        "due_date": due_fmt,
                        "title": clean_topic,
                        "task_raw": hw_text,
                        "solution_summary": summary_text[:1200],
                        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    })
                    save_bot_state(state)

            finally:
                browser.close()

    except Exception as e:
        overall_status = "FEHLER"
        log(f"Kritischer Fehler im Hauptablauf: {e}", "ERROR")
        send_discord_error_alarm(str(e), context="Gesamtdurchlauf")

    # Run in History vermerken
    state.setdefault("runs_history", []).append({
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "OK" if overall_status == "ONLINE / OK" else "FEHLER",
        "new_tasks": new_tasks_count
    })
    save_bot_state(state)

    # 3. Verschlüsseltes Dashboard aktualisieren
    update_encrypted_dashboard(
        state,
        overall_status=overall_status,
        untis_ok=untis_ok,
        iserv_ok=iserv_ok,
        discord_ok=discord_ok,
        new_count=new_tasks_count
    )
    log("=== KRYPTONIUM CLOUD RUNNER BEENDET ===", "INFO")

if __name__ == "__main__":
    main()
