const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const db = require("./data/db"); // Veritabanı bağlantısı
const cors = require('cors');
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = 3000;
app.listen(port, () => {
    console.log(`Sunucu ${port} portunda başlatıldı`);
});

// Static dosyalar (CSS, JS vs.)
app.use("/static", express.static(path.join(__dirname, "public")));

// Ana sayfa (index.html)
const adminFilePath = path.join(__dirname, "view", "index.html");
app.get('/', (req, res) => {
    res.sendFile(adminFilePath);
});
const adminFilePath2 = path.join(__dirname, "view", "tables.html");
app.get('/tables', (req, res) => {
    res.sendFile(adminFilePath2);
});


// Rota verilerini alma (rota_data endpoint'i)
app.get('/rota_data', (req, res) => {
    const limanlarQuery = 'SELECT port, status FROM rota_data';

    db.query(limanlarQuery, (err, results) => {
        if (err) {
            console.error('Veritabanı sorgusu sırasında hata oluştu:', err.message);
            return res.status(500).send('Liman verileri alınırken veritabanı hatası oluştu.');
        }

        if (results.length === 0) {
            console.error('Veritabanı boş sonuç döndürdü.');
            return res.status(404).send('Liman verileri bulunamadı.');
        }

        res.json(results);
    });
});

// Yakıt türleri verilerini alma (fuel_data endpoint'i)
app.get('/fuel_data', (req, res) => {
    const yakitQuery = 'SELECT Pathway_Name FROM fuel_data';

    db.query(yakitQuery, (err, results) => {
        if (err) {
            console.error('Veritabanı sorgusu sırasında hata oluştu:', err.message);
            return res.status(500).send('Yakıt verileri alınırken veritabanı hatası oluştu.');
        }

        if (results.length === 0) {
            console.error('Veritabanı boş sonuç döndürdü.');
            return res.status(404).send('Yakıt türleri bulunamadı.');
        }

        res.json(results);
    });
});

// Sefer kaydetme (POST request)
app.post('/sefer-kaydet', (req, res) => {
    const vesselName = req.body.vessel_name.trim().replace(/\s+/g, '_');  // Vessel name'i al, boşlukları alt çizgi ile değiştir
    const tableName = `sefer_${vesselName}`;  // Tablo adını vessel name'e göre oluştur

    const seferBilgisi = {
        ayak_sayisi: parseInt(req.body.ayak_sayisi),
        hiz: parseFloat(req.body.speed),
        gunluk_tuketim_sea: parseFloat(req.body.gunluk_tuketim_sea),
        gunluk_tuketim_port: parseFloat(req.body.gunluk_tuketim_port)
    };

    const yakitlar = [];
    for (let i = 1; req.body[`yakit_${i}_adi`]; i++) {
        yakitlar.push(req.body[`yakit_${i}_adi`]);
    }

    const ayaklar = [];
    for (let i = 1; i <= seferBilgisi.ayak_sayisi; i++) {
        const ayak = {
            from: req.body[`from_${i}`],
            to: req.body[`to_${i}`],
            distance: parseFloat(req.body[`distance_${i}`]),
            distance_eca: parseFloat(req.body[`distance_eca_${i}`]),
            port_day: parseFloat(req.body[`port_day_${i}`]),
            speed: seferBilgisi.hiz
        };

        ayak.denizde_kalinan_sure = (ayak.distance + ayak.distance_eca) / (ayak.speed * 24);
        ayaklar.push(ayak);
    }

    // Yeni sea_consumption sütunları ve sea_day sütunları ekleniyor
    const seaDayColumns = yakitlar.map(yakit => `\`${yakit.replace(/\s+/g, '_')}_sea_day\` FLOAT`).join(', ');
    const seaConsumptionColumns = yakitlar.map(yakit => `\`${yakit.replace(/\s+/g, '_')}_sea_consumption\` FLOAT`).join(', ');

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS \`${tableName}\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            from_liman VARCHAR(255) NOT NULL,
            to_liman VARCHAR(255) NOT NULL,
            distance FLOAT NOT NULL,
            distance_eca FLOAT NOT NULL,
            port_day FLOAT NOT NULL,
            speed FLOAT NOT NULL,
            denizde_kalinan_sure FLOAT NOT NULL,
            status VARCHAR(255) NOT NULL,
            gunluk_tuketim_sea FLOAT NOT NULL,
            gunluk_tuketim_port FLOAT NOT NULL,
            ${seaDayColumns},
            ${seaConsumptionColumns},
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.query(createTableQuery, (err, result) => {
        if (err) {
            console.error('Yeni sefer tablosu oluşturma hatası:', err.message);
            return res.status(500).send('Yeni sefer tablosu oluşturma hatası.');
        }
        console.log(`Yeni sefer tablosu (${tableName}) başarıyla oluşturuldu.`);

        ayaklar.forEach((ayak, index) => {
            const fromStatusQuery = 'SELECT status FROM rota_data WHERE port = ?';
            const toStatusQuery = 'SELECT status FROM rota_data WHERE port = ?';

            db.query(fromStatusQuery, [ayak.from], (err, fromResult) => {
                if (err || fromResult.length === 0) {
                    console.error(`From limanı statüsü alınırken hata:`, err ? err.message : 'Liman bulunamadı');
                    return;
                }
                const fromStatus = fromResult[0].status;

                db.query(toStatusQuery, [ayak.to], (err, toResult) => {
                    if (err || toResult.length === 0) {
                        console.error(`To limanı statüsü alınırken hata:`, err ? err.message : 'Liman bulunamadı');
                        return;
                    }
                    const toStatus = toResult[0].status;

                    const status = `${fromStatus}/${toStatus}`;

                    
                    const seaDays = yakitlar.map(yakit => {
                        if (yakit === 'MGO') {
                            return (ayak.distance_eca / (ayak.speed * 24));
                        } else {
                            return (ayak.distance / (ayak.speed * 24));
                        }
                    });

                    
                    const seaConsumptions = seaDays.map(seaDay => seaDay * seferBilgisi.gunluk_tuketim_sea);

                    const insertAyakQuery = `
                        INSERT INTO \`${tableName}\` (from_liman, to_liman, distance, distance_eca, port_day, speed, denizde_kalinan_sure, status, gunluk_tuketim_sea, gunluk_tuketim_port, ${yakitlar.map(yakit => `\`${yakit.replace(/\s+/g, '_')}_sea_day\``).join(', ')}, ${yakitlar.map(yakit => `\`${yakit.replace(/\s+/g, '_')}_sea_consumption\``).join(', ')})
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${seaDays.map(() => '?').join(', ')}, ${seaConsumptions.map(() => '?').join(', ')})
                    `;

                    const ayakValues = [ayak.from, ayak.to, ayak.distance, ayak.distance_eca, ayak.port_day, ayak.speed, ayak.denizde_kalinan_sure, status, seferBilgisi.gunluk_tuketim_sea, seferBilgisi.gunluk_tuketim_port, ...seaDays, ...seaConsumptions];

                    db.query(insertAyakQuery, ayakValues, (err) => {
                        if (err) {
                            console.error(`Ayak ${index + 1} bilgisi eklenirken hata oluştu:`, err.message);
                            return;
                        }
                        console.log(`Ayak ${index + 1} bilgisi başarıyla eklendi.`);
                    });
                });
            });
        });

        res.send('Sefer bilgileri başarıyla kaydedildi.');
    });
});
app.get('/get-tables', (req, res) => {
    const query = `
        SELECT table_name AS name, create_time AS created_at
        FROM information_schema.tables
        WHERE table_schema = 'arkas'  
        ORDER BY create_time DESC
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error('Tablolar alınırken hata oluştu:', err.message);
            return res.status(500).send('Tablolar alınırken hata oluştu.');
        }
        res.json(result);
    });
});
