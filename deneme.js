const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const db = require("./data/db"); 
const cors = require('cors');
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = 3000;
app.listen(port, () => {
    console.log(`Sunucu ${port} portunda başlatıldı`);
});


app.use("/static", express.static(path.join(__dirname, "public")));


const adminFilePath = path.join(__dirname, "view", "index.html");
app.get('/', (req, res) => {
    res.sendFile(adminFilePath);
});
const adminFilePath2 = path.join(__dirname, "view", "tables.html");
app.get('/tables', (req, res) => {
    res.sendFile(adminFilePath2);
});



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

// Yakıt verilerini GET isteği ile al
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

// Sefer kaydetme POST isteği
app.post('/sefer-kaydet', async (req, res) => {
    const vesselName = req.body.vessel_name.trim().replace(/\s+/g, '_');
    const tableName = `sefer_${vesselName}`;

    const seferBilgisi = {
        hiz: parseFloat(req.body.speed),
        gunluk_tuketim_sea: parseFloat(req.body.gunluk_tuketim_sea),
        gunluk_tuketim_port: parseFloat(req.body.gunluk_tuketim_port)
    };

    const yakitlar = [];
    for (let i = 1; req.body[`yakit_${i}_adi`]; i++) {
        yakitlar.push(req.body[`yakit_${i}_adi`]);
    }

    const ayaklar = [];
    let i = 1;
    while (req.body[`from_${i}`] && req.body[`to_${i}`]) {
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
        i++;
    }

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

    try {
        // Tablo oluşturma
        await queryAsync(db, createTableQuery);
        console.log(`Yeni sefer tablosu (${tableName}) başarıyla oluşturuldu.`);

        // Ayakları sırayla ekle
        const ayakInsertPromises = ayaklar.map(async (ayak) => {
            const fromStatus = await queryAsync(db, 'SELECT status FROM rota_data WHERE port = ?', [ayak.from]);
            const toStatus = await queryAsync(db, 'SELECT status FROM rota_data WHERE port = ?', [ayak.to]);

            if (fromStatus.length === 0 || toStatus.length === 0) {
                throw new Error('Liman statüsü bulunamadı');
            }

            const status = `${fromStatus[0].status}/${toStatus[0].status}`;

            const seaDays = yakitlar.map(yakit => {
                if (yakit === 'MGO') {
                    return ayak.distance_eca / (ayak.speed * 24);
                } else {
                    return ayak.distance / (ayak.speed * 24);
                }
            });

            const seaConsumptions = seaDays.map(seaDay => seaDay * seferBilgisi.gunluk_tuketim_sea);

            const insertAyakQuery = `
                INSERT INTO \`${tableName}\` (from_liman, to_liman, distance, distance_eca, port_day, speed, denizde_kalinan_sure, status, gunluk_tuketim_sea, gunluk_tuketim_port, ${yakitlar.map(yakit => `\`${yakit.replace(/\s+/g, '_')}_sea_day\``).join(', ')}, ${yakitlar.map(yakit => `\`${yakit.replace(/\s+/g, '_')}_sea_consumption\``).join(', ')})
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${seaDays.map(() => '?').join(', ')}, ${seaConsumptions.map(() => '?').join(', ')})
            `;

            const ayakValues = [ayak.from, ayak.to, ayak.distance, ayak.distance_eca, ayak.port_day, ayak.speed, ayak.denizde_kalinan_sure, status, seferBilgisi.gunluk_tuketim_sea, seferBilgisi.gunluk_tuketim_port, ...seaDays, ...seaConsumptions];

            await queryAsync(db, insertAyakQuery, ayakValues);
            console.log(`Ayak bilgisi başarıyla eklendi.`);
        });

        // Tüm ayak eklemeleri tamamlanana kadar bekle
        await Promise.all(ayakInsertPromises);

        res.send('Sefer bilgileri başarıyla kaydedildi.');
    } catch (error) {
        console.error('Hata oluştu:', error.message);
        res.status(500).send('Sefer bilgileri kaydedilirken hata oluştu.');
    }
});

// Promisify db.query
function queryAsync(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}
