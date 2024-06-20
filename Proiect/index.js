const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass'); // Înlocuit node-sass cu sass
const sharp = require('sharp'); // Pentru redimensionarea imaginilor

const app = express();
const port = 8080;

// Variabile globale
const obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, 'resurse/scss'),
    folderCss: path.join(__dirname, 'resurse/css')
};

// Funcția de compilare SCSS
const compileazaScss = (caleScss, caleCss) => {
    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }
    if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }

    const backupPath = path.join(__dirname, 'backup', 'resurse', 'css');
    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }

    const cssFileName = path.basename(caleScss, '.scss') + '.css';
    const cssBackupPath = path.join(backupPath, cssFileName);

    if (fs.existsSync(caleCss)) {
        fs.copyFileSync(caleCss, cssBackupPath);
    }

    try {
        const result = sass.renderSync({ file: caleScss });
        fs.writeFileSync(caleCss, result.css);
        console.log(`Compilare SCSS reușită: ${caleScss} -> ${caleCss}`);
    } catch (err) {
        console.error(`Eroare la compilarea SCSS: ${err.message}`);
    }
};

// Funcția pentru compilarea inițială a tuturor fișierelor SCSS
const compileazaToateScss = () => {
    fs.readdirSync(obGlobal.folderScss).forEach(file => {
        if (path.extname(file) === '.scss') {
            const caleScss = path.join(obGlobal.folderScss, file);
            const caleCss = path.join(obGlobal.folderCss, path.basename(file, '.scss') + '.css');
            compileazaScss(caleScss, caleCss);
        }
    });
};

// Monitorizarea modificărilor în fișierele SCSS
fs.watch(obGlobal.folderScss, (eventType, filename) => {
    if (filename && path.extname(filename) === '.scss') {
        const caleScss = path.join(obGlobal.folderScss, filename);
        const caleCss = path.join(obGlobal.folderCss, path.basename(filename, '.scss') + '.css');
        compileazaScss(caleScss, caleCss);
    }
});

// Funcția de redimensionare a imaginilor
const resizeImage = (imagePath, width, outputPath) => {
    sharp(imagePath)
        .resize(width)
        .toFile(outputPath, (err) => {
            if (err) {
                console.error('Error resizing image:', err);
            }
        });
};

// Call this function when your server starts or when you add new images
const generateResizedImages = () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "resurse/imagini/imagini.json")));
    data.imagini.forEach(image => {
        const imagePath = path.join(__dirname, "resurse", "imagini", image.cale_imagine);
        const smallImagePath = path.join(__dirname, "resurse", "imagini", 'small_' + image.cale_imagine);
        const mediumImagePath = path.join(__dirname, "resurse", "imagini", 'medium_' + image.cale_imagine);

        resizeImage(imagePath, 300, smallImagePath);
        resizeImage(imagePath, 600, mediumImagePath);
    });
};

// Generate resized images when the server starts
generateResizedImages();

// Setează EJS ca motor de template-uri
app.set('view engine', 'ejs');

// Setează folderul pentru vizualizări
app.set('views', path.join(__dirname, 'views'));

// E7 Servește fișierele statice
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// E17 Middleware pentru a verifica accesul la folderele din `/resurse` fără specificarea unui fișier
app.use('/resurse', (req, res, next) => {
    const requestedPath = path.join(__dirname, 'resurse', req.path);
    if (fs.existsSync(requestedPath) && fs.lstatSync(requestedPath).isDirectory()) {
        return afisareEroare(res, 403);
    }
    next();
});

// E4 P17
// app.get("/resurse/*", (req, res) => {
//     console.log("You are not allowed here WARN");
//     res.render(
//       path.join(__dirname, "Proiect", "views", "pagini", "403_forbidden.ejs")
//     );
//   });

// E19 Middleware pentru a gestiona cererile către fișierele `.ejs`
app.use((req, res, next) => {
    if (req.path.endsWith('.ejs')) {
        return afisareEroare(res, 400, "Cerere invalidă", "Nu puteți accesa direct fișierele de template.", "400.png");
    }
    next();
});

// E18 Ruta pentru favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse/favicon/favicon.ico'));
});

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

// Helper function to get current quarter of the hour
const getQuarter = (date) => {
    const minutes = date.getMinutes();
    if (minutes < 15) return 1;
    if (minutes < 30) return 2;
    if (minutes < 45) return 3;
    return 4;
};

// Read image data from JSON file
const getImageData = (customDate = null) => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "resurse/imagini/imagini.json")));
    const date = customDate || new Date();
    const currentQuarter = getQuarter(date);
    const filteredImages = data.imagini.filter(img => img.sfert_ora == currentQuarter).slice(0, 10);
    console.log(`Date: ${date}, Current Quarter: ${currentQuarter}, Images: ${filteredImages.map(img => img.titlu).join(', ')}`);
    return { images: filteredImages, galleryPath: data.cale_galerie };
};

// E8 Rute pentru paginile principale
app.get(['/', '/index', '/home'], (req, res) => {
    const userIp = getClientIp(req);
    const { images, galleryPath } = getImageData();
    res.render('pagini/index', {
        titlu: 'Gadget Haven',
        descriere: 'Descoperă gadgeturile viitorului la GadgetHaven, unde tehnologia se împletește cu pasiunea și inovația prinde viață.',
        ip: userIp,
        images: images,
        galleryPath: galleryPath
    });
});

// Ruta pentru galerie (pentru testare)
app.get("/gallery", (req, res) => {
    const { hour, minute } = req.query;
    const testDate = new Date();
    if (hour) testDate.setHours(parseInt(hour));
    if (minute) testDate.setMinutes(parseInt(minute));
    const { images, galleryPath } = getImageData(testDate);
    res.render("pagini/gallery", { 
        images: images, 
        galleryPath: galleryPath,
    });
});

// E9 + E10 Rută generală pentru pagini
app.get('/*', (req, res) => {
    const userIp = getClientIp(req);
    const pagina = req.params[0];
    const { images, galleryPath } = getImageData();
    console.log(`Cerere pentru pagina: ${pagina}`); // Adăugăm log
    res.render(`pagini/${pagina}`, { 
        ip: userIp, 
        descriere: 'Descriere generică pentru pagină',
        images: images,
        galleryPath: galleryPath
    }, (err, html) => {
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

// E20 Vector de foldere pentru crearea acestora
const vect_foldere = ["temp", "backup"];

vect_foldere.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
});

// Compilare inițială a SCSS-urilor
compileazaToateScss();
