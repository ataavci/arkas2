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
  res.sendFile(path.join(__dirname, "view", "index.html"))
);
app.get("/kuralli_index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "/view", "kuralli_index.html"));
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
  const tableName = `sefer_${vesselName}`;
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

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT DEFAULT 1,
        from_liman VARCHAR(255) NOT NULL,
        to_liman VARCHAR(255) NOT NULL,
        status VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        distance FLOAT NOT NULL,
        distance_eca FLOAT NOT NULL,
        port_day FLOAT NOT NULL,
        speed FLOAT NOT NULL,
        denizde_kalinan_sure FLOAT NOT NULL,
        gunluk_tuketim_sea FLOAT NOT NULL,
        gunluk_tuketim_port FLOAT NOT NULL,
        sea_fuel VARCHAR(255),
        eca_fuel VARCHAR(255),
        port_fuel VARCHAR(255),
        sea_consumption FLOAT DEFAULT 0,
        eca_consumption FLOAT DEFAULT 0,
        port_consumption FLOAT DEFAULT 0,
        consumption_100_sea FLOAT DEFAULT 0,
        consumption_50_sea FLOAT DEFAULT 0,
        consumption_100_eca FLOAT DEFAULT 0,
        consumption_50_eca FLOAT DEFAULT 0,
        consumption_100_port FLOAT DEFAULT 0,
        consumption_0_port FLOAT DEFAULT 0,
        zeroSeaConsumption FLOAT DEFAULT 0,
        zeroEcaConsumption FLOAT DEFAULT 0,
        ets FLOAT DEFAULT 0,
        Fuel_Consumption_Total FLOAT DEFAULT 0,
        TTW FLOAT DEFAULT 0,
        WTT FLOAT DEFAULT 0,
        GHG_ACTUAL FLOAT DEFAULT 0,
        COMPLIANCE_BALANCE FLOAT DEFAULT 0,
        fuel_eu float default 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES arkas_ships(company_id)
    )
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error("Yeni sefer tablosu oluşturma hatası:", err.message);
      return res.status(500).send("Yeni sefer tablosu oluşturma hatası.");
    }

    console.log(`Yeni sefer tablosu (${tableName}) başarıyla oluşturuldu.`);

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

          const zeroSeaConsumption = isNaN(
            status === "NON-EU/NON-EU" ? seaConsumption : 0
          )
            ? 0
            : status === "NON-EU/NON-EU"
            ? seaConsumption
            : 0;
          const zeroEcaConsumption = isNaN(
            status === "NON-EU/NON-EU" ? ecaConsumption : 0
          )
            ? 0
            : status === "NON-EU/NON-EU"
            ? ecaConsumption
            : 0;

          const fuelQuery = `SELECT CO2eqWtT,Cf_CO2_ggFuel,Cf_CO2eq_TtW, CO2eqTTW,CO2eqWtT, LCV FROM fuel_data WHERE Pathway_Name = ?`;

          // TTW hesaplama işlemleri
          db.query(fuelQuery, [ayak.sea_fuel], (err, seaFuelResult) => {
            if (err || seaFuelResult.length === 0) {
              console.error(
                "Yakıt verisi alınırken hata:",
                err ? err.message : "Yakıt bulunamadı"
              );
              return;
            }
            const seaCf_CO2_ggFuel = seaFuelResult[0].Cf_CO2_ggFuel;
            const seaLCV = seaFuelResult[0].LCV;

            db.query(fuelQuery, [ayak.port_fuel], (err, portFuelResult) => {
              if (err || portFuelResult.length === 0) {
                console.error(
                  "Yakıt verisi alınırken hata:",
                  err ? err.message : "Yakıt bulunamadı"
                );
                return;
              }
              const portCf_CO2_ggFuel = portFuelResult[0].Cf_CO2_ggFuel;
              const portLCV = portFuelResult[0].LCV;

              db.query(fuelQuery, [ayak.eca_fuel], (err, ecaFuelResult) => {
                if (err || ecaFuelResult.length === 0) {
                  console.error(
                    "Yakıt verisi alınırken hata:",
                    err ? err.message : "Yakıt bulunamadı"
                  );
                  return;
                }
                const ecaCf_CO2_ggFuel = ecaFuelResult[0].Cf_CO2_ggFuel;
                const ecaLCV = ecaFuelResult[0].LCV;

                // Diğer hesaplamalar...

                const insertAyakQuery = `
                  INSERT INTO ${tableName} (
                      from_liman, to_liman, status, start_date, end_date, distance, distance_eca, port_day, speed, denizde_kalinan_sure, 
                      gunluk_tuketim_sea, gunluk_tuketim_port, sea_fuel, eca_fuel, port_fuel, 
                      sea_consumption, eca_consumption, port_consumption
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const ayakValues = [
                  ayak.from,
                  ayak.to,
                  status,
                  ayak.start_date,
                  ayak.end_date,
                  isNaN(ayak.distance) ? 0 : ayak.distance,
                  isNaN(ayak.distance_eca) ? 0 : ayak.distance_eca,
                  isNaN(ayak.port_day) ? 0 : ayak.port_day,
                  isNaN(ayak.speed) ? 0 : ayak.speed,
                  isNaN(ayak.denizde_kalinan_sure) ? 0 : ayak.denizde_kalinan_sure,
                  isNaN(seferBilgisi.gunluk_tuketim_sea)
                    ? 0
                    : seferBilgisi.gunluk_tuketim_sea,
                  isNaN(seferBilgisi.gunluk_tuketim_port)
                    ? 0
                    : seferBilgisi.gunluk_tuketim_port,
                  ayak.sea_fuel,
                  ayak.eca_fuel,
                  ayak.port_fuel,
                  isNaN(seaConsumption) ? 0 : seaConsumption,
                  isNaN(ecaConsumption) ? 0 : ecaConsumption,
                  isNaN(portConsumption) ? 0 : portConsumption,
                ];

                db.query(insertAyakQuery, ayakValues, (err) => {
                  if (err) {
                    console.error(
                      `Ayak ${index + 1} bilgisi eklenirken hata oluştu:`,
                      err.message
                    );
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

    res.send("Sefer bilgileri başarıyla kaydedildi.");
  });
});
