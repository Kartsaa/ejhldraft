# NHL 27 — suomenkielinen versio ja palkkakatto

## Päivittäminen
1. Pysäytä vanha palvelin (`Ctrl+C`).
2. Ota varmuuskopio vanhasta `data/state.json`-tiedostosta.
3. Kopioi tämän paketin `server.js` ja koko `public/`-kansion sisältö vanhaan sovellukseen. Säilytä oma `data/`-kansiosi.
4. Käynnistä `npm start` ja päivitä selain tarvittaessa Ctrl+F5.

Voit myös käyttää tätä ZIP-pakettia uutena asennuksena: `npm install` ja `npm start`.

## Pelaajatiedosto
Ensimmäisen Excel-välilehden ensimmäiselle riville sarakkeet:
`Nimi | Pelipaikka | KOK | Pituus | Paino | Kätisyys | Kyvyt | Palkka`

Esimerkkirivi:
`Esimerkkipelaaja | RW | 92 | 6'1\" | 194 | R | :e_qr: :as_1t: | 5222222`

**Suositus: käytä Palkka-sarakkeessa kokonaisia dollareita ilman erottimia** (`5222222`). Myös `5.222M` ja `5,222M` toimivat ja tarkoittavat 5 222 000 dollaria. `5.222M` ei tarkoita 5 222 222 dollaria. Tyhjä palkka = 0 $, joten tarkista puuttuvat arvot ennen varausta. Vanhoja englanninkielisiä sarakenimiä tuetaan edelleen.

## Palkkakatto
Komissaarin hallinta → `Palkkakatto ($, kokonaisluku)`, esim. `95500000` = 95,5 M$. Oletusarvo on vain sovelluksen lähtöasetus, ei väite virallisesta NHL 27 -palkkakatosta. Asetus tallentuu `data/state.json`-tiedostoon kenttään `salaryCapCeiling`.

Jokaisen joukkueen palkkasumma lasketaan varattujen pelaajien Palkka-arvoista. Palvelin estää varauksen, joka ylittäisi joukkueen palkkakaton. Automaattinen varaus valitsee vain palkkakattoon mahtuvia pelaajia. Jos sopivaa pelaajaa ei löydy, varaus keskeytyy komissaarin käsiteltäväksi. Joukkueiden palkkasummat ja jäljellä oleva tila näkyvät kokoonpanon yhteydessä.

**Huom:** Tämä on yksinkertainen fantasy-varauksen palkkakatto, ei NHL:n täydellinen palkkakatto- tai sopimussääntömalli. Vanhoista tallennetuista pelaajista, joilta puuttuu Palkka, tulee 0 $; tuo uusi pelaajatiedosto ennen varsinaista varausta, jos haluat käyttää palkkakattoa.

## Kykykuvat
Kuvat ovat `public/xfactors/`-kansiossa. Lisää uusia kykykoodeja `public/app.js`-tiedoston `XFACTOR_ICONS`-määrittelyyn. Nykyiset kuvat ovat esimerkkikuvia, eivät virallista pelitaidetta.
