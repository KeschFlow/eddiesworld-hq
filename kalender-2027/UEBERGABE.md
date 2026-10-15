# Eddie-Kalender 2027: Verkaufsvorbereitung

## Produkt und aktueller Stand

Mit Eddie durchs Jahr – Kalender 2027. Vorgabe: 4,90 € einmalig,
digitales PDF mit 26 Seiten, A4 quer, Selbstausdruck.

Der vom Nutzer gelieferte Kalender-Payment-Link ist am deaktivierten
`#calendar-buy` als `data-checkout-url` hinterlegt. Beschriftung:
„Kalender kaufen – 4,90 €“. Das Datenattribut löst keine Navigation aus;
es gibt keinen Klick-Handler. Vorschau und Produktkarten bleiben unverändert.
Stripe-Produkt, Preis und Testmodus sind noch nicht unabhängig bestätigt.
Der Verkaufsstart ist nicht freigegeben.

## Untersuchung des bestehenden Trackers

1. Checkout: https://buy.stripe.com/eVq3cu2zM8bx1Yhe7t8Ra00
   Die Produktseite ergänzt `client_reference_id` zur Quellenzuordnung.
   Diese Referenz prüft keine Zahlung.
2. Vorhandene Danke-Seite: `/tracker/danke/`. Eine tatsächlich in Stripe
   eingestellte Erfolgsweiterleitung ist aus dem Repository nicht ersichtlich.
3. Die Danke-Seite verlinkt per HTML-Download auf eine PDF im öffentlichen
   `downloads`-Verzeichnis. Es gibt keinen serverseitigen Zahlungscheck.
4. Die PDF ist ohne Anmeldung und ohne Zahlung direkt erreichbar. Zufallsname
   und `noindex,nofollow` der Danke-Seite sind keine Zugriffskontrolle.
5. Im Repository gibt es keine Checkout-Session-Prüfung, Webhook-Verarbeitung,
   signierten Downloads oder E-Mail-Auslieferung. Externe Stripe-Einstellungen
   könnten zusätzliche Abläufe enthalten; sie wurden nicht eingesehen.
   `tracker/TEST.md` nennt den Sandbox-Zahlungsdurchlauf weiterhin als offen.

## Kalender-Auslieferung: Entscheidung vor Freigabe nötig

Die bestehende Produktseite und `/kalender-2027/danke/` werden wiederverwendet.
Die Danke-Seite bestätigt keine Zahlung und enthält keinen Download.
Der ungeschützte Tracker-Download wird nicht als Zahlungsschutz übernommen.
Die vollständige Kalender-Kauf-PDF ist im untersuchten Checkout nicht vorhanden
und wird nicht ins öffentliche Repository kopiert. Das Drive-Original bleibt privat.

Minimale Verbesserung ohne neues Backend oder Abo: Zahlungen im bestehenden
Stripe-Dashboard anhand des tatsächlichen erfolgreichen Zahlungsstatus prüfen
und die separate Verkaufsdatei anschließend über einen bereits vorhandenen
E-Mail-Weg manuell zustellen. Das ist ein Vorschlag, noch kein eingerichteter
oder getesteter Prozess. Vor Verwendung müssen Zuständigkeit, vorhandener
Mail-Weg und Lieferhinweis im Checkout bestätigt und getestet werden.
Eine Stripe-Erfolgsweiterleitung allein ist kein Zahlungsnachweis.

Eine ausschließlich statische GitHub-Pages-Seite kann einen Zahlungsstatus
nicht vertrauenswürdig prüfen oder eine öffentliche PDF schützen. Eine
`session_id` im URL-Parameter würde das ebenfalls nicht lösen. Stripe-Geheimnisse
gehören niemals ins Browser-JavaScript. Falls automatische Auslieferung nötig
ist, zuerst bereits vorhandene externe Funktionen prüfen; keine neue Plattform
oder Backend-Architektur ist Teil dieser Änderung.

## Noch erforderlicher kostenloser Sandbox-Test

- Vorhandenen Sandbox-Payment-Link und den tatsächlichen Auslieferungsweg klären.
- Korrektes Kalenderprodukt, 4,90 € einmalig und Produktbeschreibung bestätigen;
  keine Verwechslung mit dem Tracker.
- Erfolgreiche Testzahlung, konfigurierte Weiterleitung und tatsächlichen Empfang
  der vollständigen 26-seitigen Verkaufsdatei nachweisen.
- Abbruch und fehlgeschlagene Zahlung dürfen weder als Erfolg erscheinen noch
  die Auslieferung auslösen. Auch direkter Danke-Aufruf und erfundene
  Session-Parameter dürfen keine Zahlung bestätigen.
- Ergebnisse mit Datum und ohne Kundendaten, geheime Download-URLs oder
  Zugangsdaten dokumentieren.

Erst nach erfolgreichem Ende-zu-Ende-Test und Freigabe den deaktivierten Button
in einen Kauf-Link mit dem bestätigten Kalender-Payment-Link umwandeln, den
Verkaufsstatus auf Produktseite, Danke-Seite und Startseitenkarte aktualisieren
und erneut Desktop/Mobilansicht und Links prüfen. Kein Echtgeldtest erforderlich.

## Bisherige technische Validierung und Grenzen

Lokale Tests prüfen Vorschau, Route, Preistext, hinterlegten Kalender-Link,
fortbestehende Kaufsperre und neutrale Danke-Seite. Sie ersetzen keinen
Stripe-/Auslieferungstest. In der untersuchten Umgebung fehlen Stripe-spezifische
Variablen und eine Stripe-Anbindung; ein HTTPS-Zugriff auf den angegebenen
Payment-Link wird vom Netzwerkproxy mit CONNECT 403 abgewiesen.
Keine Zahlung wurde ausgelöst. Keine neue Infrastruktur und kein Deployment.
