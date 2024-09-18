const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require('cors');
const db = require("./data/db"); // Veritabanı bağlantısı

const app = express();
const port = 3000;

// Middleware ayarları
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, () => {
    console.log(`Sunucu ${port} portunda başlatıldı`);
});

// Static dosyalar (CSS, JS vs.)
app.use("/static", express.static(path.join(__dirname, "public")));

// Ana sayfalar (index.html, tables.html)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, "view", "index.html")));
app.get('/tables', (req, res) => res.sendFile(path.join(__dirname, "view", "tables.html")));

// Rota verilerini alma (rota_data endpoint'i)
app.get('/rota_data', (req, res) => {
    const limanlarQuery = 'SELECT port, status FROM rota_data';

    db.query(limanlarQuery, (err, results) => {
        if (err) {
            console.error('Veritabanı sorgusu sırasında hata oluştu:', err.message);
            return res.status(500).send('Liman verileri alınırken veritabanı hatası oluştu.');
        }
        if (results.length === 0) {
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
            return res.status(404).send('Yakıt türleri bulunamadı.');
        }
        res.json(results);
    });
});

// Sefer kaydetme (POST request)
app.post('/sefer-kaydet', (req, res) => {
    const vesselName = req.body.vessel_name.trim().replace(/\s+/g, '_');
    const tableName = `sefer_${vesselName}`;
    const seferBilgisi = {
        ayak_sayisi: parseInt(req.body.ayak_sayisi),
        hiz: parseFloat(req.body.speed),
        gunluk_tuketim_sea: parseFloat(req.body.gunluk_tuketim_sea),
        gunluk_tuketim_port: parseFloat(req.body.gunluk_tuketim_port)
    };

    const ayaklar = [];
    for (let i = 1; i <= seferBilgisi.ayak_sayisi; i++) {
        const ayak = {
            from: req.body[`from_${i}`],
            to: req.body[`to_${i}`],
            distance: parseFloat(req.body[`distance_${i}`]),
            distance_eca: parseFloat(req.body[`distance_eca_${i}`]),
            port_day: parseFloat(req.body[`port_day_${i}`]),
            speed: seferBilgisi.hiz,
            sea_fuel: req.body[`sea_fuel_${i}`], // sea fuel
            port_fuel: req.body[`port_fuel_${i}`], // port fuel
            eca_fuel: req.body[`eca_fuel_${i}`] // eca fuel
        };
        ayak.denizde_kalinan_sure = (ayak.distance + ayak.distance_eca) / (ayak.speed * 24);
        ayaklar.push(ayak);
    }

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT DEFAULT 1,
            from_liman VARCHAR(255) NOT NULL,
            to_liman VARCHAR(255) NOT NULL,
            status VARCHAR(255),
            distance FLOAT NOT NULL,
            distance_eca FLOAT NOT NULL,
            port_day FLOAT NOT NULL,
            speed FLOAT NOT NULL,
            denizde_kalinan_sure FLOAT NOT NULL,
            gunluk_tuketim_sea FLOAT NOT NULL,
            gunluk_tuketim_port FLOAT NOT NULL,
            sea_fuel VARCHAR(255),  -- Sea fuel türü
            eca_fuel VARCHAR(255),  -- ECA fuel türü
            port_fuel VARCHAR(255),  -- Port fuel türü
            sea_consumption FLOAT DEFAULT 0,
            eca_consumption FLOAT DEFAULT 0,
            port_consumption FLOAT DEFAULT 0,
            consumption_100_sea FLOAT DEFAULT 0,
            consumption_50_sea FLOAT DEFAULT 0,
            consumption_100_eca FLOAT DEFAULT 0,
            consumption_50_eca FLOAT DEFAULT 0,
            consumption_100_port FLOAT DEFAULT 0,
            consumption_0_port FLOAT DEFAULT 0,
            0_sea_consumption FLOAT DEFAULT 0,
            0_eca_consumption FLOAT DEFAULT 0,
            ets FLOAT DEFAULT 0,
            Fuel_Consumption_Total FLOAT DEFAULT 0,
            TTW FLOAT DEFAULT 0, -- TTW sütunu
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES arkas_ships(company_id)
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
                    console.error('From limanı statüsü alınırken hata:', err ? err.message : 'Liman bulunamadı');
                    return;
                }
                const fromStatus = fromResult[0].status;

                db.query(toStatusQuery, [ayak.to], (err, toResult) => {
                    if (err || toResult.length === 0) {
                        console.error('To limanı statüsü alınırken hata:', err ? err.message : 'Liman bulunamadı');
                        return;
                    }
                    const toStatus = toResult[0].status;
                    const status = `${fromStatus}/${toStatus}`;

                    const seaConsumption = ayak.denizde_kalinan_sure * seferBilgisi.gunluk_tuketim_sea;
                    const ecaConsumption = ayak.distance_eca / (ayak.speed * 24) * seferBilgisi.gunluk_tuketim_sea;
                    const portConsumption = ayak.port_day * seferBilgisi.gunluk_tuketim_port;

                    const consumption100Sea = (status === 'EU/EU') ? seaConsumption : 0;
                    const consumption50Sea = (status === 'EU/NON-EU' || status === 'NON-EU/EU') ? seaConsumption * 0.5 : 0;

                    const consumption100Eca = (status === 'EU/EU') ? ecaConsumption : 0;
                    const consumption50Eca = (status === 'EU/NON-EU' || status === 'NON-EU/EU') ? ecaConsumption * 0.5 : 0;

                    const consumption100Port = (toStatus === 'EU') ? portConsumption : 0;
                    const consumption0Port = (toStatus === 'NON-EU') ? portConsumption * 0 : 0;

                    const zeroSeaConsumption = (status === 'NON-EU/NON-EU') ? seaConsumption : 0;
                    const zeroEcaConsumption = (status === 'NON-EU/NON-EU') ? ecaConsumption : 0;

                    const fuelQuery = `SELECT Cf_CO2_ggFuel,Cf_CO2eq_TtW, CO2eqTTW,CO2eqWtT, LCV FROM fuel_data WHERE Pathway_Name = ?`;

                    // TTW hesaplama işlemleri
                    db.query(fuelQuery, [ayak.sea_fuel], (err, seaFuelResult) => {
                        if (err || seaFuelResult.length === 0) {
                            console.error('Yakıt verisi alınırken hata:', err ? err.message : 'Yakıt bulunamadı');
                            return;
                        }
                        const seaCf_CO2_ggFuel = seaFuelResult[0].Cf_CO2_ggFuel;
                        const seaLCV = seaFuelResult[0].LCV;
                        const seaCO2eqTTW =seaFuelResult[0].CO2eqTTW;
                        const seaTotalConsumption = (consumption100Sea + consumption50Sea) * seaCf_CO2_ggFuel;

                        db.query(fuelQuery, [ayak.port_fuel], (err, portFuelResult) => {
                            if (err || portFuelResult.length === 0) {
                                console.error('Yakıt verisi alınırken hata:', err ? err.message : 'Yakıt bulunamadı');
                                return;
                            }
                            const portCf_CO2_ggFuel = portFuelResult[0].Cf_CO2_ggFuel;
                            const portLCV = portFuelResult[0].LCV;
                            const portCf_CO2eq_TtW = portFuelResult[0].Cf_CO2eq_TtW;

                            const portTotalConsumption = consumption100Port * portCf_CO2_ggFuel;

                            db.query(fuelQuery, [ayak.eca_fuel], (err, ecaFuelResult) => {
                                if (err || ecaFuelResult.length === 0) {
                                    console.error('Yakıt verisi alınırken hata:', err ? err.message : 'Yakıt bulunamadı');
                                    return;
                                }
                                const ecaCf_CO2_ggFuel = ecaFuelResult[0].Cf_CO2_ggFuel;
                                const ecaLCV = ecaFuelResult[0].LCV;
                                const ecaCf_CO2eq_TtW =ecaFuelResult[0].Cf_CO2eq_TtW;

                                const ecaTotalConsumption = (consumption100Eca + consumption50Eca) * ecaCf_CO2_ggFuel;

                                // Tüm sonuçları topla ve 0,4 ile çarparak etsValue'yu hesapla
                                const etsValue = 0.4 * (seaTotalConsumption + portTotalConsumption + ecaTotalConsumption);

                                // Fuel Consumption Total hesapla
                                const fuelConsumptionTotal = consumption100Sea + consumption50Sea + zeroSeaConsumption +
                                    consumption100Eca + consumption50Eca + zeroEcaConsumption +
                                    consumption100Port + consumption0Port;

                                // TTW hesaplama: CO2eqTTW ve LCV kullanarak
                                const ttwEmissions = ((consumption100Sea + consumption50Sea) * seaCf_CO2_ggFuel + (consumption100Eca + consumption50Eca) * ecaCf_CO2eq_TtW + consumption100Port * portCf_CO2eq_TtW) / ((consumption100Sea + consumption50Sea) * seaLCV + (consumption100Eca + consumption50Eca) * ecaLCV + consumption100Port * portLCV);


                                // Veritabanına TTW emisyonları ekleme
                                const insertAyakQuery = `
                                    INSERT INTO ${tableName} (
                                        from_liman, to_liman, status, distance, distance_eca, port_day, speed, denizde_kalinan_sure, 
                                        gunluk_tuketim_sea, gunluk_tuketim_port, sea_consumption, eca_consumption, port_consumption,
                                        consumption_100_sea, consumption_50_sea, consumption_100_eca, consumption_50_eca, consumption_100_port, consumption_0_port,
                                        sea_fuel, eca_fuel, port_fuel, 0_sea_consumption, 0_eca_consumption, ets, Fuel_Consumption_Total, TTW
                                    )
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `;

                                const ayakValues = [
                                    ayak.from, ayak.to, status, ayak.distance, ayak.distance_eca, ayak.port_day, ayak.speed, ayak.denizde_kalinan_sure,
                                    seferBilgisi.gunluk_tuketim_sea, seferBilgisi.gunluk_tuketim_port,
                                    seaConsumption, ecaConsumption, portConsumption,
                                    consumption100Sea, consumption50Sea, consumption100Eca, consumption50Eca, consumption100Port, consumption0Port,
                                    ayak.sea_fuel, ayak.eca_fuel, ayak.port_fuel, zeroSeaConsumption, zeroEcaConsumption, etsValue, fuelConsumptionTotal, ttwEmissions
                                ];

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
                });
            });
        });

        res.send('Sefer bilgileri başarıyla kaydedildi.');
    });
});
