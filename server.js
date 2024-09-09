const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const Chart = require('chart.js');
const db = require("./data/db");
const cors = require('cors');
app.use(cors());
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = 3000;
app.listen(port, () => {
    console.log("sunucu devreye girdi");
});
app.use("/static", express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

const adminFilePath = path.join(__dirname, "view", "index.html");
app.get('/', (req, res) => {
    res.sendFile(adminFilePath);
});

app.get('/get-data', (req, res) => {
    const query = `SELECT 89.34 as target,
    SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV * fuel_eu.CO2eqWtT IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV * fuel_eu.CO2eqWtT
            ELSE 0
        END
    ) / SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV
            ELSE 0
        END
    ) AS WtTship,
    SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.Cf_CO2eq_TtW * 1000000 IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.Cf_CO2eq_TtW * 1000000
            ELSE 0
        END
    ) / SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV * 1000000 IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV * 1000000
            ELSE 0
        END
    ) AS TtWship,
    SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV * fuel_eu.CO2eqWtT IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV * fuel_eu.CO2eqWtT
            ELSE 0
        END
    ) / SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV
            ELSE 0
        END
    ) + 
    SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.Cf_CO2eq_TtW * 1000000 IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.Cf_CO2eq_TtW * 1000000
            ELSE 0
        END
    ) / SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV * 1000000 IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV * 1000000
            ELSE 0
        END
    ) AS GHG_intensity,
(89.34 - (
        (
            SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV * fuel_eu.CO2eqWtT IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV * fuel_eu.CO2eqWtT
            ELSE 0
        END
    ) / SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV
            ELSE 0
        END
    ) + 
    SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.Cf_CO2eq_TtW * 1000000 IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.Cf_CO2eq_TtW * 1000000
            ELSE 0
        END
    ) / SUM(
        CASE
            WHEN fuel_eu.yakıt_miktar * fuel_eu.LCV * 1000000 IS NOT NULL
            THEN fuel_eu.yakıt_miktar * fuel_eu.LCV * 1000000
            ELSE 0
        END
    ))
    )) * SUM(fuel_eu.energy_consumption) as total_balance

FROM fuel_eu`;
    db.query(query, (err, results) => {
      if (err) {
        console.error('MySQL sorgusu hatası:', err);
        res.status(500).send('Veritabanı hatası');
      } else {
        console.log('Sorgu sonuçları:', results);
        res.json(results);
      }
    });
});

app.post('/calculate-fuel', (req, res) => {
    const { vesselName, bunkerType1, mt1, bunkerType2, mt2, bunkerType3, mt3 } = req.body;
  
    const query = `
      INSERT INTO fuel_eu (VESSEL_NAME, Pathway_Name, energy_consumption, LCV, CO2eqWtT, CO2eqTTW, Cf_CO2eq_TtW, complain_balance, fuel_eu, yakıt_miktar)
      SELECT 
          ships_data.VESSEL_NAME,
          fuel_data.Pathway_Name,
          fuel_data.LCV * ? * 10000000 AS energy_consumption,
          fuel_data.LCV,
          fuel_data.CO2eqWtT,
          fuel_data.CO2eqTTW,
          fuel_data.Cf_CO2eq_TtW,
          (arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * ? * 10000000 AS complain_balance,
          ((arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * ? * 10000000) * 2400 / ((fuel_data.CO2eqWtT + fuel_data.CO2eqTTW) * 4100) AS fuel_eu,
          ? AS yakıt_miktar
      FROM ships_data
      JOIN fuel_data ON ships_data.company_id = fuel_data.Company_id
      JOIN arkas_ships ON ships_data.company_id = arkas_ships.company_id
      WHERE ships_data.VESSEL_NAME = ?
      AND fuel_data.Pathway_Name = ?
      UNION ALL
      SELECT 
          ships_data.VESSEL_NAME,
          fuel_data.Pathway_Name,
          fuel_data.LCV * ? * 10000000 AS energy_consumption,
          fuel_data.LCV,
          fuel_data.CO2eqWtT,
          fuel_data.CO2eqTTW,
          fuel_data.Cf_CO2eq_TtW,
          (arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * ? * 10000000 AS complain_balance,
          ((arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * ? * 10000000) * 2400 / ((fuel_data.CO2eqWtT + fuel_data.CO2eqTTW) * 4100) AS fuel_eu,
          ? AS yakıt_miktar
      FROM ships_data
      JOIN fuel_data ON ships_data.company_id = fuel_data.Company_id
      JOIN arkas_ships ON ships_data.company_id = arkas_ships.company_id
      WHERE ships_data.VESSEL_NAME = ?
      AND fuel_data.Pathway_Name = ?;
    `;
  
    db.query(query, [mt1, mt1, mt1, mt1, vesselName, bunkerType1, mt2, mt2, mt2, mt2, vesselName, bunkerType2, mt3, mt3, mt3, mt3, vesselName, bunkerType3], (err, results) => {
      if (err) {
        console.error('Veritabanı hatası:', err);
        return res.status(500).send('Veritabanı hatası');
      }
      res.json(results); // Sonuçları JSON olarak döndür
    });
});
  
app.post('/calculate-emission', (req, res) => {
    const { vesselName, from, to, distance, hiz, max_tuketim, port_kalan_sure, EUA_PRICE, fuel1Sea, fuel2Port } = req.body;
  
    const query = `
      SELECT 
          ships_data.VESSEL_NAME,
          rota_data.from,
          rota_data.to,
          rota_data.status,
          
          SUM(
              CASE
                  WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ((?/ships_data.speed)/24) * ?
                  WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ? * 5
                  ELSE 0
              END
          ) AS emission,
          
          CASE 
              WHEN rota_data.status = 'NON-EU/EU' THEN (0.4 * SUM(
                  CASE
                      WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ((?/ships_data.speed)/24) * ?
                      WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ? * 5
                      ELSE 0
                  END
              )) * 0.5 * ?
              WHEN rota_data.status = 'EU/NON-EU' THEN (0.4 * SUM(
                  CASE
                      WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ((?/ships_data.speed)/24) * ?
                      WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ? * 5
                      ELSE 0
                  END
              )) * 0.5 * ?
              WHEN rota_data.status = 'NON-EU/NON-EU' THEN 0
              WHEN rota_data.status = 'EU/EU' THEN (0.4 * SUM(
                  CASE
                      WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ((?/ships_data.speed)/24) * ?
                      WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ? * 5
                      ELSE 0
                  END
              )) * 1 * ?
          END AS ets,
          
          (SUM(
              CASE
                  WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ((?/ships_data.speed)/24) * ?
                  WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ? * 5
                  ELSE 0
              END
          ) * 1000) / (ships_data.DWT * ?) AS score,
  
          CASE 
              WHEN (SUM(
                  CASE
                      WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ((?/ships_data.speed)/24) * ?
                      WHEN fuel_data.Pathway_Name = ? THEN fuel_data.Cf_CO2_ggFuel * ? * 5
                      ELSE 0
                  END
              ) * 1000) / (ships_data.DWT * ?) <= 9.875759075 THEN 'A'
              ELSE 'B'
          END AS kategori
          
      FROM ships_data
      JOIN rota_data ON ships_data.company_id = rota_data.company_id
      JOIN fuel_data ON rota_data.company_id = fuel_data.Company_id
      WHERE ships_data.VESSEL_NAME = ? AND rota_data.from = ? AND rota_data.to = ?
      GROUP BY ships_data.VESSEL_NAME, rota_data.from, rota_data.to, rota_data.status;
    `;
  
    db.query(query, [fuel1Sea, distance, max_tuketim, fuel2Port, port_kalan_sure, fuel1Sea, distance, max_tuketim, fuel2Port, port_kalan_sure, EUA_PRICE, fuel1Sea, distance, max_tuketim, fuel2Port, port_kalan_sure, EUA_PRICE, fuel1Sea, distance, max_tuketim, fuel2Port, port_kalan_sure, distance, fuel1Sea, distance, max_tuketim, fuel2Port, port_kalan_sure, distance, vesselName, from, to], (err, results) => {
      if (err) {
        console.error('Veritabanı hatası:', err);
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }
      res.json(results); 
    });
});

app.post('/sefer-kaydet', (req, res) => {
    const seferBilgisi = {
        ayak_sayisi: parseInt(req.body.ayak_sayisi),
        hiz: parseFloat(req.body.speed),
        gunluk_tuketim: parseFloat(req.body.gunluk_tuketim)
    };

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

        ayak.denizde_kalinan_sure = (ayak.distance + ayak.distance_eca) / (seferBilgisi.hiz * 24);
        ayaklar.push(ayak);
    }

    const tableName = `sefer_${Date.now()}`;
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            from_liman VARCHAR(255) NOT NULL,
            to_liman VARCHAR(255) NOT NULL,
            distance FLOAT NOT NULL,
            distance_eca FLOAT NOT NULL,
            port_day FLOAT NOT NULL,
            speed FLOAT NOT NULL,
            denizde_kalinan_sure FLOAT NOT NULL,
            status VARCHAR(255) NOT NULL,
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

                    const insertAyakQuery = `
                        INSERT INTO ${tableName} (from_liman, to_liman, distance, distance_eca, port_day, speed, denizde_kalinan_sure, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    const ayakValues = [ayak.from, ayak.to, ayak.distance, ayak.distance_eca, ayak.port_day, ayak.speed, ayak.denizde_kalinan_sure, status];

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

// Rota Verilerini Alma (rota_data endpoint'i)
app.get('/rota_data', (req, res) => {
    const limanlarQuery = 'SELECT port FROM rota_data';

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

// Yakıt Türleri Verilerini Alma (fuel_data endpoint'i)
app.get('/fuel_data', (req, res) => {
    const query = 'SELECT Pathway_Name FROM fuel_data';

    db.query(query, (err, results) => {
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
