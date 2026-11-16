# Aarrejahti

PC:llä ja iPadilla pelattava yhteinen päättelypeli: yksi kartta ja kuusi retkeä.

Pelaa: https://ymouse91.github.io/aarrejahti/

iPad: avaa peli Safarissa ja valitse Jaa → Lisää Koti-valikkoon. PC:llä pelin voi asentaa selaimen asennustoiminnolla. Ensimmäinen avaus vaatii verkkoyhteyden. Kun peli on latautunut, se toimii myös ilman verkkoyhteyttä. Pelin sisäinen Ohje kertoo säännöt.

Lautapelin mobiili karttakorttigeneraattori: https://ymouse91.github.io/aarrejahti/generator/

Generaattori on erillinen asennettava PWA violetilla kuvakkeella. Se arpoo uusia kuuden retken karttakortteja fyysiseen peliin ja toimii ensimmäisen latauksen jälkeen myös offline-tilassa. Lautapelin painettavia aineistoja ei julkaista tässä repositoriossa.

GitHub Pages julkaisee main-haaran juurihakemiston. Sovellus ei tarvitse palvelinpuolta eikä ulkoisia kirjastoja.

## PC/iPad-pelin päivitys

Kolmiportainen liukusäädin: Tavallinen (kolmen tavallisen retken D1-keskiarvo alle 550), Keskitaso (550–749), Haastava (vähintään 750; jokainen tavallinen vähintään 400). Retkityypit ja merkkimäärät säilyvät. Vanhat vihjeet 61–465 korvataan kaikkien kuuden merkkityypin yhtä kaukana-, lähempänä- sekä 1–2 askeleen erotusvariaatioilla. Vihjeitä on yhteensä 163; summavihjeitä ei käytetä. Sama vihje enintään kahdesti, ei peräkkäisillä retkillä.

Aina tuore arvonta, enintään neljä rinnakkaista taustatyöntekijää. Tiedostosta avattu peli jaksottaa laskennan. Laudan keskellä näkyy sävyiltään kiertävä kehrä. Yläkulmassa näytetään retken pisteet ja koko kortin yhteispisteet. iPadin vaaka-asettelu ja lyhyemmät selitykset on tarkistettu WebKitillä. PWA-välimuisti on `aarrejahti-v14`; päivitys aktivoituu automaattisesti.

Testit: `node tests/rounds.cjs`, `node tests/browser.cjs`. Selaintestit käyttävät Playwrightia paikallisesta codex-tools-asennuksesta. Haastavan haku voi kestää muita tasoja kauemmin.

Retket 1–3 järjestetään D1-vaikeuden mukaan helpoimmasta vaikeimpaan ennen kortin näyttämistä. Toistorajat tarkistetaan lopullisessa järjestyksessä. Tasosäädin näyttää vain valitun tason nimen ja mahtuu iPhonessa muiden toimintojen rinnalle. PWA-välimuisti: `aarrejahti-v15`.
