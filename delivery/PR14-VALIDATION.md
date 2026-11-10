# PR #14 — Validierungsstatus und externe Blocker

## Implementierter Stand (nicht deployt)

`delivery/worker.mjs` erwartet eine explizite `DELIVERY_MODE` (`test` oder `live`) und weist Schlüssel mit falschem Prefix ab (`sk_test_` bzw. `sk_live_`). Im Testmodus akzeptiert es ausschließlich `cs_test_` Sessions mit `livemode=false`; im Live-Modus ausschließlich `cs_live_` Sessions mit `livemode=true`. Die Prüfung verlangt weiterhin eine abgeschlossene und bezahlte Checkout-Session, genau eine passende Einmal-Position, exakte Price-/Product-ID und den konfigurierten Betrag/Währung, erfolgreichen PaymentIntent und belastete Charge ohne Refund oder Dispute. Kalender ist fest auf 666 EUR-Cent gesetzt; Tracker bleibt 490 Cent. Jeder Download validiert Stripe erneut, bevor `PRODUCT_FILES.get()` aufgerufen wird.

Die Tests in `tests/delivery.test.mjs` verwenden ausschließlich gefälschte Stripe-/R2-Antworten und Platzhalter-Schlüssel. Kein Geheimnis, echter Käuferdatensatz, Stripe-Aufruf, Produktupdate oder Deployment ist Bestandteil dieser Änderung.

## Externe Konfigurationsblocker — vor Live-Freigabe zwingend

- **Live-Stripe-Zuordnung nicht unabhängig bestätigt:** Die im bisherigen `delivery/README.md` dokumentierten Kalender-IDs `price_1UaBzKA2B4kHryh7DtZFO3Dp` und `prod_VRpIYK7uCrYyvV` sind Betreiberangaben. Zugriff auf Stripe/API und Live-Testzahlung fehlen; Existenz, Konto-/Moduszuordnung, EUR-Währung, 666-Cent-Einmalpreis und Produktbeziehung sind nicht nachgewiesen. Keine bestehende Preis-/Produktkonfiguration ändern.
- **Secrets nicht gesetzt oder geprüft:** Produktiver `STRIPE_SECRET_KEY` und mindestens 32 Zeichen langer `DOWNLOAD_SIGNING_KEY` müssen über Cloudflare Secret-Verwaltung im passenden Environment gesetzt werden. Werte dürfen nicht in Git, Logs oder PR-Kommentare gelangen. Hier wurde weder ein Secret gespeichert noch dessen Cloudflare-Binding bestätigt.
- **Worker-Runtime / Route nicht verifiziert:** Im Repository ist kein Wrangler-Deployment-Manifest bzw. produktiver Worker-Einstiegspunkt nachgewiesen. Einbindung des Moduls in den bestehenden Worker und Routing der same-origin POST-Routen `/api/delivery/authorize` und `/api/delivery/download` müssen im zuständigen Cloudflare-Projekt geprüft werden; der Repository-Quelltext beweist keine produktive Route.
- **Privates R2 nicht verifiziert:** `PRODUCT_FILES` muss ein bestehendes privates R2-Binding mit `head`/`get` sein. Bucket-Privatsphäre, tatsächliche Bindung, Objektschlüssel und Abwesenheit öffentlicher `r2.dev`-/Custom-Domain-Zugriffe wurden nicht nachgewiesen. Keine PDF hochgeladen.
- **Verkaufsdatei fehlt als Nachweis:** Vollständigkeit und richtige Kalender-PDF im privaten Speicher sind nicht verifiziert. Die erfolgreiche Simulation beweist keine reale Auslieferung.
- **Live-End-to-End-Test ausstehend:** Nach bestätigter Konfiguration sind im autorisierten Verfahren Live-Checkout, richtige Session, Download, falscher Betrag, Refund und R2-Fehler zu prüfen. Dies wurde hier nicht ausgeführt.

Daher bleibt der PR **nicht freigabefähig für Merge/Deployment**, bis die externen Prüfungen mit zuständigem Zugriff abgeschlossen und dokumentiert sind. Kein Deployment aus diesem PR.

## Prüfschritte

- **PASS (Quellcode-Review):** Modusgebundene Key-/Session-/Stripe-`livemode`-Prüfung; Beträge 666/490 Cent getrennt; bestehende Charge-, Refund-, Produkt- und R2-Kontrollen bleiben erhalten.
- **PASS (Testfälle hinzugefügt):** Erfolg, falscher Betrag, fehlende/unvollständige/unbezahlte Zahlung, fehlgeschlagener Intent, Refund nach Token-Ausstellung, unberechtigter PDF-Zugriff, Modus-/Produktabweichung und Tracker-Preis.
- **NOT RUN:** `node --test tests/delivery.test.mjs` konnte in dieser GitHub-Änderungssitzung nicht ausgeführt werden (keine Shell-/Runtime-Ausführung verfügbar). CI muss den Lauf bestätigen.
- **BLOCKED:** Live-Stripe-IDs/Secrets, Cloudflare-Route und private R2-Bindung, tatsächliche PDFs sowie Live-End-to-End-Verifikation.
- **PASS (Sicherheitsgrenzen):** Keine Secrets gespeichert, keine Stripe-Produkte verändert und nichts deployed.
