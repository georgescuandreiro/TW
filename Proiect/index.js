const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 8080;

// Servește fișierele statice
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// Middleware pentru a verifica accesul la folderele din `/resurse` fără specificarea unui fișier
app.use('/resurse', (req, res, next) => {
    const requestedPath = path.join(__dirname, 'resurse', req.path);
    if (fs.existsSync(requestedPath) && fs.lstatSync(requestedPath).isDirectory()) {
        return afisareEroare(res, 403);
    }
    next();
});

// Middleware pentru a gestiona cererile către fișiere `.ejs`
app.use((req, res, next) => {
    if (req.path.endsWith('.ejs')) {
        return afisareEroare(res, 400, "Cerere invalidă", "Nu puteți accesa direct fișierele de template.", "400.png");
    }
    next();
});

// Ruta pentru favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse/favicon/favicon.ico'));
});

// Setează EJS ca motor de template-uri
app.set('view engine', 'ejs');

// Setează folderul pentru vizualizări
app.set('views', path.join(__dirname, 'views'));

// Variabilă globală pentru erori
const obGlobal = {
    obErori: null
};

// Inițializează erorile din JSON
function initErori() {
    const continut = fs.readFileSync(path.join(__dirname, 'erori.json'));
    obGlobal.obErori = JSON.parse(continut);
    obGlobal.obErori.info_erori.forEach(eroare => {
        eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
    });
}

initErori();

// Funcția pentru afișarea erorilor
function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(err => err.identificator === identificator);
    if (!eroare) {
        eroare = obGlobal.obErori.eroare_default;
    }
    if (titlu) eroare.titlu = titlu;
    if (text) eroare.text = text;
    if (imagine) eroare.imagine = path.join(obGlobal.obErori.cale_baza, imagine);

    res.status(eroare.status ? 403 : 200).render('pagini/eroare', eroare);
}

// Funcție pentru obținerea IP-ului utilizatorului
function getClientIp(req) {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

// Rute pentru paginile principale
app.get(['/', '/index', '/home'], (req, res) => {
    const userIp = getClientIp(req);
    res.render('pagini/index', {
        titlu: 'Gadget Haven',
        descriere: 'Descoperă gadgeturile viitorului la GadgetHaven, unde tehnologia se împletește cu pasiunea și inovația prinde viață.',
        ip: userIp
    });
});

// Rută generală pentru pagini
app.get('/*', (req, res) => {
    const userIp = getClientIp(req);
    const pagina = req.params[0];
    console.log(`Cerere pentru pagina: ${pagina}`); // Adăugăm log
    res.render(`pagini/${pagina}`, { ip: userIp }, (err, html) => {
        if (err) {
            console.error(`Eroare la randarea paginii: ${err.message}`); // Log eroare
            if (err.message.includes('Failed to lookup view')) {
                return afisareEroare(res, 404);
            } else {
                return afisareEroare(res, 500);
            }
        }
        res.send(html);
    });
});

// Ascultă pe portul specificat
app.listen(port, () => {
    console.log(`Serverul rulează la http://localhost:${port}`);
    console.log(`Calea folderului: ${__dirname}`);
    console.log(`Calea fișierului: ${__filename}`);
    console.log(`Folderul curent de lucru: ${process.cwd()}`);
});

// Vector de foldere pentru crearea acestora
const vect_foldere = ["temp"];

vect_foldere.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
});
