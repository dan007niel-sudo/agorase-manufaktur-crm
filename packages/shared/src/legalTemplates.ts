import type { LegalNoteStatus, LegalRiskLevel } from './legal.js'

export type LegalCountry = 'DE' | 'AT' | 'CH' | 'EU'

export const LEGAL_COUNTRIES: readonly LegalCountry[] = ['DE', 'AT', 'CH', 'EU']

export const LEGAL_COUNTRY_LABELS: Record<LegalCountry, string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz',
  EU: 'EU-weit',
}

export interface LegalTemplate {
  id: string
  country: LegalCountry
  title: string
  topic: string
  defaultRiskLevel: LegalRiskLevel
  defaultStatus: LegalNoteStatus
  summary: string
  body: string
  checklist: readonly string[]
  sourceLinks: readonly string[]
  defaultNextAction: string
}

export const LEGAL_TEMPLATES: readonly LegalTemplate[] = [
  {
    id: 'de-impressum',
    country: 'DE',
    title: 'Impressum nach TMG / DDG',
    topic: 'Impressum',
    defaultRiskLevel: 'high',
    defaultStatus: 'open',
    summary:
      'Pflichtangaben für jede geschäftsmäßige Website. Seit 2024 gilt das DDG (Digitale-Dienste-Gesetz) statt TMG.',
    body: 'Ein vollständiges Impressum schützt vor schnellen Abmahnungen. Inhaltlich Verantwortlicher nach §18 MStV nicht vergessen, wenn redaktionelle Inhalte angeboten werden.',
    checklist: [
      'Voller Name bzw. Firma + Rechtsform',
      'Postanschrift (kein Postfach)',
      'E-Mail UND Telefonnummer',
      'USt-ID (falls vorhanden)',
      'Handelsregister-Nummer + Registergericht (falls eingetragen)',
      'Inhaltlich Verantwortlicher nach §18 MStV',
    ],
    sourceLinks: [
      'https://www.gesetze-im-internet.de/ddg/',
      'https://www.gesetze-im-internet.de/mstv/',
    ],
    defaultNextAction: 'Impressums-Seite anlegen und im Footer jeder Seite verlinken',
  },
  {
    id: 'de-datenschutz',
    country: 'DE',
    title: 'Datenschutzerklärung (DSGVO + BDSG)',
    topic: 'DSGVO',
    defaultRiskLevel: 'critical',
    defaultStatus: 'open',
    summary:
      'Pflicht-Datenschutzerklärung mit allen Verarbeitungstätigkeiten, Rechtsgrundlagen, Empfängern und Betroffenenrechten. Bußgelder bis 4% Jahresumsatz.',
    body: 'Besondere Vorsicht bei US-Drittland-Übermittlungen (Stripe, Mailchimp, Cloudflare). Cookie-Consent-Banner gehört nicht in die Datenschutzerklärung selbst, sondern braucht eigenständige Implementierung.',
    checklist: [
      'Verantwortlicher + Kontakt benannt',
      'Alle Daten + Zweck + Rechtsgrundlage (Art. 6 DSGVO) gelistet',
      'Cookies + Tracking-Tools mit eigenständigem Consent-Banner',
      'Empfänger und Drittland-Übermittlungen genannt',
      'Aufbewahrungsfristen dokumentiert',
      'Betroffenenrechte + Beschwerderecht bei Aufsichtsbehörde erklärt',
      'AV-Verträge mit allen Auftragsverarbeitern abgeschlossen',
    ],
    sourceLinks: [
      'https://www.gesetze-im-internet.de/bdsg_2018/',
      'https://www.dsk.gmd.de/',
    ],
    defaultNextAction:
      'Datenschutzerklärung erstellen, Consent-Banner einrichten, AV-Verträge sammeln',
  },
  {
    id: 'de-agb',
    country: 'DE',
    title: 'AGB für Online-Shop (BGB)',
    topic: 'AGB',
    defaultRiskLevel: 'high',
    defaultStatus: 'open',
    summary:
      'AGB nach §305 ff. BGB. Müssen transparent, nicht überraschend und Verbraucherschutz-konform sein.',
    body: 'Eigene AGB ohne anwaltliche Prüfung sind ein häufiger Abmahn-Grund. Mindestens für die erste Version eine Fachanwält:in einbeziehen.',
    checklist: [
      'Vertragsschluss-Mechanik klar beschrieben',
      'Preise inklusive MwSt und Versandkosten',
      'Liefer- und Zahlungsbedingungen',
      'Gewährleistung 2 Jahre für Verbraucher',
      'Streitbeilegung mit Link zur OS-Plattform der EU',
      'Salvatorische Klausel formuliert',
    ],
    sourceLinks: [
      'https://www.gesetze-im-internet.de/bgb/',
      'https://ec.europa.eu/consumers/odr',
    ],
    defaultNextAction: 'AGB von Fachanwält:in prüfen lassen und im Checkout einbinden',
  },
  {
    id: 'de-widerruf',
    country: 'DE',
    title: 'Widerrufsbelehrung (Fernabsatz)',
    topic: 'Widerruf',
    defaultRiskLevel: 'critical',
    defaultStatus: 'open',
    summary:
      'Verbraucher haben bei Fernabsatzgeschäften 14 Tage Widerrufsrecht. Bei fehlerhafter Belehrung verlängert sich die Frist auf 12 Monate.',
    body: 'Das amtliche Muster aus Anlage 1 zu Art. 246a EGBGB ist die sicherste Vorlage. Ausnahmen wie personalisierte Ware müssen explizit ausgeschlossen werden.',
    checklist: [
      'Amtliches Muster aus Anlage 1 zu Art. 246a EGBGB verwendet',
      'Muster-Widerrufsformular bereitgestellt',
      'Widerrufsfolgen erklärt (Rückerstattung und Rücksendekosten)',
      'Belehrung VOR Bestellbestätigung sichtbar',
      'Belehrung per E-Mail nach Bestellung nachgereicht',
      'Ausnahmen (z.B. personalisierte Ware) explizit ausgeschlossen',
    ],
    sourceLinks: [
      'https://www.gesetze-im-internet.de/bgb/__355.html',
      'https://www.gesetze-im-internet.de/egbgb/',
    ],
    defaultNextAction:
      'Muster-Belehrung an das eigene Sortiment anpassen und im Checkout einbinden',
  },
  {
    id: 'de-verpackg',
    country: 'DE',
    title: 'Verpackungsregister LUCID (VerpackG)',
    topic: 'Verpackung',
    defaultRiskLevel: 'high',
    defaultStatus: 'open',
    summary:
      'Jeder Inverkehrbringer von Verpackungen muss sich bei der Zentralen Stelle Verpackungsregister (LUCID) registrieren. Verstöße können zu Vertriebsverboten führen.',
    body: 'Auch Versandkartons und Polstermaterial zählen. Die Systembeteiligung (Lizenzierung bei einem Dualen System) ist getrennt von der LUCID-Registrierung.',
    checklist: [
      'LUCID-Registrierung beantragt',
      'Vertrag mit Dualem System (Systembeteiligung) abgeschlossen',
      'Jährliche Mengenmeldung Q1 für das Vorjahr',
      'Vollständigkeitserklärung ab den gesetzlichen Schwellen',
      'Verpackungsdokumentation aufbewahrt',
    ],
    sourceLinks: [
      'https://www.verpackungsregister.org/',
      'https://www.gesetze-im-internet.de/verpackg/',
    ],
    defaultNextAction: 'LUCID-Registrierung beantragen und Duales System auswählen',
  },
  {
    id: 'de-marke',
    country: 'DE',
    title: 'Markenregistrierung (DPMA)',
    topic: 'Markenrecht',
    defaultRiskLevel: 'medium',
    defaultStatus: 'open',
    summary:
      'Brand-Name und Logo als Marke beim DPMA registrieren, um exklusive Nutzungsrechte zu sichern.',
    body: 'Vorab gründliche Recherche im DPMAregister und EUIPO TMview betreiben, sonst droht Kollisionsstreit. Für Fashion sind mindestens Klasse 25 (Bekleidung) und ggf. 18 (Lederwaren) und 14 (Schmuck) relevant.',
    checklist: [
      'Markenrecherche in DPMAregister und EUIPO TMview',
      'Nizza-Klassen festgelegt (mind. Klasse 25)',
      'Markenform gewählt (Wort, Bild, Wort-Bild)',
      'Anmeldung beim DPMA eingereicht',
      'Widerspruchsfrist (3 Monate) beobachtet',
      'Markenüberwachung dauerhaft eingerichtet',
    ],
    sourceLinks: [
      'https://www.dpma.de/',
      'https://register.dpma.de/',
      'https://www.tmdn.org/tmview/',
    ],
    defaultNextAction:
      'Markenrecherche durchführen, ggf. Marken-/Patentanwält:in beauftragen',
  },
  {
    id: 'at-offenlegung',
    country: 'AT',
    title: 'Offenlegung / Impressum (ECG, MedienG)',
    topic: 'Impressum',
    defaultRiskLevel: 'high',
    defaultStatus: 'open',
    summary:
      'Offenlegungspflicht nach §5 ECG und §24 MedienG. Strenger als das deutsche Impressum, besonders für Medieninhaber.',
    body: 'Wenn redaktionelle Inhalte angeboten werden, kommt zusätzlich die Offenlegung der grundlegenden Richtung nach §25 MedienG hinzu.',
    checklist: [
      'Name + Anschrift + Kontakt',
      'UID-Nummer (falls vorhanden)',
      'Firmenbuchnummer + Firmenbuchgericht',
      'Aufsichtsbehörde (wenn Tätigkeit reglementiert)',
      'Bei Online-Medien: grundlegende Richtung nach §25 MedienG',
    ],
    sourceLinks: [
      'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20001703',
      'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000719',
    ],
    defaultNextAction: 'Impressum und Offenlegung anlegen, in Website-Footer einbinden',
  },
  {
    id: 'at-datenschutz',
    country: 'AT',
    title: 'Datenschutzerklärung (DSGVO + DSG)',
    topic: 'DSGVO',
    defaultRiskLevel: 'critical',
    defaultStatus: 'open',
    summary:
      'DSGVO gilt unmittelbar, ergänzt durch das österreichische DSG. Aufsicht ist die Datenschutzbehörde (DSB).',
    body: 'Vorgehen ist sehr ähnlich zu Deutschland, Beschwerdestelle ist aber die DSB statt LDA. Bei Beschäftigtendaten zusätzlich §§ 11 ff. DSG beachten.',
    checklist: [
      'Datenschutzerklärung nach DSGVO + DSG erstellt',
      'Cookies + Consent-Banner umgesetzt',
      'Drittland-Übermittlungen offengelegt',
      'AV-Verträge abgeschlossen',
      'Beschwerderecht bei DSB erwähnt',
    ],
    sourceLinks: [
      'https://www.dsb.gv.at/',
      'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001597',
    ],
    defaultNextAction: 'Datenschutzerklärung an österreichischen Kontext anpassen',
  },
  {
    id: 'at-agb',
    country: 'AT',
    title: 'AGB (KSchG, FAGG)',
    topic: 'AGB',
    defaultRiskLevel: 'high',
    defaultStatus: 'open',
    summary:
      'AGB unterliegen dem Konsumentenschutzgesetz (KSchG) und dem Fern- und Auswärtsgeschäfte-Gesetz (FAGG).',
    body: 'Missbräuchliche Klauseln nach §6 KSchG sind nichtig. Vorvertragliche Informationspflichten nach §4 FAGG müssen vor Vertragsschluss erfüllt werden.',
    checklist: [
      'Vorvertragliche Informationen nach §4 FAGG erfüllt',
      'Keine missbräuchlichen Klauseln (KSchG §6)',
      '2 Jahre Gewährleistung für Verbraucher',
      'Online-Streitbeilegung verlinkt',
    ],
    sourceLinks: [
      'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10002462',
      'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20008847',
    ],
    defaultNextAction: 'AGB FAGG-konform überarbeiten',
  },
  {
    id: 'at-ruecktritt',
    country: 'AT',
    title: 'Rücktrittsrecht (FAGG)',
    topic: 'Rücktritt',
    defaultRiskLevel: 'critical',
    defaultStatus: 'open',
    summary:
      '14-tägiges Rücktrittsrecht bei Fernabsatz. Pflicht-Information mit Muster-Belehrung nach FAGG-Anhang.',
    body: 'Bei fehlerhafter Belehrung verlängert sich die Rücktrittsfrist um 12 Monate. Ausnahmen für personalisierte oder versiegelte Waren explizit ausschließen.',
    checklist: [
      'Muster-Belehrung nach FAGG-Anhang verwendet',
      'Muster-Rücktrittsformular bereitgestellt',
      'Rücktrittsfolgen erklärt (Rückzahlung + Kosten)',
      'Ausnahmen explizit benannt',
    ],
    sourceLinks: [
      'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20008847',
    ],
    defaultNextAction: 'Muster-Rücktrittsbelehrung im Checkout einbinden',
  },
  {
    id: 'at-verpackung',
    country: 'AT',
    title: 'Verpackungsverordnung (ARA / Sammelsystem)',
    topic: 'Verpackung',
    defaultRiskLevel: 'high',
    defaultStatus: 'open',
    summary:
      'Verpackungsverordnung 2014 verlangt Lizenzierung über ein Sammel-/Verwertungssystem (ARA, EVA, Reclay etc.).',
    body: 'Auch Versandverpackungen sind erfasst. Lizenzkosten richten sich nach Material und Menge.',
    checklist: [
      'Sammel-/Verwertungssystem ausgewählt',
      'Lizenzvertrag abgeschlossen',
      'Jährliche Mengenmeldungen eingereicht',
      'Verpackungsdokumentation aufbewahrt',
    ],
    sourceLinks: [
      'https://www.ara.at/',
      'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20008902',
    ],
    defaultNextAction: 'Sammel-/Verwertungssystem auswählen und Lizenzvertrag abschließen',
  },
  {
    id: 'at-marke',
    country: 'AT',
    title: 'Markenregistrierung (Patentamt)',
    topic: 'Markenrecht',
    defaultRiskLevel: 'medium',
    defaultStatus: 'open',
    summary: 'Marken-Anmeldung beim Österreichischen Patentamt für nationalen Schutz.',
    body: 'Für DACH-weiten Schutz lohnt sich oft eine EU-Marke beim EUIPO statt drei nationaler Anmeldungen. Schweiz braucht aber zusätzliche IGE-Anmeldung.',
    checklist: [
      'Recherche im Markenregister und EUIPO',
      'Nizza-Klassen festgelegt',
      'Anmeldung beim Patentamt',
      'Widerspruchsfrist 3 Monate beobachten',
    ],
    sourceLinks: [
      'https://www.patentamt.at/',
      'https://see-ip.patentamt.at/',
    ],
    defaultNextAction: 'Markenrecherche durchführen',
  },
  {
    id: 'ch-impressum',
    country: 'CH',
    title: 'Impressum (UWG Art. 3)',
    topic: 'Impressum',
    defaultRiskLevel: 'high',
    defaultStatus: 'open',
    summary:
      'Schweizer UWG Art. 3 verlangt klare Anbieter-Identifikation im E-Commerce. Es gibt kein eigenes Impressumsgesetz, aber Pflicht über UWG und OR.',
    body: 'Strafrechtlich relevant bei vorsätzlicher Missachtung. HR-Eintrag-Pflicht ab 100.000 CHF Jahresumsatz.',
    checklist: [
      'Anbieter-Identität klar ersichtlich (Name, Adresse, Rechtsform)',
      'Kontakt-E-Mail',
      'UID-Nummer (wenn MwSt-pflichtig)',
      'Handelsregister-Eintrag (wenn HR-pflichtig)',
    ],
    sourceLinks: [
      'https://www.fedlex.admin.ch/eli/cc/1988/223_223_223/de',
      'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de',
    ],
    defaultNextAction: 'Impressums-Seite anlegen',
  },
  {
    id: 'ch-datenschutz',
    country: 'CH',
    title: 'Datenschutzerklärung (revDSG)',
    topic: 'Datenschutz',
    defaultRiskLevel: 'critical',
    defaultStatus: 'open',
    summary:
      'Revidiertes Datenschutzgesetz seit 1.9.2023. DSGVO-ähnlich, aber nicht identisch. Aufsicht ist der EDÖB.',
    body: 'Wichtige Unterschiede zur DSGVO: Bekanntgabe von Auslandsdaten nach Art. 17, kein direktes Bußgeld-Regime aber Strafrecht gegen verantwortliche natürliche Personen.',
    checklist: [
      'Datenschutzerklärung nach Art. 19 revDSG',
      'Auslandsdaten nach Art. 17 revDSG offengelegt',
      'Bei hohem Risiko: Datenschutz-Folgenabschätzung',
      'Verzeichnis der Bearbeitungstätigkeiten (sofern nicht KMU mit geringem Risiko)',
      'Verletzungsmeldung an EDÖB in angemessener Frist',
    ],
    sourceLinks: [
      'https://www.fedlex.admin.ch/eli/cc/2022/491/de',
      'https://www.edoeb.admin.ch/',
    ],
    defaultNextAction: 'Datenschutzerklärung revDSG-konform überarbeiten',
  },
  {
    id: 'ch-agb',
    country: 'CH',
    title: 'AGB & Verbraucherschutz (OR + UWG)',
    topic: 'AGB',
    defaultRiskLevel: 'high',
    defaultStatus: 'open',
    summary:
      'AGB unterliegen Art. 8 UWG (Inhaltskontrolle ungewöhnlicher Klauseln) und dem OR. Schweiz hat kein gesetzliches Widerrufsrecht.',
    body: 'Ungewöhnliche Klauseln nach Art. 8 UWG sind unwirksam, wenn sie zu erheblicher Schlechterstellung führen. Gewährleistungsfrist 2 Jahre für neue Sachen nach OR Art. 210.',
    checklist: [
      'Vertragsschluss-Mechanik klar',
      'Ungewöhnliche/missbräuchliche Klauseln vermieden (UWG Art. 8)',
      'Gewährleistung nach OR Art. 210 (2 Jahre)',
      'Streitbeilegung beschrieben',
    ],
    sourceLinks: [
      'https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de',
      'https://www.fedlex.admin.ch/eli/cc/1988/223_223_223/de',
    ],
    defaultNextAction: 'AGB durch CH-Anwält:in prüfen lassen',
  },
  {
    id: 'ch-ruecknahme',
    country: 'CH',
    title: 'Rückgabe-Policy (kein gesetzliches Widerrufsrecht!)',
    topic: 'Rücknahme',
    defaultRiskLevel: 'low',
    defaultStatus: 'open',
    summary:
      'Die Schweiz kennt KEIN gesetzliches Widerrufsrecht im E-Commerce. Freiwillige Kulanz-Policy ist Standard und Wettbewerbsvorteil.',
    body: 'Branchenüblich sind 14-30 Tage Rückgaberecht. Klare Kommunikation ob Rücksendekosten der Kunde oder Anbieter trägt.',
    checklist: [
      'Eigene Rückgabe-Policy formuliert (z.B. 14 oder 30 Tage)',
      'Was wird zurückgenommen, in welchem Zustand',
      'Rücksendekosten geregelt',
      'Erstattungsmodalitäten beschrieben',
      'Im Checkout sichtbar gemacht',
    ],
    sourceLinks: [
      'https://www.konsum.admin.ch/',
    ],
    defaultNextAction: 'Eigene Rückgabe-Policy festlegen und transparent kommunizieren',
  },
  {
    id: 'ch-verpackung',
    country: 'CH',
    title: 'Verpackungsentsorgung (vRG / IGORA / PRS)',
    topic: 'Verpackung',
    defaultRiskLevel: 'medium',
    defaultStatus: 'open',
    summary:
      'Schweiz hat sektorale Recycling-Systeme: IGORA für Aluminium, PRS für PET, VetroSwiss für Glas. Vorgezogene Recyclinggebühr (vRG) für relevante Materialien.',
    body: 'Anders als DE/AT-Pflichtsysteme ist es ein Materialsystem: pro Material das passende System anmelden.',
    checklist: [
      'Verpackungsmaterialien geprüft (PET, Alu, Glas, Karton)',
      'Bei jeweiligem System angemeldet',
      'Vorgezogene Recyclinggebühr (vRG) bezahlt',
      'Recycling-Hinweise auf Verpackung',
    ],
    sourceLinks: [
      'https://www.bafu.admin.ch/',
      'https://www.prs.ch/',
      'https://www.igora.ch/',
    ],
    defaultNextAction: 'Verpackungs-Audit durchführen und Systeme anmelden',
  },
  {
    id: 'ch-marke',
    country: 'CH',
    title: 'Markenregistrierung (IGE)',
    topic: 'Markenrecht',
    defaultRiskLevel: 'medium',
    defaultStatus: 'open',
    summary: 'Marken-Schutz für die Schweiz beim Eidgenössischen Institut für Geistiges Eigentum (IGE).',
    body: 'EU-Marken gelten nicht in der Schweiz. Für CH-Schutz braucht es separate IGE-Anmeldung oder Internationale Registrierung über das Madrider System.',
    checklist: [
      'Recherche in Swissreg und Madrid System',
      'Nizza-Klassen festgelegt',
      'Anmeldung beim IGE',
      'Widerspruchsfrist 3 Monate beobachtet',
    ],
    sourceLinks: [
      'https://www.ige.ch/',
      'https://www.swissreg.ch/',
    ],
    defaultNextAction: 'Markenrecherche durchführen',
  },
]

export function legalTemplatesByCountry(country: LegalCountry): LegalTemplate[] {
  return LEGAL_TEMPLATES.filter((t) => t.country === country)
}
