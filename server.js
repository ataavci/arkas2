const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
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

// Serve HTML files
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "view", "dashboard.html"))
);
app.get("/ets.html", (req, res) => {
  res.sendFile(path.join(__dirname, "/view", "ets.html"));
});
app.get("/input.html", (req, res) => {
    res.sendFile(path.join(__dirname, "/view", "input.html"));
  });
app.get("/sefer-tablolari", (req, res) => {
    const query = `SHOW TABLES LIKE 'sefer%'`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Veritabanı sorgusu sırasında hata oluştu:", err.message);
            return res.status(500).json({ error: "Veritabanı hatası oluştu." });
        }

        // Tabloları HTML olarak döndürelim
        res.json(results.map(row => Object.values(row)[0])); // Tablo isimlerini listele
    });
});



// Rota verilerini alma (rota_data endpoint'i)
app.get("/rota_data", (req, res) => {
  const limanlarQuery = "SELECT port, status FROM rota_data";

  db.query(limanlarQuery, (err, results) => {
    if (err) {
      console.error("Veritabanı sorgusu sırasında hata oluştu:", err.message);
      return res.status(500).send("Liman verileri alınırken veritabanı hatası oluştu.");
    }
    if (results.length === 0) {
      return res.status(404).send("Liman verileri bulunamadı.");
    }
    res.json(results);
  });
});

// Yakıt türleri verilerini alma (fuel_data endpoint'i)
app.get("/fuel_data", (req, res) => {
  const yakitQuery = "SELECT Pathway_Name FROM fuel_data";

  db.query(yakitQuery, (err, results) => {
    if (err) {
      console.error("Veritabanı sorgusu sırasında hata oluştu:", err.message);
      return res.status(500).send("Yakıt verileri alınırken veritabanı hatası oluştu.");
    }
    if (results.length === 0) {
      return res.status(404).send("Yakıt türleri bulunamadı.");
    }
    res.json(results);
  });
});

// Sefer kaydetme (POST request)
app.post("/sefer-kaydet", (req, res) => {
  const vesselName = req.body.vessel_name.trim().replace(/\s+/g, "_");
  
  const seferBilgisi = {
    hiz: parseFloat(req.body.speed),
    gunluk_tuketim_sea: parseFloat(req.body.gunluk_tuketim_sea),
    gunluk_tuketim_port: parseFloat(req.body.gunluk_tuketim_port),
  };
  let startDate = new Date(req.body.start_date);

  // Eğer tarih formatında sorun varsa hata dönelim
  if (isNaN(startDate.getTime())) {
    return res.status(400).send("Geçersiz başlangıç tarihi!");
  }
  let ayakCount = 1;
  const ayaklar = [];

  // İlgili tüm ayak verilerini alıyoruz
  while (req.body[`from_${ayakCount}`]) {
    const ayak = {
      from: req.body[`from_${ayakCount}`],
      to: req.body[`to_${ayakCount}`],
      distance: parseFloat(req.body[`distance_${ayakCount}`]),
      distance_eca: parseFloat(req.body[`distance_eca_${ayakCount}`]),
      port_day: parseFloat(req.body[`port_day_${ayakCount}`]),
      speed: seferBilgisi.hiz,
      sea_fuel: req.body[`sea_fuel_${ayakCount}`],
      port_fuel: req.body[`port_fuel_${ayakCount}`],
      eca_fuel: req.body[`eca_fuel_${ayakCount}`],
    };

    // Start date ve end date formatını ayarlıyoruz
    ayak.denizde_kalinan_sure =
      (ayak.distance + ayak.distance_eca) / (ayak.speed * 24);
    ayak.start_date = new Date(startDate).toISOString().split("T")[0]; // 'YYYY-MM-DD' formatına çevirme
    ayak.end_date = new Date(ayak.start_date);
    ayak.end_date.setDate(
      ayak.end_date.getDate() + ayak.denizde_kalinan_sure + ayak.port_day
    );
    ayak.end_date = ayak.end_date.toISOString().split("T")[0]; // 'YYYY-MM-DD' formatına çevirme

    // Bir sonraki ayak için start date'i ayarla
    startDate = new Date(ayak.end_date);

    ayaklar.push(ayak);
    ayakCount++;
  }

  // Her bir ayak için veritabanı işlemleri
  ayaklar.forEach((ayak, index) => {
    const fromStatusQuery = "SELECT status FROM rota_data WHERE port = ?";
    const toStatusQuery = "SELECT status FROM rota_data WHERE port = ?";

    db.query(fromStatusQuery, [ayak.from], (err, fromResult) => {
      if (err || fromResult.length === 0) {
        console.error(
          "From limanı statüsü alınırken hata:",
          err ? err.message : "Liman bulunamadı"
        );
        return;
      }
      const fromStatus = fromResult[0].status;

      db.query(toStatusQuery, [ayak.to], (err, toResult) => {
        if (err || toResult.length === 0) {
          console.error(
            "To limanı statüsü alınırken hata:",
            err ? err.message : "Liman bulunamadı"
          );
          return;
        }
        const toStatus = toResult[0].status;
        const status = `${fromStatus}/${toStatus}`;

        const seaConsumption = isNaN(ayak.denizde_kalinan_sure)
          ? 0
          : ayak.denizde_kalinan_sure * seferBilgisi.gunluk_tuketim_sea;
        const ecaConsumption = isNaN(ayak.distance_eca)
          ? 0
          : (ayak.distance_eca / (ayak.speed * 24)) * seferBilgisi.gunluk_tuketim_sea;
        const portConsumption = isNaN(ayak.port_day)
          ? 0
          : ayak.port_day * seferBilgisi.gunluk_tuketim_port;

        console.log(`Ayak ${index + 1} - Status: ${status}`);
        console.log(
          `Sea Consumption: ${seaConsumption}, ECA Consumption: ${ecaConsumption}, Port Consumption: ${portConsumption}`
        );

        const consumption100Sea = status === "EU/EU" ? seaConsumption : 0;
        const consumption50Sea =
          status === "EU/NON-EU" || status === "NON-EU/EU"
            ? seaConsumption * 0.5
            : 0;

        const consumption100Eca = status === "EU/EU" ? ecaConsumption : 0;
        const consumption50Eca =
          status === "EU/NON-EU" || status === "NON-EU/EU"
            ? ecaConsumption * 0.5
            : 0;

        const consumption100Port = toStatus === "EU" ? portConsumption : 0;
        const consumption0Port = toStatus === "NON-EU" ? 0 : 0;

        const zeroSeaConsumption = status === "NON-EU/NON-EU" ? seaConsumption : 0;
        const zeroEcaConsumption = status === "NON-EU/NON-EU" ? ecaConsumption : 0;

        const fuelQuery = `SELECT CO2eqWtT, Cf_CO2_ggFuel, Cf_CO2eq_TtW, CO2eqTTW, LCV FROM fuel_data WHERE Pathway_Name = ?`;

        // Yakıt hesaplamaları
        db.query(fuelQuery, [ayak.sea_fuel], (err, seaFuelResult) => {
          if (err || seaFuelResult.length === 0) {
            console.error("Yakıt verisi alınırken hata:", err ? err.message : "Yakıt bulunamadı");
            return;
          }
          const seaCf_CO2_ggFuel = seaFuelResult[0].Cf_CO2_ggFuel;
          const seaLCV = seaFuelResult[0].LCV;
          const seaTotalConsumption = (consumption100Sea + consumption50Sea) * seaCf_CO2_ggFuel;

          db.query(fuelQuery, [ayak.port_fuel], (err, portFuelResult) => {
            if (err || portFuelResult.length === 0) {
              console.error("Yakıt verisi alınırken hata:", err ? err.message : "Yakıt bulunamadı");
              return;
            }
            const portCf_CO2_ggFuel = portFuelResult[0].Cf_CO2_ggFuel;
            const portTotalConsumption = consumption100Port * portCf_CO2_ggFuel;

            db.query(fuelQuery, [ayak.eca_fuel], (err, ecaFuelResult) => {
              if (err || ecaFuelResult.length === 0) {
                console.error("Yakıt verisi alınırken hata:", err ? err.message : "Yakıt bulunamadı");
                return;
              }
              const ecaCf_CO2_ggFuel = ecaFuelResult[0].Cf_CO2_ggFuel;
              const ecaTotalConsumption = (consumption100Eca + consumption50Eca) * ecaCf_CO2_ggFuel;

              // Tüm yakıt tüketimlerini toplama ve ETS hesaplama
              const etsValue = 0.4 * (seaTotalConsumption + portTotalConsumption + ecaTotalConsumption);

              // Toplam yakıt tüketimi hesaplama
              const fuelConsumptionTotal = consumption100Sea + consumption50Sea + zeroSeaConsumption +
                consumption100Eca + consumption50Eca + zeroEcaConsumption +
                consumption100Port + consumption0Port;

              // TTW ve WTT hesaplama
              const ttwEmissions = (seaTotalConsumption + ecaTotalConsumption + portTotalConsumption) / 
                (seaLCV + portFuelResult[0].LCV + ecaFuelResult[0].LCV);
              const wttEmissions = (seaTotalConsumption + ecaTotalConsumption + portTotalConsumption) /
                (seaFuelResult[0].LCV + portFuelResult[0].LCV + ecaFuelResult[0].LCV);

              // GHG ve uyum hesaplama
              const ghgActual = wttEmissions + ttwEmissions;
              const complianceBalance = (89.34 - ghgActual) * fuelConsumptionTotal * 1000000;

              let fuel_eu = 0;
              if (ghgActual > 89.34) {
                fuel_eu = Math.abs(complianceBalance) / (ghgActual * 41000) * 2400;
              }

              // Veritabanına kaydetme
              const insertAyakQuery = `
                INSERT INTO sefer_7 (
                  company_id, 
                  vessel_name, 
                  from_liman, 
                  to_liman, 
                  status, 
                  start_date, 
                  end_date, 
                  distance, 
                  distance_eca, 
                  port_day, 
                  speed, 
                  denizde_kalinan_sure, 
                  gunluk_tuketim_sea, 
                  gunluk_tuketim_port, 
                  sea_consumption, 
                  eca_consumption, 
                  port_consumption, 
                  consumption_100_sea, 
                  consumption_50_sea, 
                  consumption_100_eca, 
                  consumption_50_eca, 
                  consumption_100_port, 
                  consumption_0_port, 
                  sea_fuel, 
                  eca_fuel, 
                  port_fuel, 
                  zeroSeaConsumption, 
                  zeroEcaConsumption, 
                  ets, 
                  Fuel_Consumption_Total, 
                  TTW, 
                  WTT, 
                  GHG_ACTUAL, 
                  COMPLIANCE_BALANCE, 
                  fuel_eu
                ) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

              const ayakValues = [
                1, // company_id varsayılan olarak 1
                vesselName, 
                ayak.from, 
                ayak.to, 
                status,
                ayak.start_date, 
                ayak.end_date, 
                ayak.distance, 
                ayak.distance_eca, 
                ayak.port_day, 
                ayak.speed, 
                ayak.denizde_kalinan_sure, 
                seferBilgisi.gunluk_tuketim_sea, 
                seferBilgisi.gunluk_tuketim_port,
                seaConsumption, 
                ecaConsumption, 
                portConsumption, 
                consumption100Sea, 
                consumption50Sea, 
                consumption100Eca, 
                consumption50Eca, 
                consumption100Port, 
                consumption0Port,
                ayak.sea_fuel, 
                ayak.eca_fuel, 
                ayak.port_fuel, 
                zeroSeaConsumption, 
                zeroEcaConsumption, 
                etsValue, 
                fuelConsumptionTotal, 
                ttwEmissions, 
                wttEmissions, 
                ghgActual, 
                complianceBalance, 
                fuel_eu
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

  res.status(200).send("Sefer başarıyla kaydedildi.");
});

app.get("/sefer-fuel-toplami", (req, res) => {
  const query = `SHOW TABLES LIKE 'sefer%'`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Tablo sorgusu sırasında hata:", err.message);
      return res.status(500).json({ error: "Veritabanı hatası oluştu." });
    }

    let totalFuel = 0;
    let completed = 0;

    results.forEach((row) => {
      const tableName = Object.values(row)[0];
      const fuelQuery = `SELECT IFNULL(SUM(fuel_eu), 0) AS fuel_sum FROM ${tableName}`;

      db.query(fuelQuery, (err, fuelResults) => {
        if (err) {
          console.error(`Tablo ${tableName} için sorgu hatası:`, err.message);
          return res.status(500).json({ error: "Fuel sorgusu sırasında hata oluştu." });
        }

        totalFuel += fuelResults[0].fuel_sum;
        completed++;

        // Tüm tablolar işlendiğinde sonucu döndür
        if (completed === results.length) {
          console.log(`Toplam fuel_eu: ${totalFuel}`);
          res.json({ totalFuel });
        }
      });
    });
  });
});
app.get("/sefer-ets-toplami", (req, res) => {
  const query = `SHOW TABLES LIKE 'sefer%'`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Tablo sorgusu sırasında hata:", err.message);
      return res.status(500).json({ error: "Veritabanı hatası oluştu." });
    }

    let totalFuel = 0;
    let completed = 0;

    results.forEach((row) => {
      const tableName = Object.values(row)[0];
      const fuelQuery = `SELECT IFNULL(SUM(ets), 0) AS fuel_sum FROM ${tableName}`;

      db.query(fuelQuery, (err, fuelResults) => {
        if (err) {
          console.error(`Tablo ${tableName} için sorgu hatası:`, err.message);
          return res.status(500).json({ error: "Fuel sorgusu sırasında hata oluştu." });
        }

        totalFuel += fuelResults[0].fuel_sum;
        completed++;

        // Tüm tablolar işlendiğinde sonucu döndür
        if (completed === results.length) {
          console.log(`Toplam ets: ${totalFuel}`);
          res.json({ totalFuel });
        }
      });
    });
  });
});
app.get("/sefer-consumption-toplami", (req, res) => {
  const query = `SHOW TABLES LIKE 'sefer%'`;  // sefer ile başlayan tabloları bul

  db.query(query, (err, results) => {
    if (err) {
      console.error("Tablo sorgusu sırasında hata:", err.message);
      return res.status(500).json({ error: "Veritabanı hatası oluştu." });
    }

    let totalFuel = 0;
    let completed = 0;

    results.forEach((row) => {
      const tableName = Object.values(row)[0];
      // Üç sütunu toplayarak toplam tüketimi hesapla
      const fuelQuery = `SELECT IFNULL(SUM(sea_consumption + port_consumption + eca_consumption), 0) AS fuel_sum FROM ${tableName}`;

      db.query(fuelQuery, (err, fuelResults) => {
        if (err) {
          console.error(`Tablo ${tableName} için sorgu hatası:`, err.message);
          return res.status(500).json({ error: "Fuel sorgusu sırasında hata oluştu." });
        }

        totalFuel += fuelResults[0].fuel_sum;
        completed++;

        // Tüm tablolar işlendiğinde sonucu döndür
        if (completed === results.length) {
          console.log(`Toplam consumption: ${totalFuel}`);
          res.json({ totalFuel });
        }
      });
    });
  });
});

app.get("/sefer-balance-toplami", (req, res) => {
  const query = `SHOW TABLES LIKE 'sefer%'`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Tablo sorgusu sırasında hata:", err.message);
      return res.status(500).json({ error: "Veritabanı hatası oluştu." });
    }

    let totalFuel = 0;
    let completed = 0;

    results.forEach((row) => {
      const tableName = Object.values(row)[0];
      const fuelQuery = `SELECT IFNULL(SUM(COMPLIANCE_BALANCE), 0) AS fuel_sum FROM ${tableName}`;

      db.query(fuelQuery, (err, fuelResults) => {
        if (err) {
          console.error(`Tablo ${tableName} için sorgu hatası:`, err.message);
          return res.status(500).json({ error: "Fuel sorgusu sırasında hata oluştu." });
        }

        totalFuel += fuelResults[0].fuel_sum;
        completed++;

        // Tüm tablolar işlendiğinde sonucu döndür
        if (completed === results.length) {
          console.log(`Toplam ets: ${totalFuel}`);
          res.json({ totalFuel });
        }
      });
    });
  });
});
app.get("/sefer-ghg-toplami", (req, res) => {
  const query = `SHOW TABLES LIKE 'sefer%'`;  // sefer ile başlayan tabloları bul

  db.query(query, (err, results) => {
    if (err) {
      console.error("Tablo sorgusu sırasında hata:", err.message);
      return res.status(500).json({ error: "Veritabanı hatası oluştu." });
    }

    let totalGHG = 0;
    let completed = 0;

    results.forEach((row) => {
      const tableName = Object.values(row)[0];
      // TTW + WTT değeri 0'dan büyük olanlar için ortalama hesapla
      const ghgQuery = `SELECT IFNULL(AVG(TTW + WTT), 0) AS ghg_sum FROM ${tableName} WHERE (TTW + WTT) > 0`;

      db.query(ghgQuery, (err, ghgResults) => {
        if (err) {
          console.error(`Tablo ${tableName} için sorgu hatası:`, err.message);
          return res.status(500).json({ error: "GHG sorgusu sırasında hata oluştu." });
        }

        totalGHG += ghgResults[0].ghg_sum;
        completed++;

        // Tüm tablolar işlendiğinde sonucu döndür
        if (completed === results.length) {
          console.log(`Toplam GHG: ${totalGHG}`);
          res.json({ totalGHG });
        }
      });
    });
  });
});
app.get("/sefer-table-toplami", (req, res) => {
  const query = `SHOW TABLES LIKE 'sefer%'`;  // sefer ile başlayan tabloları bul

  db.query(query, (err, results) => {
    if (err) {
      console.error("Tablo sorgusu sırasında hata:", err.message);
      return res.status(500).json({ error: "Veritabanı hatası oluştu." });
    }

    let totalData = [];
    let completed = 0;

    results.forEach((row) => {
      const tableName = Object.values(row)[0];
      // TTW + WTT değeri 0'dan büyük olanlar için ortalama hesapla ve yakıt verilerini al
      const fuelQuery = `SELECT IFNULL(AVG(TTW + WTT), 0) AS ghg_sum, 
                         IFNULL((sea_fuel), 0) AS sea_fuel_sum, 
                         IFNULL((eca_fuel), 0) AS eca_fuel_sum, 
                         IFNULL((port_fuel), 0) AS port_fuel_sum 
                         FROM ${tableName} WHERE (TTW + WTT) > 0`;

      db.query(fuelQuery, (err, fuelResults) => {
        if (err) {
          console.error(`Tablo ${tableName} için sorgu hatası:`, err.message);
          return res.status(500).json({ error: "GHG sorgusu sırasında hata oluştu." });
        }

        // Her tabloya ait veriyi bir objeye ekle
        totalData.push({
          table: tableName,
          ghg_sum: fuelResults[0].ghg_sum,
          sea_fuel_sum: fuelResults[0].sea_fuel_sum,
          eca_fuel_sum: fuelResults[0].eca_fuel_sum,
          port_fuel_sum: fuelResults[0].port_fuel_sum
        });

        completed++;

        // Tüm tablolar işlendiğinde sonucu döndür
        if (completed === results.length) {
          res.json({ totalData });
        }
      });
    });
  });
});
app.get('/api/get-vessel-data', (req, res) => {
  const sql = 'CALL ets()'; // ets adlı prosedürü çağırır
  db.query(sql, (err, result) => {
      if (err) throw err;
      const rows = result[0]; // Prosedür sonucu satırları
      const formattedData = rows.map(row => ({
          vessel_name: row.vessel_name,
          start_date_: row.start_date_,
          end_date_: row.end_date_,
          distance_sum: row['SUM(sefer_7.distance)'],
          distance_eca_sum: row['SUM(sefer_7.distance_eca)'],
          speed_avg: row['AVG(sefer_7.speed)'],
          total_days: row['SUM(sefer_7.port_day+sefer_7.denizde_kalinan_sure)'],
          sea_fuel: row.sea_fuel,
          sea_consumption: row.sea_consumption,
          eca_fuel: row.eca_fuel,
          eca_consumption: row.eca_consumption,
          port_fuel: row.port_fuel,
          port_consumption: row.port_consumption,
          ets_sum: row['sum(sefer_7.ets)'],
          compliance_balance_sum: row['SUM(sefer_7.COMPLIANCE_BALANCE)']
      }));
      res.json(formattedData);
  });
});
