# Geschützte Auslieferung – lokale Vorbereitung, nicht ausgerollt

## Infrastrukturprüfung und offene Zuordnung

Im verfügbaren Workspace ist nur `KeschFlow/eddiesworld-hq` als Projektcheckout
vorhanden. Keine Wrangler-Dateien, Worker-Quellen, Cloudflare-Bindings,
Deploy-Pipelines, Mail-Funktionen oder Stripe-Backends gefunden. In der aktuellen
Cloud-Konfiguration sind keine passenden Secret-Bindings oder Cloudflare-Identitäten
hinterlegt. Das GitHub-Repository-Listing scheitert mit API-Zugriffsfehler
„Forbidden“; andere verbundene Repositories sind mit den verfügbaren Werkzeugen
nicht auflistbar. Die Eigentümerangabe nennt `kf001-owner-backend`, `purpur-trader`
und eine D1-Datenbank, aber keinen bestätigten privaten Speicher.

Die tatsächlichen Worker-Repositories und deren R2/KV/D1-Bindings sind daher
NICHT zugeordnet/geprüft. `purpur-trader` wird nicht verwendet. Kein neuer Worker,
Bucket, Binding, Datenbank, Repository oder Dienst wurde angelegt. Es gibt
absichtlich keine erfundene Wrangler-Konfiguration oder Deployment-Pipeline.

## Entscheidung: Variante A, ausschließlich Testmodus

`worker.mjs` ist ein lokal getestetes Modul für einen erst noch zu prüfenden
bestehenden allgemeinen Worker. Zwei gleichursprüngliche POST-Routen:

- `/api/delivery/authorize`: Session und angefordertes Produkt prüfen, dann
  HMAC-signierten Token ausstellen, wenn die private Datei vorhanden ist.
- `/api/delivery/download`: Signatur, Produktbindung und Ablauf prüfen,
  Stripe erneut prüfen und erst danach private PDF streamen.

Gegenüber Webhook/E-Mail keine Mailzustellung, Datenbank oder zusätzliche
Bestellspeicherung erforderlich. Stripe bleibt das Bestellsystem. Das Modul
speichert keine E-Mail-Adressen, Kundendaten oder Bestellungen. Session-Referenz,
Produkt, Ablaufzeit und Zufallskennung befinden sich im signierten Token.
Token und Session sind Bearer-Zugangsdaten, nicht öffentlich zu dokumentieren.
Tokens gelten fünf Minuten und sind innerhalb dieser Frist mehrfach nutzbar.
Jeder Download validiert Zahlung, Refund und Dispute erneut; nach Ablauf ist eine
neue serverseitige Autorisierung nötig. Anonyme direkte Aufrufe reichen nicht.

Stripe-Prüfungen: `livemode=false`, Session `complete` und `paid`, `mode=payment`,
exakte erlaubte Price-/Produkt-ID, genau eine Position/Menge 1, einmalig 490 Cent
EUR, erfolgreicher PaymentIntent und erfolgreicher tatsächlich eingezogener
Charge, kein Teil-/Vollrefund und kein Dispute. Stripe-Ausfall sperrt Downloads.
Live-Schlüssel und Live-Sessions werden absichtlich abgewiesen. Der Live-Button
bleibt deaktiviert. Mehrfachprodukte, Mengen, Rabatte, abweichende Steuerbeträge,
andere Währungen oder verzögert bezahlte Bestellungen werden nicht freigegeben.

## Notwendige Integration, erst nach Infrastrukturprüfung

1. Tatsächliches Repository des geeigneten bestehenden Backends verfügbar machen;
   Binding-Konfiguration ohne Ausgabe von Secret-Werten prüfen. Bestehende Routen
   erhalten. Keine pauschale Ersetzung des Worker-Handlers durch dieses Modul.
2. Geeigneten bereits vorhandenen privaten Speicher nachweisen. Dieses Modul
   erwartet ein privates R2-Binding `PRODUCT_FILES` (`head`/`get`). Öffentliche
   R2-Zugänge, `r2.dev` und öffentliche Bucket-Domains müssen aus sein. D1 allein
   bestätigt keinen geeigneten PDF-Speicher. Ohne passenden vorhandenen Speicher
   bleibt die Integration gesperrt; nichts öffentlich hochladen.
3. Nur dort beide Verkaufsdateien separat ablegen; Originale in Drive privat
   lassen. Im Checkout ist die vollständige Kalender-PDF nicht vorhanden.
4. Im bestehenden Worker dieselbe Website-Origin für `/api/delivery/*` routen.
   DNS-/Cloudflare-Eignung ist nicht bestätigt. Keine neue Domain nötig; kein CORS
   geöffnet. Den Token-Endpunkten keine Cache-/Logging-Regeln für Bodies geben.
5. Laufzeitwerte über bestehende Secret-/Binding-Verwaltung konfigurieren:
   - `STRIPE_SECRET_KEY`: ausschließlich passender Stripe-Testschlüssel, niemals Git.
   - `DOWNLOAD_SIGNING_KEY`: mindestens 32 zufällige Bytes, separat als Secret;
     Rotation invalidiert vorhandene Tokens.
   - `DELIVERY_MODE`: `test`.
   - `DELIVERY_PRODUCTS`: JSON-Objekt mit Einträgen `tracker` und `calendar`;
     je Eintrag tatsächliche Sandbox-IDs `price`, `product`, `amount:490`,
     `currency:"eur"` und privater Objektschlüssel `key`. IDs nicht erfinden.
   - `PRODUCT_FILES`: geprüftes privates R2-Binding, kein Frontend-Secret.
6. In der Sandbox pro Produkt eigenen Test-Payment-Link erstellen. Als Redirect
   bestehende produktspezifische Danke-Seite mit
   `?session_id={CHECKOUT_SESSION_ID}` konfigurieren. Kein Live-Link als Test.
   Erst prüfen, ob die aktuellen Sandbox-Settings dies unterstützen.
7. Den vollständigen Sandbox-Test ausführen und erst danach separate Live-Freigabe
   vorbereiten. Dieses Modul unterstützt absichtlich noch keinen Live-Betrieb.

`delivery-client.js` verwendet POST-Bodies statt Token-URLs. Es entfernt die
Session aus der Adresszeile, speichert Tokens nicht persistent, setzt
`no-referrer` und gibt erst nach Prüfung eine Blob-Datei zum Download aus.
Die Session-ID ist ein Besitznachweis plus Stripe-Validierung, keine zusätzliche
Käuferanmeldung. Weitergabe einer echten Session kann innerhalb dieser Architektur
Zugriff erlauben. Die produktbezogene Datei ist nie als öffentliche URL ausgegeben.
Für höheren Schutz wäre Käuferauthentifizierung eine separate Anforderung.

## Tracker-Migration und historische Offenlegung

Der alte direkte Download-Link und die unbelegte Erfolgsbehauptung wurden aus
der Tracker-Danke-Seite entfernt. Neue Tracker-Käufe sind bis zur Integration
pausiert; die Produktseite bleibt bestehen. Die Kalenderseite bleibt gesperrt.

Die Tracker-PDF wurde bytegleich außerhalb des Checkout unter
`/workspace/private-products/unaufhaltsam-30-tracker-original.pdf` gesichert und
aus dem neuen Repository-Baum entfernt. Diese lokale Datei ist kein bereitgestellter
Cloudspeicher und keine dauerhafte Sicherungszusage. Vor Merge/Ausrollen muss die
Datei im bestätigten privaten Speicher liegen und die Wiederherstellbarkeit
bestätigt sein. Die Datei verbleibt in alten Git-Commits und möglicherweise in
Caches/Downloads. Diese Änderung macht bereits veröffentlichte Kopien NICHT
rückwirkend privat. Keine Git-Historie wurde umgeschrieben. Bisherige Live-Seite
und Download bleiben bis zu einem freigegebenen Deployment unverändert.

Vor Freigabe: alte statische URL und Caches behandeln, vorhandene Käufermigration
klären, privaten Speicher verifizieren, vollständige PDFs tatsächlich ausliefern,
reale Sandbox-Erfolgs-/Fehlerfälle und Weiterleitung testen. Keine Geheimnisse
oder vollständigen PDFs ins öffentliche Repository zurückkopieren.

## Verifikation

`node --test tests/amazon-outbound.test.cjs tests/delivery.test.mjs`

Die Tests simulieren Stripe und R2: Erfolg, Abbruch/Fehler, fremdes Produkt/Price,
Menge/Betrag/Währung, Live-Daten, Refund/Dispute, fehlende Datei, gestörter Stripe,
manipulierter/abgelaufener Token und erlaubter Mehrfachzugriff. Sie ersetzen
keinen Stripe-Sandbox-Test, R2-Integrationstest oder deployed Worker-Test.

Die verbleibende technische Lücke ist der nicht zugängliche bzw. nicht bestätigte
bestehende Backend-/Privatspeicher-Verbund. Kostenärmste sichere nächste Option:
den vorhandenen allgemeinen Worker prüfen und geeigneten vorhandenen Speicher
binden. Falls keiner existiert, kann dessen Einrichtung erst nach gesonderter
Prüfung von Kosten und Freigabe entschieden werden. Bis dahin keine Freischaltung.
