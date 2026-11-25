# Flusso rilascio icemanai.it (compito #251)

1. Modificare **solo** questa cartella (`siti\icemanai-sito`), mai `area_lavoro\siti\icemanai-sito` per il publish.
2. Eseguire da PowerShell:
   ```
   .\prepubblica_icemanai.ps1
   ```
   Deve stampare `ENCODING CHECK OK` e `Pre-publish OK`.
3. Solo dopo: `pubblica_sito` (MCP Iceman) con messaggio commit.

## Cosa controlla lo script
- Sequenze mojibake (`Ã¨`, `Â·`, `â€™`, …)
- Escape letterali `\u00..` in HTML/JS (errore introdotto in #249)
- `Quantita` senza accento
- Meta charset UTF-8 nelle pagine HTML

## Test negativo (regressione)
Da repo canonico:
```
python verifica_encoding_pre_publish.py --caso-negativo
```
Deve uscire con codice **1** sulla fixture `area_lavoro\compito251\fixture_corrotto`.
