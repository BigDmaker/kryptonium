"""
Kryptonium 24/7 Cloud Assistant (GitHub Actions Edition)
Läuft rund um die Uhr kostenlos in der Cloud auf GitHub-Servern!
Schüler: Deniz Tursun (Klasse 10s & Bruno)
"""

import os
import sys
import json
import datetime
import requests
import urllib.parse
from bs4 import BeautifulSoup
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

# Konfiguration (wird aus config.json oder GitHub Secrets geladen)
CONFIG_FILE = "config.json"

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    # Fallback auf Environment Variables (GitHub Secrets)
    env_cfg = os.environ.get("CONFIG_JSON")
    if env_cfg:
        return json.loads(env_cfg)
    return {}

config = load_config()
WEBHOOK_URL = config.get("discord_webhook") or os.environ.get("DISCORD_WEBHOOK")
GEMINI_KEY = config.get("gemini_api_key") or os.environ.get("GEMINI_API_KEY")

PROCESSED_FILE = "processed_homeworks.json"

def load_processed():
    if os.path.exists(PROCESSED_FILE):
        try:
            with open(PROCESSED_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_processed(p_list):
    try:
        with open(PROCESSED_FILE, "w", encoding="utf-8") as f:
            json.dump(p_list, f, indent=2)
    except Exception as e:
        print(f"Fehler beim Speichern von processed_homeworks: {e}")

def send_discord(content, file_path=None):
    if not WEBHOOK_URL:
        print("[Discord] Kein Webhook konfiguriert!")
        return
    payload = {
        "username": "Kryptonium (24/7 Cloud)",
        "avatar_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&q=80",
        "content": content
    }
    if file_path and os.path.exists(file_path):
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "application/pdf")}
            r = requests.post(WEBHOOK_URL, data={"payload_json": json.dumps(payload)}, files=files, timeout=25)
            print(f"[Discord] Datei {os.path.basename(file_path)} gesendet: Status {r.status_code}")
    else:
        r = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        print(f"[Discord] Nachricht gesendet: Status {r.status_code}")

def create_one_page_pdf(page, html_content, output_pdf_path):
    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
    page.set_content(html_content, wait_until="load")
    # Playwright erzeugt direkt perfektes A4 PDF ohne Header/Footer
    page.pdf(
        path=output_pdf_path,
        format="A4",
        print_background=True,
        margin={"top": "16mm", "bottom": "16mm", "left": "18mm", "right": "18mm"}
    )
    if os.path.exists(output_pdf_path):
        reader = PdfReader(output_pdf_path)
        print(f"[PDF] {os.path.basename(output_pdf_path)} erstellt ({len(reader.pages)} Seite(n))")
        return len(reader.pages) == 1
    return False

# ==============================================================================
# ISERV READ-ONLY SCANNER
# ==============================================================================
def get_iserv_subject_material(page, subject_name, homework_text):
    iserv_cfg = config.get("iserv", {})
    server = iserv_cfg.get("server", "hg-gym.de")
    user = iserv_cfg.get("username")
    pw = iserv_cfg.get("password") or os.environ.get("ISERV_PASSWORD")

    subj_map = {
        "geschichte": "Geschichte", "ge": "Geschichte",
        "mathe": "Mathe", "mathematik": "Mathe", "ma": "Mathe",
        "spanisch": "Spanisch", "sn": "Spanisch", "spa": "Spanisch",
        "deutsch": "Deutsch", "de": "Deutsch",
        "physik": "Physik", "ph": "Physik"
    }
    folder_name = subj_map.get(subject_name.strip().lower())
    if not folder_name:
        return ""

    print(f"[IServ Cloud] Suche strikt nur im Ordner: Klasse 10s/{folder_name}")
    try:
        page.goto(f"https://{server}/iserv/app/login")
        page.fill('input[name="_username"]', user)
        page.fill('input[name="_password"]', pw)
        page.keyboard.press("Enter")
        page.wait_for_load_state("networkidle")

        encoded_folder = urllib.parse.quote(folder_name)
        folder_url = f"https://{server}/iserv/file/-/Groups/Klasse%2010s/{encoded_folder}"
        page.goto(folder_url)
        page.wait_for_load_state("networkidle")

        soup = BeautifulSoup(page.content(), "html.parser")
        files_to_download = []
        for a in soup.find_all("a", href=True):
            href = a.get("href")
            txt = a.get_text(strip=True)
            if f"/iserv/file/-/Groups/Klasse%2010s/{encoded_folder}/" in href and txt:
                if "?show=true" in href or href.endswith(".pdf"):
                    files_to_download.append((txt, f"https://{server}" + href.replace("?show=true", "")))

        os.makedirs("cache", exist_ok=True)
        extracted = []
        for fname, furl in files_to_download[:2]:
            resp = page.request.get(furl)
            if resp.status == 200:
                fpath = os.path.join("cache", "temp.pdf")
                with open(fpath, "wb") as f:
                    f.write(resp.body())
                reader = PdfReader(fpath)
                for idx, p in enumerate(reader.pages):
                    t = p.extract_text()
                    if t: extracted.append(f"[{fname} Seite {idx+1}]: {t[:800]}")
        return "\n\n".join(extracted)
    except Exception as e:
        print(f"[IServ] Fehler: {e}")
        return ""

# ==============================================================================
# LÖSUNGS-GENERATOR (FAULER SCHÜLER, KEINE KOMMAS)
# ==============================================================================
def generate_student_html(subject, topic, due_date, task_text, material, student_name="Deniz Tursun", variant_desc=""):
    prompt = f"""
Du bist {student_name}, ein fauler Schüler der 10. Klasse (10s) am Gymnasium.
Erstelle die schriftliche Hausaufgabe für {subject}. {variant_desc}
Aufgabe: {task_text}
Material: {material if material else "Keins"}

REGELN:
1. GANZ SCHLICHTES A4 BLATT wie in Word getippt. Absolut KEIN KI-Aussehen!
2. KEINE PUNKTE ODER STRICHE! Keine Aufzählungszeichen, keine Bullets, keine Gedankenstriche.
3. NIEMALS KOMMAS SETZEN! Kein einziges Komma im Text!
4. Tippfehler und flapsige Sprache einbauen (weill, kriese, das statt dass, auserdem).
5. Kopfzeile: {student_name}<br>Klasse 10s<br>{subject} Hausaufgabe {topic}
6. Exakt 1 A4 Seite. Schriftart Arial, @page {{ size: A4; margin: 18mm 20mm; }}.

Antworte NUR mit HTML-Code (<!DOCTYPE html> bis </html>).
"""
    models = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"]
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
                if html_code: break
        except Exception:
            pass

    if html_code:
        import re
        parts = re.split(r"(<[^>]+>)", html_code)
        for i in range(len(parts)):
            if not parts[i].startswith("<"):
                parts[i] = parts[i].replace(",", "")
        html_code = "".join(parts)
    return html_code

# ==============================================================================
# HAUPT-SYNCHRONISATION
# ==============================================================================
def main():
    print("=== KRYPTONIUM CLOUD RUNNER (24/7 GITHUB ACTIONS) ===")
    untis_cfg = config.get("untis", {})
    server = untis_cfg.get("server", "hainberg-gymnasium.webuntis.com")
    school = untis_cfg.get("school", "hainberg-gymnasium")
    user = untis_cfg.get("username")
    pw = untis_cfg.get("password") or os.environ.get("UNTIS_PASSWORD")

    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0"})
    s.post(f"https://{server}/WebUntis/jsonrpc.do?school={school}", json={
        "id": "1", "method": "authenticate", "params": {"user": user, "password": pw, "client": "KryptoniumCloud"}, "jsonrpc": "2.0"
    }, timeout=10)

    r_sub = s.post(f"https://{server}/WebUntis/jsonrpc.do?school={school}", json={
        "id": "2", "method": "getSubjects", "params": {}, "jsonrpc": "2.0"
    }, timeout=10)
    sub_map = {sb["id"]: sb["name"] for sb in r_sub.json().get("result", [])}

    today_str = datetime.date.today().strftime("%Y%m%d")
    next_week_str = (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y%m%d")
    r_hw = s.get(f"https://{server}/WebUntis/api/homeworks/lessons?startDate={today_str}&endDate={next_week_str}", timeout=10)
    hw_data = r_hw.json().get("data", {})
    homeworks = hw_data.get("homeworks", [])
    lessons = {l["id"]: l for l in hw_data.get("lessons", [])}

    print(f"[Untis] Gefundene Aufgaben für diese Woche: {len(homeworks)}")
    processed = load_processed()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for hw in homeworks:
            hw_id = hw.get("id")
            if hw_id in processed:
                print(f"Aufgabe {hw_id} bereits erledigt.")
                continue

            hw_text = hw.get("text", "")
            due_raw = str(hw.get("dueDate"))
            due_fmt = f"{due_raw[6:8]}.{due_raw[4:6]}.{due_raw[:4]}"
            lesson = lessons.get(hw.get("lessonId"), {})
            subject_name = sub_map.get(lesson.get("subjectId"), "Hausaufgabe")
            clean_topic = hw_text.split("\n")[0][:40]

            print(f"\n--- Bearbeite neue Aufgabe: {subject_name} ({due_fmt}) ---")
            iserv_mat = get_iserv_subject_material(page, subject_name, hw_text)

            # 1. Deniz Variante 1
            h1 = generate_student_html(subject_name, clean_topic, due_fmt, hw_text, iserv_mat, "Deniz Tursun", "Variante 1")
            p1 = f"output/{due_raw}_{subject_name}_Deniz_Var1.pdf"
            if h1 and create_one_page_pdf(page, h1, p1):
                send_discord(f"**[Cloud 24/7 &bull; Deniz Var 1] {subject_name}** (Fällig: {due_fmt})", p1)

            # 2. Deniz Variante 2
            h2 = generate_student_html(subject_name, clean_topic, due_fmt, hw_text, iserv_mat, "Deniz Tursun", "Variante 2 andere Worte")
            p2 = f"output/{due_raw}_{subject_name}_Deniz_Var2.pdf"
            if h2 and create_one_page_pdf(page, h2, p2):
                send_discord(f"**[Cloud 24/7 &bull; Deniz Var 2] {subject_name}** (Fällig: {due_fmt})", p2)

            # 3. Bruno
            h3 = generate_student_html(subject_name, clean_topic, due_fmt, hw_text, iserv_mat, "Bruno", "Eigener Schüler Bruno")
            p3 = f"output/{due_raw}_{subject_name}_Bruno.pdf"
            if h3 and create_one_page_pdf(page, h3, p3):
                send_discord(f"**[Cloud 24/7 &bull; FÜR BRUNO] {subject_name}** (Fällig: {due_fmt})", p3)

            processed.append(hw_id)
            save_processed(processed)

        browser.close()

if __name__ == "__main__":
    main()
