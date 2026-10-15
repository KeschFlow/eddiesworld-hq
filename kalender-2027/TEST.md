# Kalender 2027 – minimale Stripe-Testkonfiguration

Status: vorbereitet, nicht in Stripe angelegt und nicht Ende-zu-Ende getestet.
Der vorhandene Kalender-Link ist ein Live-Link. Nicht zum Testen verwenden.
`tracker_test=1`, `client_reference_id=test_*` und URL-Parameter schalten Stripe
nicht in den Testmodus. Auch kein manuelles Umschreiben des Live-Links.

## Einmalige Einrichtung im bestehenden Stripe-Konto

Eine berechtigte Person öffnet eine Stripe-Sandbox bzw. den Testmodus und prüft
die sichtbare Testkennzeichnung. Nur dort konfigurieren:

| Feld | Testwert |
| --- | --- |
| Produkt | Mit Eddie durchs Jahr – Kalender 2027 |
| Beschreibung | Digitales PDF, 26 Seiten, A4 quer, Selbstausdruck |
| Preis | 4,90 EUR, einmalig; endgültig angezeigten Gesamtbetrag prüfen |
| Zahlung | Karte; nur Testzahlungsmittel verwenden |
| Payment Link | Neu in dieser Sandbox anlegen, nicht Live-Link kopieren |
| Nach Abschluss | Weiterleitung auf bestehende `/kalender-2027/danke/`-Route |
| Auslieferung | Noch festzulegen; kein öffentlicher Kauf-PDF-Link |

Für einen reinen Dashboard-/Payment-Link-Test sind keine API-Schlüssel,
Webhooks oder neuen Dienste erforderlich. Sandbox-Payment-Link nur separat
öffnen; nicht anstelle des Live-Links in die öffentliche Produktseite einbauen.
Die Weiterleitung kann auf die bestehende Domain zeigen, bestätigt dort aber
keine Zahlung und liefert derzeit keine Datei aus. Lokale Änderungen an der
Danke-Seite sind vor einem Deployment nur lokal prüfbar.

## Testdurchführung ohne Echtgeld

1. Testkennzeichnung, Kalendername und Gesamtpreis 4,90 EUR im Checkout prüfen.
2. Erfolgsfall mit Stripe-Testkarte `4242 4242 4242 4242`, zukünftigem Ablaufdatum
   und beliebigem gültigen Test-CVC durchführen. Nur im bestätigten Testmodus.
   Keine echten Kundendaten verwenden; nur eine eigene kontrollierte Testadresse.
3. In derselben Sandbox den erfolgreichen Zahlungsstatus prüfen. Ein Redirect,
   eine Bestell-E-Mail oder eine `session_id` allein sind kein Nachweis.
4. Weiterleitung prüfen. Die aktuelle Danke-Seite darf weiterhin keine Zahlung
   bestätigen und keinen Download anzeigen.
5. Ablehnung mit Stripe-Testkarte `4000 0000 0000 0002` und separaten Abbruch
   vor dem Bezahlen prüfen. Beide dürfen keine Auslieferung auslösen.
6. Danke-Seite direkt und mit erfundenen Zahlungsparametern öffnen: weder
   Zahlungserfolg noch Dateizugriff dürfen daraus abgeleitet werden.
7. Sobald der vorhandene Auslieferungsweg vereinbart ist: erfolgreiche Testzahlung
   bis zum tatsächlichen Empfang der separaten vollständigen 26-Seiten-PDF prüfen.
   Bei manueller Zustellung zuvor den Sandbox-Zahlungsstatus kontrollieren;
   abgelehnte/abgebrochene Zahlungen dürfen keine Zustellung erhalten.

Offizielle Referenzen:
- https://docs.stripe.com/testing
- https://docs.stripe.com/payment-links/post-payment

## Ergebnisprotokoll ohne sensible Daten

| Prüfung | Stand |
| --- | --- |
| Produktseite/Vorschau lokal, Desktop/Mobil | bestanden |
| Kalender-Kaufbutton weiter deaktiviert | bestanden |
| Danke-Seite ohne unbelegte Erfolgsbestätigung/Download | bestanden |
| Sandbox und eigener Test-Payment-Link | fehlt |
| Kalendername und Preis im Stripe-Testcheckout | nicht geprüft |
| Erfolgreiche Testzahlung und tatsächliche Weiterleitung | nicht geprüft |
| Ablehnung/Abbruch in Stripe | nicht geprüft |
| Empfang und Inhalt der vollständigen Kauf-PDF | nicht geprüft |

Bei Durchführung Datum, Testkennzeichnung und Ergebnis ergänzen. Keine
Kundendaten, Zugangsdaten, geheimen Download-URLs oder Screenshots mit solchen
Daten ins öffentliche Repository aufnehmen. Das lokale Bestehen der Prüfungen
ist keine Freigabe des Verkaufs. Keine automatische Auslieferung eingerichtet.
