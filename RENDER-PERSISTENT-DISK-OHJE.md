# NHL27 Draft – Render Persistent Disk + Discord

## TÄRKEÄÄ ennen julkaisua

1. Ota talteen nykyinen `data/state.json` ja varmista 23 joukkueen tiedot. Tässä paketissa on lähettämäsi ZIP:n alkuperäinen `data/state.json` (23 joukkuetta).
2. Älä käynnistä draftia ennen kuin tallennus on testattu. Testaa mieluiten erillisellä Render-palvelulla.
3. Vie nämä koodimuutokset GitHub-repositorioon; Renderin GitHub-pohjaisessa deployssa pelkkä ZIP:n lataus omalle koneelle ei päivitä palvelua.
4. Render → palvelu → Disks → Add Disk: Name `nhl27-data`, Mount Path `/var/data`, koko esimerkiksi 1 GB. Levyn lisääminen aiheuttaa deployn ja voi vaikuttaa palvelun saatavuuteen.
5. Render → Environment: `STATE_DIR=/var/data`. Varmista, että Mount Path vastaa tätä täsmälleen.
6. Deploy ja tarkista Logs: palvelin käynnistyy ilman virheitä. Ensimmäisellä käynnistyksellä, jos levy on tyhjä, `data/state.json` kopioidaan levylle. Myöhemmin levyllä oleva tila on ensisijainen.
7. Kirjaudu komissaarina, lataa JSON-varmuuskopio, varmista joukkueet ja tee kokeeksi asetusmuutos. Käynnistä palvelin uudelleen ja tarkista, että muutos säilyi. Älä testaa varsinaista draftia aloittamalla sitä.
8. Säilytä ladattu JSON omalla koneella tai muussa riippumattomassa paikassa. Levyn paikalliset `backups/`-kopiot eivät suojaa koko levyn menetykseltä.

## Discord

Render Environment: `DISCORD_WEBHOOK_URL` = Discord-kanavan webhook-osoite (salainen).
`DISCORD_ROLE_IDS` = JSON-esim. `{"1":"123456789012345678","2":"234567890123456789"}`. Avain on joukkueen id (1–23), arvo Discord-roolin numerotunniste. Webhookilla täytyy olla oikeus mainita rooleja; Discordin rooliasetukset voivat estää maininnat.
Ilmoitukset: varaus, automaattivaraus, seuraavan joukkueen vuoro, draftin aloitus/keskeytys/jatko/päättyminen. Harjoitustilasta ei lähetetä ilmoituksia.

## Turva ja rajoitukset

- JSON-varmuuskopio sisältää kirjautumiskoodit ja salasanan: älä jaa julkisesti.
- Persistent Disk säilyttää tiedot Renderin uudelleenkäynnistyksissä, mutta ei ole itsenäinen ulkoinen varmuuskopio.
- Tallennus kirjoitetaan ensin väliaikaistiedostoon ja siirretään paikalleen atomisesti. Edellisistä tiloista säilytetään 100 paikallista versiota, mutta ne ovat samalla levyllä.
- Jos pysyvä tila puuttuu jo alustetulta levyltä tai JSON on virheellinen, sovellus ei käynnisty tyhjällä tilalla.
- Käynnistyksen jälkeen kesken ollut draft jää turvallisuussyistä keskeytetyksi; komissaari jatkaa sitä manuaalisesti.
- Discord-webhook-ilmoitukset ovat best effort; epäonnistuminen näkyy Renderin logeissa eikä estä varausta.
- Tämä versio ei sisällä ajastettua ulkoista varmuuskopiointia. Lataa JSON säännöllisesti, etenkin ennen draftia ja sen aikana.
