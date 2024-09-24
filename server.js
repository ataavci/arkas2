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
app.get("/cii.html", (req, res) => {
    res.sendFile(path.join(__dirname, "/view", "cii.html"));
  });
  app.get("/fuel_eu.html", (req, res) => {
    res.sendFile(path.join(__dirname, "/view", "fuel_eu.html"));
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
    DWT:parseFloat(req.body.DWT),
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
          const seaCO2eqWtT= seaFuelResult[0].CO2eqWtT;
          const seaCf_CO2_ggFuel = seaFuelResult[0].Cf_CO2_ggFuel;
          const seaLCV = seaFuelResult[0].LCV;
          const seaCO2eqTTW = seaFuelResult[0].CO2eqTTW;
          const seaTotalConsumption = (consumption100Sea + consumption50Sea) * seaCf_CO2_ggFuel;

          db.query(fuelQuery, [ayak.port_fuel], (err, portFuelResult) => {
            if (err || portFuelResult.length === 0) {
              console.error("Yakıt verisi alınırken hata:", err ? err.message : "Yakıt bulunamadı");
              return;
            }
            const portCf_CO2_ggFuel = portFuelResult[0].Cf_CO2_ggFuel;
            const portLCV = portFuelResult[0].LCV;
            const portCf_CO2eq_TtW = portFuelResult[0].Cf_CO2eq_TtW;
            const portCO2eqWtT= portFuelResult[0].CO2eqWtT;
            const portTotalConsumption = consumption100Port * portCf_CO2_ggFuel;

            db.query(fuelQuery, [ayak.eca_fuel], (err, ecaFuelResult) => {
              if (err || ecaFuelResult.length === 0) {
                console.error("Yakıt verisi alınırken hata:", err ? err.message : "Yakıt bulunamadı");
                return;
              }
              const ecaCf_CO2_ggFuel = ecaFuelResult[0].Cf_CO2_ggFuel;
              const ecaLCV = ecaFuelResult[0].LCV;
              const ecaCf_CO2eq_TtW = ecaFuelResult[0].Cf_CO2eq_TtW;
              const ecaCO2eqWtT= ecaFuelResult[0].CO2eqWtT;
              const ecaTotalConsumption = (consumption100Eca + consumption50Eca) * ecaCf_CO2_ggFuel;

              // Tüm yakıt tüketimlerini toplama ve ETS hesaplama
              const etsValue = 0.4 * (seaTotalConsumption + portTotalConsumption + ecaTotalConsumption);

              // Toplam yakıt tüketimi hesaplama
              const fuelConsumptionTotal = consumption100Sea + consumption50Sea + zeroSeaConsumption +
                consumption100Eca + consumption50Eca + zeroEcaConsumption +
                consumption100Port + consumption0Port;

              // TTW ve WTT hesaplama
              const ttwEmissions = ((consumption100Sea + consumption50Sea) * seaCf_CO2_ggFuel + (consumption100Eca + consumption50Eca) * ecaCf_CO2eq_TtW + consumption100Port * portCf_CO2eq_TtW) / ((consumption100Sea + consumption50Sea) * seaLCV + (consumption100Eca + consumption50Eca) * ecaLCV + consumption100Port * portLCV);
              const wttEmissions = ((consumption100Sea+consumption50Sea)*seaCO2eqWtT*seaLCV+consumption100Port*portCO2eqWtT*portLCV+(consumption100Eca+consumption50Eca)*ecaLCV*ecaCO2eqWtT)/((consumption100Sea+consumption50Sea)*seaLCV+consumption100Port*portLCV+(consumption100Eca+consumption50Eca*ecaLCV))
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
                  dwt, 
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
                VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

              const ayakValues = [
                1, // company_id varsayılan olarak 1
                vesselName,
                seferBilgisi.DWT, 
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
    const rows = result[0];
    
    const formattedData = rows.map(row => ({
        vessel_name: row.vessel_name,
        DWT: row.dwt, // Eğer alias ile düzelttiyseniz
        start_date_: row.start_date_,
        end_date_: row.end_date_,
        distance_sum: row.distance_sum,
        distance_eca_sum: row.distance_eca_sum,
        speed_avg: row.speed_avg,
        total_days: row.total_days,
        sea_fuel: row.sea_fuel,
        sea_consumption: row.sea_consumption,
        eca_fuel: row.eca_fuel,
        eca_consumption: row.eca_consumption,
        port_fuel: row.port_fuel,
        port_consumption: row.port_consumption,
        ets_sum: row.ets_sum,
        compliance_balance_sum: row.compliance_balance_sum,
        AER:row.AER,
        CII:row.CII
    }));
    res.json(formattedData);
});

});
app.get('/api/get-cii-data', (req, res) => {
  const sql = 'CALL cii()'; // cii prosedürünü çağırır
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database query failed' });
    }

    // Veritabanından dönen sonuç genellikle iki boyutlu olur, `result[0]` veriyi içerir
    const rows = result[0]; 

    // Eğer `rows` bir dizi değilse, verinin doğru döndüğünü kontrol edin
    if (!Array.isArray(rows)) {
      return res.status(500).json({ error: 'Unexpected data format' });
    }

    const formattedData2 = rows.map(row => ({
        vessel_name: row.vessel_name,
        dwt: row.dwt, // Eğer alias ile düzelttiyseniz
        start_date_: row.start_date_,
        end_date_: row.end_date_,
        distance: row.distance, // Toplam mesafe (distance + distance_eca)
        sea_fuel: row.sea_fuel,
        sea_consumption: row.sea_consumption,
        eca_fuel: row.eca_fuel,
        eca_consumption: row.eca_consumption,
        port_fuel: row.port_fuel,
        port_consumption: row.port_consumption,
        AER: row.AER, // AER hesaplanmış değer
        CII: row.CII // CII harfi
    }));

    // JSON formatında döner
    res.json(formattedData2);
  });
});
app.get('/api/get-fuel_eu-data', (req, res) => {
  const sql = 'CALL fuel_eu()'; // Doğru prosedürü çağırıyoruz
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı sorgusu başarısız oldu' });
    }

    // Veritabanı sonucunun iki boyutlu olduğunu varsayıyoruz, `result[0]` veriyi içerir
    const rows = result[0];

    // Eğer `rows` bir dizi değilse, verinin doğru geldiğinden emin olun
    if (!Array.isArray(rows)) {
      return res.status(500).json({ error: 'Beklenmedik veri formatı' });
    }

    // Veriyi uygun şekilde formatlıyoruz
    const formattedData3 = rows.map(row => ({
        vessel_name: row.vessel_name,
        min_start_date: row.min_start_date,  // Min start date
        max_end_date: row.max_end_date,  // Max end date
        duration: row.duration,  // Süre
        intra_eu: row.intra_eu,  // Intra EU yakıt verisi
        extra_eu: row.extra_eu,  // Extra EU yakıt verisi
        ghg_intensity: row.ghg_intensity,  // GHG yoğunluğu
        ghg_target: row.ghg_target,  // GHG hedefi
        compliance_balance: row.compliance_balance  // Uyumluluk dengesi
    }));

    // Formatlanmış veriyi JSON olarak döndür
    res.json(formattedData3);
  });
});
app.get('/api/get-vessel-data', (req, res) => {
  const query = 'SELECT * FROM sefer_7'; // vessel_data tablonuzun adını buraya yazın
  db.query(query, (error, results) => {
      if (error) {
          console.error('Error fetching vessel data:', error);
          res.status(500).json({ error: 'Database error' });
      } else {
          res.json(results);
      }
  });
});

// ETS detay verisini getiren API
app.get('/api/get-vessel-detail', (req, res) => {
  const vesselName = req.query.vessel_name;

  const query = `CALL ets_detay(?)`; // ets_detay prosedürü için query
  db.query(query, [vesselName], (error, results) => {
      if (error) {
          console.error('Error fetching ETS detail:', error);
          res.status(500).json({ error: 'Database error' });
      } else {
          console.log('Query Results:', results); // Gelen sonuçları kontrol ediyoruz
          res.json(results[0]); // Tüm sonuç setini döndür
      }
  });
});



  

