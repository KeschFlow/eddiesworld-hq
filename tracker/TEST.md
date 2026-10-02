# UNAUFHALTSAM 30: begrenzter Verkaufstest

Stand: 02.10.2026. Nur Tracker; andere Systeme bleiben unangetastet.

## Start

Tag 1 bleibt AUS, bis die GA4-Ereignisse live empfangen und TikTok/YouTube getrennt geprüft sind sowie der kostenlose Sandbox-Durchlauf Redirect und PDF-Zugriff bestätigt. Keine kostenpflichtige Eigenzahlung.

## Messung

GA4-Property: 546402390 (mg-challenge / Eddie's World).
Mess-ID: G-0DFW5EMT8M, über die Web-App-Konfiguration der bestehenden HQ-App verifiziert.

- `page_view`: Seitenaufruf nach Zustimmung.
- `tracker_landing_view`: Tracker-Aufruf nach Zustimmung.
- `tracker_checkout_click`: Klick auf den Stripe-Kaufbutton; kein Kaufnachweis.
- Parameter: `utm_source`, `tracker_source`, `tracker_test`.
- Quellen zusätzlich als native Kampagnenquelle gesetzt; Standardmedium `social`.
- `tracker_test=1` kennzeichnet Prüfsessions, aktiviert Debug Mode und setzt Stripe `client_reference_id` auf `test_<quelle>`.
- Tests aus der Auswertung ausschließen (Seiten-URL enthält `tracker_test=1`); Stripe-Testreferenzen ebenfalls ausschließen.
- Käufe und Umsatz ausschließlich aus bestätigten Stripe-Zahlungen; Danke-Seitenaufrufe zählen nicht als Kauf.
- GA4 erfasst hier ausschließlich Besucher mit Zustimmung. Keine Hochrechnung auf ungemessene Besucher.

## Kostenlose Prüflinks

https://eddiesworld.de/tracker/?utm_source=tiktok&utm_medium=social&utm_campaign=tracker_test&tracker_test=1

https://eddiesworld.de/tracker/?utm_source=youtube&utm_medium=social&utm_campaign=tracker_test&tracker_test=1

In GA4-Echtzeit/DebugView den Empfang von Landingpage- und Checkout-Ereignissen inklusive Quelle prüfen. Der Checkout-Klick öffnet den Live-Checkout; dort nicht bezahlen. Der tatsächliche Zahlungsdurchlauf erfolgt separat in der Sandbox.

## Vor Tag 1 festgelegte Entscheidung

- Nach 14 Tagen UND mindestens 300 gemessenen Landingpage-Besuchern ohne bestätigten Kauf: STOP.
- Unter 300 gemessenen Besuchern: keine belastbare Entscheidung nach dieser Grenze; nicht stillschweigend verlängern.
- Kaufbutton-Klickrate: eindeutige Besucher mit Checkout-Klick / eindeutige Landingpage-Besucher im selben Zeitraum, ohne Prüfsessions. Ziel mindestens 2 %.
- Unter 2 %: Angebot, Seite und Traffic-Passung zuerst untersuchen. Dies ist ein Diagnosesignal und schließt zusätzliche Fehler im Zahlungsweg nicht aus.

## PDF-Prüfung

Die saubere Download-URL ohne Parameter wurde am 02.10.2026 geprüft: HTTP 200, Content-Type application/pdf, sieben Seiten, bytegleich mit der Drive-Quelle.
