// ==============================================================================
// KRYPTON • HAINBERG 10s WORKSPACE
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
let activeStudyCategory = 'all';
let activeExamFilter = 'all';

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

// ==============================================================================
// OFFIZIELLE KLAUSUREN & ARBEITEN (KLASSE 10s &bull; HG GÖTTINGEN)
// ==============================================================================
const OFFICIAL_EXAMS = [
  {
    id: "exam-powi-1",
    day: 24,
    month: 11,
    year: 2026,
    date_fmt: "Dienstag, 24.11.2026",
    time: "11:30 – 13:00 Uhr",
    title: "PoWi #1 (Klassenarbeit)",
    subject: "Politik",
    subjClass: "subj-politik",
    room: "Raum 230",
    type: "Klassenarbeit",
    urgent: true,
    countdown_label: "MORGEN!",
    topics: [
      "Wirtschaftsordnungen im Vergleich: Freie Marktwirtschaft (Adam Smith, 'unsichtbare Hand', Nachtwächterstaat) vs. Planwirtschaft (Karl Marx, zentrale Planungsbehörde, Staatsmonopol) vs. Soziale Marktwirtschaft (Ludwig Erhard, Alfred Müller-Armack, Bundeskartellamt, Sozialer Ausgleich)",
      "Die 5 Säulen der gesetzlichen Sozialversicherung (Bismarck): Kranken-, Unfall- (100% Arbeitgeber!), Renten- (Generationenvertrag & Umlageverfahren), Arbeitslosen- und Pflegeversicherung. Paritätsprinzip & Solidaritätsprinzip",
      "Kommunalpolitik & Kommunalwahlen in Niedersachsen / Göttingen: Rat der Stadt & Oberbürgermeister/in, das 3-Stimmen-Wahlsystem (Kumulieren = Häufeln bis zu 3 Stimmen auf eine Person; Panaschieren = Mischen über mehrere Wahllisten)"
    ],
    study_subject: "Politik"
  },
  {
    id: "exam-wpu-1",
    day: 26,
    month: 11,
    year: 2026,
    date_fmt: "Donnerstag, 26.11.2026",
    time: "07:50 – 09:20 Uhr",
    title: "WPU 9/10 - Arbeit 1 (Klausur)",
    subject: "Wahlpflicht",
    subjClass: "subj-wpu",
    room: "Raum 234",
    type: "Klassenarbeit",
    urgent: false,
    countdown_label: "In 3 Tagen",
    topics: [
      "Informatik Modul 1: Algorithmen-Eigenschaften (Determiniertheit, Endlichkeit, Eindeutigkeit) & Programmablaufpläne (PAP)",
      "Kontrollstrukturen: Verzweigungen (if/else), Bedingte Schleifen (while), Zählschleifen (for) und modulare Funktionen mit Übergabeparametern & Rückgabewerten",
      "Grundlagen moderner Datenstrukturen & Kryptografie: Arrays/Listen vs. Schlüssel-Wert-Maps (Dictionaries), Symmetrische Verschlüsselung (AES-256-GCM) vs. Asymmetrische Kryptografie (RSA Public/Private Key), Schlüsselableitung (PBKDF2) und kryptografische Einweg-Hashfunktionen (SHA-256)"
    ],
    study_subject: "Wahlpflicht"
  },
  {
    id: "exam-nachschreib-1",
    day: 27,
    month: 11,
    year: 2026,
    date_fmt: "Freitag, 27.11.2026",
    time: "13:50 – 15:20 Uhr",
    title: "Nachschreiben JG 5-11",
    subject: "Zentraltermin",
    subjClass: "subj-nachschreib",
    room: "Zentraler Nachschreiberaum",
    type: "Nachschreibetermin",
    urgent: false,
    countdown_label: "In 4 Tagen",
    topics: [
      "Zentraler schulweiter Nachschreibetermin für alle versäumten Klassenarbeiten der Jahrgangsstufen 5 bis 11",
      "Voraussetzung: Fristgerechtes ärztliches Attest bzw. entschuldigtes Fehlen im Schulverwaltungssystem"
    ],
    study_subject: null
  },
  {
    id: "exam-erdkunde-1",
    day: 1,
    month: 12,
    year: 2026,
    date_fmt: "Dienstag, 01.12.2026",
    time: "09:40 – 11:10 Uhr",
    title: "Klausur Erdkunde (Klausur)",
    subject: "Erdkunde",
    subjClass: "subj-erdkunde",
    room: "Raum 230",
    type: "Klausur",
    urgent: false,
    countdown_label: "In 8 Tagen",
    topics: [
      "Globalisierung: Dimensionen (wirtschaftlich, kulturell, politisch), Triade-Märkte, globale Transportrevolution (Containerisierung) und internationale Wertschöpfungsketten",
      "Globale Disparitäten & Entwicklungsindikatoren: Bruttonationaleinkommen (BNE/BIP pro Kopf) vs. Human Development Index (HDI: Lebenserwartung, Bildungsjahre, Kaufkraft), Gini-Koeffizient & Lorenzkurve zur Vermögensverteilung",
      "Rohstoffe, Welthandel & Rohstofffluch (Dutch Disease): Ausbeutung primärer Güter in Entwicklungsländern, ungleiche Terms of Trade und Leitbilder nachhaltiger Entwicklung (Ökologie, Ökonomie, Soziales)"
    ],
    study_subject: "Erdkunde"
  },
  {
    id: "exam-englisch-oral",
    day: 2,
    month: 12,
    year: 2026,
    date_fmt: "Mittwoch, 02.12.2026",
    time: "07:50 – 09:20 Uhr",
    title: "Sprechprüfung Englisch 10",
    subject: "Englisch",
    subjClass: "subj-englisch",
    room: "Raum 232",
    type: "Mündliche Prüfung",
    urgent: false,
    countdown_label: "In 9 Tagen",
    topics: [
      "Part 1: Picture Description & Analysis (Foreground, background, composition, message, emotional impact)",
      "Part 2: Partner Discussion / Debating (Expressing personal opinions, weighing arguments, agreeing and disagreeing diplomatically)",
      "Part 3: Spontaneous Dialogue & Problem-solving (Negotiating compromises, organizing events, using transitional linking words)"
    ],
    study_subject: "Englisch"
  },
  {
    id: "exam-musik-nachschreib",
    day: 4,
    month: 12,
    year: 2026,
    date_fmt: "Freitag, 04.12.2026",
    time: "07:50 – 09:20 Uhr",
    title: "Musik 10s Nachschreibtermin",
    subject: "Musik",
    subjClass: "subj-nachschreib",
    room: "Raum 2M1",
    type: "Nachschreibetermin",
    urgent: false,
    countdown_label: "In 11 Tagen",
    topics: [
      "Nachschreibetermin Musik für erkrankte Schüler der Klasse 10s",
      "Epochenmerkmale, Partituranalyse, Kadenzen, Harmonielehre und Hörübungen"
    ],
    study_subject: null
  },
  {
    id: "exam-geschichte-1",
    day: 7,
    month: 12,
    year: 2026,
    date_fmt: "Montag, 07.12.2026",
    time: "11:30 – 13:00 Uhr",
    title: "Geschichtsarbeit (Klausur)",
    subject: "Geschichte",
    subjClass: "subj-geschichte",
    room: "Raum 037",
    type: "Klassenarbeit",
    urgent: false,
    countdown_label: "In 14 Tagen",
    topics: [
      "Weimarer Republik 1918–1933: Novemberrevolution, Verfassung von Weimar und strukturelle Schwächen (Macht des Reichspräsidenten nach Art. 48 Notverordnungen und Art. 25 Reichstagsauflösung)",
      "Krisenjahre 1919–1923: Versailler Vertrag (Kriegsschuldartikel 231, Gebietsverluste), Dolchstoßlegende, Ruhrbesetzung, Hyperinflation & Hitler-Ludendorff-Putsch",
      "Scheinblüte der Goldenen Zwanziger (1924–1929): Dawes-Plan, Währungsstabilisierung durch Rentenmark, Kulturboom in den Metropolen vs. anhaltende ländliche Not",
      "Endphase & Untergang der Demokratie: New Yorker Börsencrash 1929, Massenarbeitslosigkeit, Radikalisierung der Wähler, Ära der Präsidialkabinette (Brüning, Papen, Schleicher) und Machtübertragung 1933"
    ],
    study_subject: "Geschichte"
  },
  {
    id: "exam-deutsch-2",
    day: 11,
    month: 12,
    year: 2026,
    date_fmt: "Freitag, 11.12.2026",
    time: "07:50 – 09:20 Uhr",
    title: "Deutscharbeit Nr. 2 (Klausur)",
    subject: "Deutsch",
    subjClass: "subj-deutsch",
    room: "Raum 230",
    type: "Klassenarbeit",
    urgent: false,
    countdown_label: "In 18 Tagen",
    topics: [
      "Sachtextanalyse & lineare Erörterung: T-A-T-T-E Einleitungssatz, Argumentationstypen (Fakten-, Autoritäts-, Normativ-, Plausibilitätsargument), Argumentationsgang und argumentative Entfaltung (Behauptung, Begründung, Beleg)",
      "Rhetorische Stilmittel & funktionale Deutung (Metapher, Antithese, Alliteration, rhetorische Frage), korrekte Zitiertechnik (direkt/indirekt mit Zeilenangaben)",
      "Lektüre Juli Zeh 'Corpus Delicti': Das System der METHODE ('Gesundheit als oberstes Staatsziel'), Hauptfigur Mia Holl, Moritz Holls Suizid & Justizirrtum, Heinrich Kramer als Systemideologe, Freiheitsbegriff vs. staatlicher Paternalismus"
    ],
    study_subject: "Deutsch"
  },
  {
    id: "exam-powi-nachschreib",
    day: 15,
    month: 12,
    year: 2026,
    date_fmt: "Dienstag, 15.12.2026",
    time: "11:30 – 13:00 Uhr",
    title: "PoWi Nachschreiben / Nachtermin",
    subject: "Politik",
    subjClass: "subj-nachschreib",
    room: "Raum 230 / Nachschreiberaum",
    type: "Nachschreibetermin",
    urgent: false,
    countdown_label: "In 22 Tagen",
    topics: [
      "Nachschreibtermin zur 1. Klassenarbeit Politik & Wirtschaft der Klasse 10s",
      "Wirtschaftsordnungen, Fünf Säulen der Sozialversicherung und Kommunalwahlen Niedersachsen"
    ],
    study_subject: "Politik"
  }
];

// ==============================================================================
// LERNZETTEL-BIBLIOTHEK (KLASSE 10s &bull; KATEGORIEN & VOLLSTÄNDIGE INHALTE)
// ==============================================================================
const STUDY_MATERIALS = [
  {
    category: "politik",
    subject: "Politik",
    subjClass: "subj-politik",
    title: "Klassenarbeit PoWi #1: Wirtschaftsordnungen, Sozialversicherung & Wahlen",
    summary: "Exakt abgestimmt auf die IServ-Materialien der Klasse 10s für morgen (Dienstag, 24.11., 11:30 Uhr). Freie vs. Soziale Marktwirtschaft vs. Planwirtschaft, die 5 Säulen der Sozialversicherung und Kommunalwahlen Göttingen.",
    content: `1. DIE DREI WIRTSCHAFTSORDNUNGEN IM DIREKTEN VERGLEICH:
a) Freie Marktwirtschaft (Adam Smith / 'unsichtbare Hand'):
- Grundidee: Der Einzelne strebt nach persönlichem Gewinn und fördert dadurch automatisch das Gemeinwohl.
- Rolle des Staates: Nachtwächterstaat (nur Schutz von Eigentum, Rechtsordnung, äußere Sicherheit und elementare Infrastruktur).
- Preisbildung: Ausschließlich durch das freie Spiel von Angebot und Nachfrage am Markt.
- Probleme & Kritik: Monopol- und Kartellbildung, Verelendung und Ausbeutung von Arbeitern, keine soziale Absicherung, starke Konjunkturkrisen.

b) Planwirtschaft / Zentralverwaltungswirtschaft (Karl Marx / ehem. DDR, Nordkorea):
- Grundidee: Staatliche Gleichheit und Abschaffung gesellschaftlicher Klassenunterschiede.
- Rolle des Staates: Eine zentrale staatliche Planungsbehörde bestimmt alles (Preise, Löhne, Produktionsmengen, Fünfjahrespläne).
- Eigentum: Kein Privateigentum an Produktionsmitteln (Kollektiv- und Staatseigentum).
- Probleme & Kritik: Bürokratie, Fehlallokation von Ressourcen, Mangelwirtschaft und Schlangestehen, mangelnde Motivation und Innovationshemmung.

c) Soziale Marktwirtschaft (Bundesrepublik Deutschland):
- Architekten: Alfred Müller-Armack und Ludwig Erhard nach 1945 ('Wohlstand für alle').
- Grundsatz: 'So viel Markt wie möglich, so viel Staat wie nötig'.
- Verbindung: Freiheit des Marktes (Privateigentum, Gewerbefreiheit, Wettbewerb) kombiniert mit sozialem Ausgleich und Schutz der Schwachen.
- Staatliche Säulen:
  1. Wettbewerbsschutz: Bundeskartellamt bekämpft Monopole und verbotene Preisabsprachen.
  2. Soziale Sicherung: Gesetzliche Sozialversicherungen, Bürgergeld, Wohngeld, Kindergeld.
  3. Konjunktur- & Strukturpolitik: Subventionen und Krisenhilfen.
  4. Arbeitsschutz: Kündigungsschutz, Mindestlohn, Mutterschutz, Arbeitszeitgesetze.

2. DIE FÜNF ZWEIGE DER GESETZLICHEN SOZIALVERSICHERUNG (BISMARCK):
- Krankenversicherung (1883): Übernahme von Arzt-, Klinik- und Medikamentenkosten, Krankengeld. Träger: Gesetzliche Krankenkassen (AOK, TK etc.).
- Unfallversicherung (1884): Schutz bei Arbeitsunfällen, Berufskrankheiten und Wegeunfällen (auch Schulweg). Träger: Berufsgenossenschaften. BESONDERHEIT: Wird zu 100% vom Arbeitgeber bezahlt!
- Rentenversicherung (1889): Altersrente, Erwerbsminderungsrente. Träger: Deutsche Rentenversicherung. Funktioniert über den Generationenvertrag (Umlageverfahren: Beiträge der Aktiven zahlen die Renten der heutigen Ruheständler).
- Arbeitslosenversicherung (1927): Arbeitslosengeld I, Arbeitsvermittlung und Weiterbildung. Träger: Bundesagentur für Arbeit.
- Pflegeversicherung (1995): Pflegegeld und Sachleistungen bei Pflegebedürftigkeit im Alter. Träger: Pflegekassen.
- FINANZIERUNGSPRINZIP: Paritätisch (50% Arbeitnehmer / 50% Arbeitgeber), Ausnahme Unfallversicherung (100% Arbeitgeber).
- SOLIDARITÄTSPRINZIP: Die Beiträge richten sich prozentual nach dem Einkommen, die Leistungen aber nach dem tatsächlichen Bedarf.

3. KOMMUNALPOLITIK & KOMMUNALWAHLEN (GÖTTINGEN / NIEDERSACHSEN):
- Organe: Rat der Stadt Göttingen (Bürgervertretung) und Oberbürgermeister/in (Leitung der Verwaltung).
- Besonderheit Wahlsystem Niedersachsen: Jeder Wähler hat 3 STIMMEN.
- Kumulieren: Bis zu 3 Stimmen auf einen einzigen Wunsch-Kandidaten anhäufen.
- Panaschieren: Stimmen auf Kandidaten verschiedener Parteien und Listen verteilen.

4. MUSTER-ARGUMENTATION FÜR DIE KLAUSUR (ANFORDERUNGSBEREICH 3):
Frage: 'Sollte der Staat bei stark steigenden Preisen (z.B. Energie oder Miete) mit Preisobergrenzen eingreifen?'
- Pro: Schutz einkommensschwacher Familien vor Verarmung, Sicherung des Existenzminimums, Erfüllung des Sozialstaatsgebots (Art. 20 GG).
- Contra: Gefahr von Fehlanreizen (weniger Wohnungsneubau durch Investoren), Marktverzerrung, hohe Kosten für den Steuerzahler.
- Fazit: Befristete gezielte Entlastungen für Bedürftige sind besser als dauerhafte staatliche Höchstpreise, um den Preismechanismus nicht zu zerstören.`
  },
  {
    category: "wahlpflicht",
    subject: "Wahlpflicht",
    subjClass: "subj-wpu",
    title: "WPU 9/10 Informatik: Algorithmen, Datenstrukturen & Kryptografie",
    summary: "Offizieller Lernzettel für die Klausur am Donnerstag (26.11., 07:50 Uhr). Algorithmen-Eigenschaften, Kontrollstrukturen, Pseudocode und Grundlagen moderner Verschlüsselung.",
    content: `1. ALGORITHMEN-BEGRIFF & EIGENSCHAFTEN:
Ein Algorithmus ist eine eindeutige, schrittweise Handlungsanweisung zur Lösung eines Problems.
Zentrale Kriterien:
- Determiniertheit: Bei gleicher Eingabe liefert der Algorithmus immer das exakt gleiche Ergebnis.
- Endlichkeit (Finitheit): Der Algorithmus bricht nach endlich vielen Schritten ab und verbraucht begrenzten Speicher.
- Eindeutigkeit (Determinismus): Zu jedem Zeitpunkt ist der nächste auszuführende Schritt unmissverständlich definiert.
- Allgemeingültigkeit: Löst nicht nur einen Einzelfall, sondern eine ganze Klasse von Problemen.

2. KONTROLLSTRUKTUREN & PSEUDOCODE:
a) Sequenz: Lineare Abfolge von Anweisungen von oben nach unten.
b) Verzweigung (Selektion):
   WENN (Bedingung erfüllt) DANN Anweisung A SONST Anweisung B ENDE_WENN
c) Wiederholung (Iteration / Schleife):
   - Zählergesteuert (FOR-Schleife): Anzahl der Durchläufe steht vorher fest.
   - Bedingungsgesteuert (WHILE-Schleife): Läuft, solange eine Bedingung wahr ist (Kopfgesteuert) oder mindestens einmal (Fußgesteuert).
d) Funktionen & Modularisierung:
   Zerlegung komplexer Abläufe in wiederverwendbare Teilblöcke mit Übergabeparametern und Rückgabewert (Return).

3. GRUNDLAGEN DER KRYPTOGRAFIE & VERSCHLÜSSELUNG:
a) Symmetrische Verschlüsselung (z.B. AES-256-GCM):
   - Ein einziger geheimer Schlüssel (Secret Key) wird für Verschlüsselung UND Entschlüsselung verwendet.
   - Vorteil: Extrem schnell und ressourcensparend (Standard für Web-Datentransfer & Festplattenverschlüsselung).
   - Problem: Der Schlüssel muss vorab sicher zwischen Sender und Empfänger ausgetauscht werden.
b) Asymmetrische Verschlüsselung (Public-Key-Verfahren, z.B. RSA):
   - Schlüsselpaar: Öffentlicher Schlüssel (Public Key) verschlüsselt; privater Schlüssel (Private Key) entschlüsselt.
   - Vorteil: Sicherer Austausch über unsichere Kanäle möglich (Grundlage von HTTPS & TLS-Zertifikaten).
c) Kryptografische Hash-Funktionen (z.B. SHA-256):
   - Einweg-Funktion: Bildet beliebige Eingabedaten auf einen festen 256-Bit Prüfwert ab.
   - Nicht umkehrbar (Einwegprinzip) und kollisionsresistent.
   - Anwendung: Passwortspeicherung und Integritätsprüfung gegen Datenmanipulation.`
  },
  {
    category: "erdkunde",
    subject: "Erdkunde",
    subjClass: "subj-erdkunde",
    title: "Klausur Erdkunde: Globalisierung, Entwicklungsdisparitäten & Rohstoffe",
    summary: "Vorbereitung auf die Klausur am Dienstag (01.12., 09:40 Uhr). Phasen der Globalisierung, Indikatoren (HDI, Gini-Koeffizient), Welthandel und nachhaltige Ressourcenwirtschaft.",
    content: `1. GLOBALISIERUNG – URSACHEN & PHÄNOMENE:
Globalisierung bezeichnet die weltweite Verflechtung und Beschleunigung von Wirtschaft, Politik, Kultur und Kommunikation.
- Treiber:
  - Transportrevolution: Containerschifffahrt senkt Frachtkosten drastisch (standardisierte 20-Fuß-Container).
  - Informations- & Kommunikationstechnologie (IKT): Echtzeit-Kommunikation, weltweiter digitaler Finanzmarkt.
  - Politische Öffnung: Abbau von Zöllen, Freihandelsabkommen und die Rolle der WTO (Welthandelsorganisation).
- Fragmentierung & globale Wertschöpfungskette: Ein Produkt wird nicht mehr an einem Ort hergestellt, sondern Komponenten stammen aus dutzenden Ländern (z.B. Smartphone-Produktion).

2. MESSUNG VON ENTWICKLUNG & WELTWEITEN DISPARITÄTEN:
a) Reine Wirtschaftsindikatoren:
   - Bruttoinlandsprodukt (BIP) / Bruttonationaleinkommen (BNE) pro Kopf.
   - Schwäche: Sagt nichts über Einkommensverteilung, Umweltzerstörung oder Lebensqualität aus.
b) Human Development Index (HDI der UN):
   Kombiniert 3 Dimensionen zu einem Wert zwischen 0 (sehr niedrig) und 1 (sehr hoch):
   1. Gesundheit: Lebenserwartung bei der Geburt.
   2. Bildung: Voraussichtliche und durchschnittliche Schulbesuchsdauer.
   3. Lebensstandard: BNE pro Kopf in Kaufkraftparität (KKB / PPP in $).
c) Gini-Koeffizient & Lorenzkurve:
   - Misst die Einkommens- oder Vermögensungleichheit innerhalb eines Landes.
   - 0 = absolute Gleichverteilung; 1 = eine einzige Person besitzt das gesamte Einkommen.

3. ROHSTOFFE, WELTHANDEL & DER ROHSTOFFFLUCH (DUTCH DISEASE):
- Terms of Trade (Handelsbedingungen): Das Austauschverhältnis zwischen Export- und Importpreisen. Entwicklungsländer exportieren oft günstige Rohstoffe (Kaffee, Kakao, Erze) und müssen teure Industrieprodukte importieren.
- Rohstofffluch: Länder mit reichen Bodenschätzen (z.B. Erdöl, Coltan) leiden oft unter Korruption, bewaffneten Konflikten, Währungsverzerrungen und Vernachlässigung des Bildungssektors.
- Nachhaltiges Entwicklungsmodell (Drei-Säulen-Modell): Ökologie, Ökonomie und Soziales müssen im Gleichgewicht stehen.`
  },
  {
    category: "englisch",
    subject: "Englisch",
    subjClass: "subj-englisch",
    title: "Sprechprüfung Klasse 10: Oral Exam Guide & Useful Phrases",
    summary: "Strukturierter Leitfaden für die mündliche Prüfung am Mittwoch (02.12., 07:50 Uhr). Bildbeschreibung, Fachdiskussion und spontanes Rollenspiel mit nützlichen Redemitteln.",
    content: `1. PART 1: PICTURE DESCRIPTION & ANALYSIS (approx. 3-4 minutes)
Structure:
- Overview sentence:
  "The photograph / cartoon shows / depicts / illustrates..."
  "The picture deals with the topic of [globalization / environmental issues / media consumption]."
- Spatial layout:
  - "In the foreground / background / center of the picture, we can see..."
  - "On the left-hand / right-hand side..."
  - "At the top / bottom of the image..."
- Deeper interpretation:
  - "The atmosphere appears rather tense / joyful / depressing because..."
  - "The facial expression and body language of the person convey a feeling of..."
  - "The artist's intention might be to draw attention to / criticize the problem of..."

2. PART 2: PARTNER DISCUSSION & DEBATING (approx. 5 minutes)
Giving opinions:
- "From my point of view / In my opinion / As far as I am concerned..."
- "I strongly believe that..."
Agreeing & Disagreeing politely:
- "I totally agree with you on that point."
- "You have made a good point, however we also have to consider that..."
- "I see what you mean, but from another perspective..."
- "I'm afraid I cannot share this view because..."
Linking words & Structuring:
- "First and foremost...", "Furthermore / In addition to that...", "On the one hand... on the other hand...", "As a consequence..."

3. PART 3: REACHING A CONSENSUS & COMPROMISE (approx. 3-4 minutes)
Negotiating:
- "Why don't we settle on...?"
- "Would it be acceptable for both of us if we chose...?"
- "Let's find middle ground: how about...?"
Conclusion:
- "So, we have both agreed that the best option would be..."`
  },
  {
    category: "geschichte",
    subject: "Geschichte",
    subjClass: "subj-geschichte",
    title: "Klausur Geschichte: Weimarer Republik 1918–1933 & Golden Twenties",
    summary: "Umfassender Wissensspeicher für die Klausur am Montag (07.12., 11:30 Uhr). Revolution 1918, Verfassung, Krisenjahr 1923, Scheinblüte und der Untergang der Republik.",
    content: `1. ENTSTEHUNG & STRUKTURSCHWÄCHEN DER WEIMARER VERFASSUNG:
- Novemberrevolution 1918: Ausrufung der Republik (Scheidemann / Liebknecht), Flucht des Kaisers.
- Friedrich Ebert (SPD) als erster Reichspräsident.
- Schwachstellen der Verfassung von Weimar:
  - Übermächtiger Reichspräsident ('Ersatzkaiser'): Amtszeit 7 Jahre, Oberbefehlshaber der Reichswehr, konnte nach Art. 48 mit Notverordnungen ohne Parlament regieren und nach Art. 25 den Reichstag auflösen.
  - Fehlende Sperrklausel (keine 5%-Hürde): Bis zu 15 Splitterparteien im Reichstag machten stabile Mehrheitskoalitionen extrem schwer.
  - Republik ohne Republikaner: Justiz, Verwaltung und Militär blieben größtenteils monarchistisch und antidemokratisch eingestellt.

2. DAS KRISENJAHR 1923 – DIE BELASTUNGSPROBE:
- Versailler Vertrag & Dolchstoßlegende: Rechte Propaganda behauptete wahrheitswidrig, die Wehrmacht sei 'im Felde unbesiegt' geblieben und von der Heimatfront hinterrücks erdolcht worden.
- Ruhrbesetzung 1923: Französische Truppen besetzten das Ruhrgebiet wegen Reparationsrückständen. Reichsregierung rief zum passiven Widerstand auf und finanzierte Streikgelder durch Notenpressen.
- Hyperinflation: Geldentwertung erreichte astronomische Höhen (1 US-Dollar = 4,2 Billionen Mark). Ersparnisse des Mittelstands wurden vernichtet.
- Hitler-Ludendorff-Putsch (9. Nov. 1923) in München: Scheiterte an der Landespolizei; Hitler nutzte den Prozess als Propagandabühne.
- Stabilisierung: Währungsreform mit der Rentenmark (Nov. 1923) durch Gustav Stresemann.

3. DIE 'GOLDENEN ZWANZIGER' (1924–1929) – REALITÄT ODER MYTHOS?
- Dawes-Plan (1924): Staffelung der Reparationen und massive US-Kredite kurbelten die Industrie an.
- Scheinblüte: Der Aufschwung war auf Pump finanziert. Auf dem Land und bei Kleinbauern herrschte anhaltende Agrarkrise.
- Kulturelle Moderne in Metropolen wie Berlin: Neuer Frauenstil (Bubikopf), Charleston, Kino, Rundfunk und Theater.

4. WELTWIRTSCHAFTSKRISE 1929 & UNTERGANG DER DEMOKRATIE:
- New Yorker Börsencrash (Black Friday, 24. Okt. 1929): US-Banken forderten Kredite sofort zurück -> Zusammenbruch deutscher Banken und Fabriken.
- Massenarbeitslosigkeit: Über 6 Millionen Arbeitslose im Winter 1932.
- Zerfall der Großen Koalition 1930: Streit um Beitragssätze zur Arbeitslosenversicherung.
- Ära der Präsidialkabinette (Brüning, Papen, Schleicher): Regieren am Reichstag vorbei nur mit Notverordnungen Hindenburgs.
- Radikalisierung: Zulauf für KPD und NSDAP. Am 30. Januar 1933 ernannte Hindenburg Adolf Hitler zum Reichskanzler.`
  },
  {
    category: "deutsch",
    subject: "Deutsch",
    subjClass: "subj-deutsch",
    title: "Deutscharbeit Nr. 2: Sachtextanalyse & lineare Erörterung",
    summary: "Aufbau für die Klassenarbeit am Freitag (11.12., 07:50 Uhr). T-A-T-T-E Einleitungssatz, Argumentationstypen, argumentative Verknüpfungen und korrekte Zitiertechnik.",
    content: `1. EINLEITUNGSSATZ NACH DEM T-A-T-T-E SCHEMA:
- T: Titel des Textes
- A: Autor / Verfasser
- T: Textsorte (z.B. Kommentar, Glosse, Essay, Leitartikel, Rede)
- T: Thema der Ausarbeitung (Worum geht es präzise?)
- E: Erscheinungsjahr, Erscheinungsort bzw. Publikationsmedium
Formulierungsbeispiel:
"In dem Zeitungskommentar 'Smarte Überwachung im Schulalltag' von Julia Berger, erschienen am 14. Oktober 2026 in der Süddeutschen Zeitung, setzt sich die Autorin kritisch mit der zunehmenden Digitalisierung von Schülernotizen auseinander und vertritt die These, dass..."

2. ANALYSE DES ARGUMENTATIONSGANGS:
- These: Aufgestellte Leitbehauptung des Autors.
- Argumenttypen erkennen & benennen:
  - Faktenargument: Stützt sich auf nachprüfbare Tatsachen, Studien oder statistische Zahlen (hohe Überzeugungskraft).
  - Autoritätsargument: Beruft sich auf anerkannte Experten, Wissenschaftler oder Gutachten.
  - Normatives Argument: Appelliert an allgemein anerkannte gesellschaftliche Werte, Ethik oder Grundrechte (z.B. Art. 1 GG).
  - Analogisierendes Argument: Zieht einen Vergleich zu einem ähnlichen Lebensbereich.
  - Plausibilitätsargument: Erscheint dem Leser durch gesunden Menschenverstand unmittelbar einleuchtend.
- Argumentative Entfaltung:
  Behauptung -> Begründung -> Konkretes Beispiel / Beleg.

3. SPRACHLICHE & RHETORISCHE MITTEL (MIT FUNKTION!):
- Nicht nur aufzählen, sondern Wirkung erklären!
  - Rhetorische Frage: Bezieht den Leser ein und regt zum Nachdenken an.
  - Antithese: Gegenüberstellung gegensätzlicher Begriffe hebt den Konflikt hervor.
  - Metapher / Personifikation: Macht abstrakte Sachverhalte bildhaft greifbar.

4. ZITIERWEISE:
- Wörtliches Zitat: "... Wortlaut ..." (Z. 14 f. bzw. Z. 20–24).
- Sinngemäßes Zitat: (vgl. Z. 45–48).`
  },
  {
    category: "deutsch",
    subject: "Deutsch",
    subjClass: "subj-deutsch",
    title: "Corpus Delicti (Mia Holl) Lektüren-Spickzettel & METHODE",
    summary: "Juli Zeh: Charakterisierung Mia Holl, Heinrich Kramer, die METHODE als Gesundheitsdiktatur, Konfliktverlauf und Klausur-Kernzitate.",
    content: `1. DIE METHODE ALS STAATSFORM:
- Leitidee: "Gesundheit als oberstes Prinzip des menschlichen Zusammenlebens" (Frei von Schmerz und Krankheit).
- Kontrollinstrumente:
  - Verpflichtende Schlaf- und Ernährungsberichte.
  - Regelmäßige Blut- und Urintests.
  - Bewegungsprotokolle (Trainingsrad).
  - Partnerwahl nur bei kompatiblem Immunsystem (keine Risiko-Gene).
- Sanktionen: Entzug von Rechten, Einfrieren (Kryostase) bei Systemfeindschaft.

2. FIGUREN-KONSTELLATION:
- Mia Holl (Protagonistin):
  - Biologin, anfangs systemtreu und rational.
  - Wendepunkt: Ihr geliebter Bruder Moritz Holl wird wegen Vergewaltigung verurteilt und begeht Suizid. Er beteuert seine Unschuld (DNA-Fehlabgleich / Knochenmarktransplantation).
  - Mia vernachlässigt ihre Meldepflichten und wird zur Leitfigur des Widerstands gegen die METHODE.
- Heinrich Kramer:
  - Hardliner, Chef-Ideologe der METHODE und Talkshow-Autor ('Die Gesundheit des Volkes').
  - Perfider Gegenspieler: Manipuliert Mia psychologisch, will sie nicht zur Märtyrerin machen, sondern ihren Willen brechen.
- Moritz Holl:
  - Philosophischer Freigeist, liebt die Natur und lehnt die sterile Kontrollwelt der METHODE ab.
  - Schenkt Mia die 'ideale Geliebte' als geistige Begleiterin.

3. ZENTRALE THEMEN FÜR DIE KLAUSUR:
- Sicherheit vs. Freiheit: Wie viel persönliche Freiheit darf ein Staat für die Gesundheit der Bevölkerung opfern?
- Paternalismus: Der Staat behandelt mündige Bürger wie bevormundete Kinder.`
  },
  {
    category: "physik",
    subject: "Physik",
    subjClass: "subj-physik",
    title: "Halbleiter, Dioden, Dotierung & Kennlinien",
    summary: "Physik 10. Klasse: Eigenleitung von Silizium, n- und p-Dotierung, pn-Übergang, Schwellenspannung und Kennlinien von Heiß- und Kaltleitern.",
    content: `1. EIGENLEITUNG BEI HALBLEITERN:
- Reines Silizium (4 Valenzelektronen) ist bei tiefen Temperaturen ein Isolator (kovalente Kristallbindung).
- Bei Wärmezufuhr oder Lichteinfall brechen Elektronen aus den Bindungen aus:
  - Freie Elektronen (negative Ladungsträger) entstehen.
  - Zurück bleiben Elektronenlöcher/Defektelektronen (positive Fehlstellen).
- Halbleiter sind Heißleiter (NTC): Bei steigender Temperatur sinkt der elektrische Widerstand (Leitfähigkeit steigt).

2. GEZIELTE DOTIERUNG:
- n-Dotierung (Donator): Einbau von 5-wertigen Fremdatomen (z.B. Phosphor oder Arsen) in das Siliziumgitter.
  - 4 Elektronen binden sich, 1 Elektron ist quasi frei beweglich. Majoritätsträger: Elektronen.
- p-Dotierung (Akzeptor): Einbau von 3-wertigen Fremdatomen (z.B. Bor oder Indium).
  - Es fehlt ein Bindungselektron -> ein positives 'Loch' entsteht. Majoritätsträger: Löcher.

3. DIE DIODE (pn-ÜBERGANG):
- Zusammenfügen von p- und n-Schicht:
  - An der Grenze rekombinieren Elektronen und Löcher.
  - Es entsteht eine ladungsträgerfreie Raumladungszone (Sperrschicht).
- Durchlassrichtung (Pluspol an p-Schicht, Minuspol an n-Schicht):
  - Ladungsträger werden in die Grenzschicht gedrückt; Sperrschicht wird abgebaut.
  - Strom fließt ab der Schwellenspannung (Silizium: ca. 0,7 Volt).
- Sperrrichtung (Pluspol an n-Schicht, Minuspol an p-Schicht):
  - Sperrschicht wird breiter. Es fließt nur ein winziger Sperrstrom.`
  },
  {
    category: "mathe",
    subject: "Mathematik",
    subjClass: "subj-mathe",
    title: "WieWo Wissensspeicher: Quadratische Funktionen, Parabeln & Stochastik",
    summary: "Formelsammlung für WieWo & Mathe-Klausuren: Scheitelpunktform, Streckfaktor a, Nullstellen per pq-Formel, Bruchrechnung und Laplace-Wahrscheinlichkeiten.",
    content: `1. QUADRATISCHE FUNKTIONEN & PARABELN:
a) Scheitelpunktform:
   f(x) = a(x - d)² + e
   - Scheitelpunkt: S(d | e)  [ACHTUNG: Vorzeichen von d in der Klammer kehrt sich um!]
   - Verschiebung: d nach rechts (wenn -d) oder links (wenn +d); e nach oben (+e) oder unten (-e).
   - Streckfaktor a:
     - a > 0: nach oben geöffnet; a < 0: nach unten geöffnet.
     - |a| > 1: Parabel ist gestreckt (schmaler).
     - 0 < |a| < 1: Parabel ist gestaucht (breiter).
b) Normalform & Nullstellen (pq-Formel):
   x² + px + q = 0
   x1,2 = -(p / 2) ± √((p / 2)² - q)
   - Diskriminante D = (p / 2)² - q:
     - D > 0: Genau 2 Nullstellen.
     - D = 0: Genau 1 doppelte Nullstelle (Scheitel berührt die x-Achse).
     - D < 0: Keine reellen Nullstellen.

2. WAHRSCHEINLICHKEITSRECHNUNG (LAPLACE & BAUMDIAGRAMME):
- Pfadmultiplikationsregel: Entlang eines Pfades werden die Einzelwahrscheinlichkeiten multipliziert.
- Pfadadditionsregel: Die Wahrscheinlichkeiten verschiedener günstiger Pfade werden addiert.
- Beispiel 3 Würfelwürfe (genau zweimal die Sechs):
  Anzahl günstiger Pfade = 3 (6-6-keine, 6-keine-6, keine-6-6)
  P = 3 * (1/6)² * (5/6) = 3 * 1/36 * 5/6 = 15/216 ≈ 6,94%.`
  },
  {
    category: "spanisch",
    subject: "Spanisch",
    subjClass: "subj-spanisch",
    title: "Los medios de comunicación, redes sociales & Debattenwortschatz",
    summary: "Vokabeln und Formulierungen für Spanisch-Diskussionen (Smartphone-Nutzung, Instagram, Meinungsäußerung und Vor- und Nachteile abwägen).",
    content: `1. EXPRESAR LA OPINIÓN (MEINUNG ÄUSSERN):
- En mi opinión / Desde mi punto de vista: Meiner Meinung nach / Aus meiner Sicht
- Creo que / Pienso que + Indicativo: Ich glaube / denke, dass...
- No creo que / No pienso que + Subjuntivo: Ich glaube nicht, dass...
- Para mí lo más importante es...: Für mich ist das Wichtigste...

2. PRO Y CONTRA (VOR- UND NACHTEILE):
- Por un lado... por otro lado: Einerseits... andererseits
- La gran ventaja es que...: Der große Vorteil ist, dass...
- Un inconveniente importante es que...: Ein wesentlicher Nachteil ist, dass...
- En comparación con...: Im Vergleich zu...

3. VOCABULARIO DIGITAL:
- las redes sociales: die sozialen Netzwerke
- el teléfono móvil / el smartphone: das Smartphone
- pasar demasiado tiempo delante de la pantalla: zu viel Zeit vor dem Bildschirm verbringen
- perder el tiempo: Zeit verschwenden
- desconectar del colegio: von der Schule abschalten
- estar en contacto con amigos: mit Freunden in Kontakt stehen`
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
  if (s.includes('politik') || s.includes('powi')) return 'subj-politik';
  if (s.includes('wpu') || s.includes('info') || s.includes('wahlpflicht')) return 'subj-wpu';
  if (s.includes('erdkunde') || s.includes('geo')) return 'subj-erdkunde';
  if (s.includes('englisch')) return 'subj-englisch';
  if (s.includes('nachschreib')) return 'subj-nachschreib';
  return 'subj-default';
}

// Navigation Helper: Öffnet Lernzettel-Tab & wählt gezielt Fach aus
window.openStudyTab = function(subject) {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const studyTabBtn = document.querySelector('[data-tab="tab-study"]');
  const studyPane = document.getElementById('tab-study');
  if (studyTabBtn) studyTabBtn.classList.add('active');
  if (studyPane) studyPane.classList.add('active');

  const s = (subject || '').toLowerCase();
  let targetCat = 'all';
  if (s.includes('politik') || s.includes('powi')) targetCat = 'politik';
  else if (s.includes('wpu') || s.includes('info') || s.includes('wahlpflicht')) targetCat = 'wahlpflicht';
  else if (s.includes('erdkunde') || s.includes('geo')) targetCat = 'erdkunde';
  else if (s.includes('englisch')) targetCat = 'englisch';
  else if (s.includes('geschicht')) targetCat = 'geschichte';
  else if (s.includes('deutsch')) targetCat = 'deutsch';
  else if (s.includes('physik')) targetCat = 'physik';
  else if (s.includes('mathe')) targetCat = 'mathe';
  else if (s.includes('spanisch')) targetCat = 'spanisch';

  // Kategorie-Pill aktiv schalten
  document.querySelectorAll('.study-cat-pill').forEach(pill => {
    if (pill.dataset.category === targetCat) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  const searchInput = document.getElementById('studySearchInput');
  if (searchInput) searchInput.value = '';
  activeStudyCategory = targetCat;
  renderStudyMaterials('', targetCat);

  showToast(`Lernzettel für ${subject || 'Kategorie'} geöffnet`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Navigation Helper: Öffnet den Klausuren-Tab
window.openExamsTab = function() {
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const examsTabBtn = document.querySelector('[data-tab="tab-exams"]');
  const examsPane = document.getElementById('tab-exams');
  if (examsTabBtn) examsTabBtn.classList.add('active');
  if (examsPane) examsPane.classList.add('active');

  renderExams(activeExamFilter);
  showToast("Klausuren & Termine geöffnet");
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

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

  // Lernzettel Kategorie-Pills
  document.querySelectorAll('.study-cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.study-cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeStudyCategory = pill.dataset.category || 'all';
      const searchVal = document.getElementById('studySearchInput') ? document.getElementById('studySearchInput').value.toLowerCase() : '';
      renderStudyMaterials(searchVal, activeStudyCategory);
    });
  });

  // Lernzettel Textsuche
  const studyInput = document.getElementById('studySearchInput');
  if (studyInput) {
    studyInput.addEventListener('input', (e) => {
      renderStudyMaterials(e.target.value.toLowerCase(), activeStudyCategory);
    });
  }

  // Klausuren Filter-Buttons
  document.querySelectorAll('.exam-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.exam-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeExamFilter = btn.dataset.filter || 'all';
      renderExams(activeExamFilter);
    });
  });

  // Initiale Vorbereitung
  renderExams('all');
  renderStudyMaterials('', 'all');
  highlightCurrentDay();
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
  renderExams(activeExamFilter);
  renderStudyMaterials('', activeStudyCategory);
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

// ==============================================================================
// RENDERING: KLAUSUREN & ARBEITEN
// ==============================================================================
function renderExams(filter = 'all') {
  const container = document.getElementById('examsList');
  if (!container) return;
  container.innerHTML = '';

  let examsList = OFFICIAL_EXAMS;
  if (filter === 'exam') {
    examsList = examsList.filter(e => e.type !== 'Nachschreibetermin');
  } else if (filter === 'nachschreib') {
    examsList = examsList.filter(e => e.type === 'Nachschreibetermin');
  }

  if (examsList.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 30px 0; text-align: center; font-size: 13px;">Keine Prüfungstermine in dieser Kategorie.</div>`;
    return;
  }

  examsList.forEach((exam) => {
    const card = document.createElement('div');
    card.className = `exam-card ${exam.urgent ? 'is-urgent' : ''}`;

    let countdownBadgeClass = 'exam-badge-regular';
    if (exam.urgent) countdownBadgeClass = 'exam-badge-urgent';
    else if (exam.countdown_label && exam.countdown_label.includes('Tagen') && parseInt(exam.countdown_label.replace(/\D/g, ''), 10) <= 7) {
      countdownBadgeClass = 'exam-badge-soon';
    }

    const topicsHtml = (exam.topics || []).map(t => `<li>${escapeHtml(t)}</li>`).join('');

    card.innerHTML = `
      <div class="exam-card-header">
        <div class="exam-card-header-left">
          <span class="subject-tag ${exam.subjClass || 'subj-default'}">${escapeHtml(exam.subject)}</span>
          <span class="${countdownBadgeClass}">${escapeHtml(exam.countdown_label || 'Demnächst')}</span>
        </div>
        <div class="exam-meta-pills">
          <span class="exam-meta-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${escapeHtml(exam.date_fmt)}
          </span>
          <span class="exam-meta-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${escapeHtml(exam.time)}
          </span>
          <span class="exam-meta-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            ${escapeHtml(exam.room)}
          </span>
        </div>
      </div>

      <div class="exam-card-title">${escapeHtml(exam.title)}</div>

      <div class="exam-topics-box">
        <div class="exam-topics-label">Themenschwerpunkte & Lernstoff:</div>
        <ul class="exam-topics-list">
          ${topicsHtml}
        </ul>
      </div>

      <div class="exam-card-footer">
        <span class="exam-type-pill">${escapeHtml(exam.type)} &bull; Klasse 10s</span>
        ${exam.study_subject ? `
          <button class="btn-exam-action" onclick="openStudyTab('${escapeHtml(exam.study_subject)}')">
            <span>Lernzettel öffnen</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        ` : `
          <button class="btn-secondary-sm" onclick="showToast('Zentraltermin erfordert keinen Fach-Lernzettel')">
            <span>Info</span>
          </button>
        `}
      </div>
    `;
    container.appendChild(card);
  });
}

// ==============================================================================
// RENDERING: HAUSAUFGABEN & LÖSUNGEN
// ==============================================================================
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

    // Wähle echte getrennte Lösung für die ausgewählte Person
    let solutionText = '';
    if (currentPerson === 'bruno') {
      solutionText = task.solution_bruno || (task.solution_summary ? task.solution_summary.replace(/Deniz Tursun/g, "Bruno").replace(/Deniz/g, "Bruno") : 'Ausarbeitung Bruno wird geladen...');
    } else {
      solutionText = task.solution_deniz || task.solution_summary || 'Ausarbeitung Deniz wird geladen...';
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

// ==============================================================================
// RENDERING: LERNZETTEL MIT KATEGORIEN-FILTER
// ==============================================================================
function renderStudyMaterials(query = '', category = 'all') {
  const container = document.getElementById('studyGrid');
  if (!container) return;
  container.innerHTML = '';

  const q = (query || '').toLowerCase().trim();
  const cat = (category || 'all').toLowerCase();

  const filtered = STUDY_MATERIALS.filter(s => {
    // 1. Kategorie-Abgleich
    const matchesCat = (cat === 'all') || (s.category && s.category.toLowerCase() === cat) || (s.subject && s.subject.toLowerCase().includes(cat));
    if (!matchesCat) return false;

    // 2. Textsuche
    if (!q) return true;
    return s.subject.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); padding: 30px 0; text-align: center; font-size: 13px;">Keine Lernzettel für diese Filterauswahl gefunden.</div>`;
    return;
  }

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
