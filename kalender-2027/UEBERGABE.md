# Eddie-Kalender 2027: Integration

Status: Vorschau vorbereitet. Kein Preis beschlossen, kein Checkout verbunden, keine Zahlung oder Auslieferung getestet.

## Enthalten
- Produktseite unter /kalender-2027/ mit 3 unveränderten Vorschaubildern.
- Vorschau-PDF mit 3 Originalseiten.
- Startseitenkarte mit Link zur Vorschau.
- Danke-Route ohne Download und ohne Zahlungsbestätigung.

## Nächster Schritt
Preis festlegen, eigenen Kalender-Checkout anlegen und Auslieferung verbinden. Erst nach einem vollständigen Test der Zahlung, Weiterleitung und Auslieferung die Kaufmöglichkeit aktivieren.

Die vollständige Kauf-PDF bleibt außerhalb des öffentlichen Repositories. Zufallsname und noindex sind keine Zugriffskontrolle. Auch im PR oder Git-Verlauf wäre die Vollversion öffentlich.

Impressum und Datenschutz sind als lokale Seiten vorhanden. Eine rechtliche Prüfung und die Checkout-Texte sind nicht Teil dieser Integration.

Keine neue Testfrist oder Besuchergrenze beschlossen. Tracker-Kriterien unverändert.

## Kaufbutton vorbereitet, weiterhin gesperrt

`#calendar-buy` ist ein nativ deaktivierter Button ohne Checkout-Adresse oder
Klick-Handler. Die kostenlose Vorschau ist weiterhin separat verlinkt.
Zum Freischalten ist ein eigener, bestätigter Kalender-Payment-Link erforderlich;
der bestehende Tracker-Link darf hierfür nicht wiederverwendet werden.

Vor einer separaten Freigabe müssen dokumentiert sein:

1. Bestätigter Preis und korrekte Stripe-Produktbeschreibung (digitales PDF,
   26 Seiten, A4 quer; keine gedruckte Ware).
2. Kostenloser Stripe-Sandbox-Durchlauf inklusive Weiterleitung und tatsächlichem
   Zugriff auf die vollständige, geschützte Kauf-PDF. Vorschau und Danke-Seite
   allein sind kein Auslieferungsnachweis.
3. Prüfung, dass abgebrochene oder fehlgeschlagene Zahlungen keinen Download
   freigeben; ein direkter Danke-Seitenaufruf bestätigt keinen Kauf.
4. Nachweis mit Datum, Testmodus, Ergebnis und Freigabe ohne Kundendaten oder
   geheime URLs im öffentlichen Repository.

Erst danach den deaktivierten Button durch den freigegebenen Stripe-Kauflink
ersetzen und den Verkaufsstatus aktualisieren. Kein Live-Zahlungstest erforderlich.
Der derzeitige Stand erfüllt diese Freigabekriterien noch nicht.
