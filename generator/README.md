# Aarrejahti – karttakorttigeneraattori

Puhelimella käytettävä lisäosa fyysiseen Aarrejahti-lautapeliin.

**Avaa:** https://ymouse91.github.io/aarrejahti/generator/

Arvo kortti, aseta kuviot laudalle ja ota valitun retken vihjekortit esiin. Näytöllä on yksi retki kerrallaan. Retkien järjestys on 1–4, harha, pääkallo. Ratkaisun tarkistus käyttää päivitetyn ratkaisukortin 314160 avainkoodeja. Mukana ovat kaikki vihjekortit 1–68. Sovelluksen versio on 1.1.0.

## Asennus ja offline-käyttö

- iPhone/iPad: avaa linkki Safarissa, valitse **Jaa → Lisää Koti-valikkoon**.
- Android: avaa linkki Chromessa ja valitse **Asenna sovellus** tai **Lisää aloitusnäyttöön**.
- Tietokone: käytä selaimen asennustoimintoa.

Generaattorin kuvake on violetti. Ensimmäinen avaus vaatii verkkoyhteyden. Kun sovellus on latautunut ja offline-välimuisti valmistunut, myös uusien korttien arvonta toimii ilman verkkoyhteyttä.

Sovellus on staattinen PWA: ei käyttäjätiliä, palvelinlaskentaa tai ulkoisia kirjastoja. Manifesti, kuvakkeet ja service worker ovat tässä hakemistossa. Välimuisti ja sovelluksen asennustunniste ovat erilliset pääpelistä.
