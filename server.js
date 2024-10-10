const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const xlsx = require("xlsx");
const moment = require('moment');
const excelJS = require('exceljs');
const db = require("./data/db"); // Veritabanı bağlantısı
const cors = require("cors");
const fileUpload = require("express-fileupload");
const mysql = require('mysql2');
const multer = require("multer");
 
const uploadOpts={
  useTempFiles :true,
  tempFileDir:"/tmt/"
}
const XLSX=require("xlsx");
const fs= require("fs");
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
const upload = multer({
  dest: "uploads/", // Dosyaların geçici olarak kaydedileceği yer
});

app.post("/excel/csv", upload.single("file_input"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ msg: "Dosya yüklenemedi." });
  }

  const filePath = path.join(__dirname, file.path);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // İlk sayfayı alıyoruz
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const succesData = [];
  const FailureData = [];

  // MySQL veritabanına ekleme işlemi için tüm işlemleri asenkron yapıyoruz
  const insertPromises = data.map((row) => {
    function parseDate(date) {
      // Eğer date geçerli değilse veya boşsa null döndür
      if (!date) {
        return null;
      }

      // Eğer date bir string ise, parse yap
      const parsedDate = new Date(date);
      
      // Eğer geçerli bir tarih değilse null döndür
      if (isNaN(parsedDate)) {
        return null;
      }

      // Tarihi YYYY-MM-DD formatına dönüştür
      return parsedDate.toISOString().split('T')[0];
    }

    // Debugging: Log the row data before insertion
    console.log("Row Data: ", row);

    const sql = `
      INSERT INTO sefer_7 (company_id, vessel_name, dwt, from_liman, to_liman, status, start_date, end_date, distance, distance_eca, port_day, speed, denizde_kalinan_sure, gunluk_tuketim_sea, gunluk_tuketim_port, sea_fuel, eca_fuel, port_fuel, sea_consumption, eca_consumption, port_consumption, consumption_100_sea, consumption_50_sea, consumption_100_eca, consumption_50_eca, consumption_100_port, consumption_0_port, zeroSeaConsumption, zeroEcaConsumption, ets, Fuel_Consumption_Total, TTW, WTT, GHG_ACTUAL, COMPLIANCE_BALANCE, fuel_eu, created_at)

      VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      row.company_id || null,
      row.vessel_name || '',
      row.dwt || 0,
      row.from_liman || '',
      row.to_liman || '',
      row.status || '',
      parseDate(row.start_date) || null,  // Tarih formatını düzeltelim
      parseDate(row.end_date) || null,    // Tarih formatını düzeltelim
      row.distance || 0,
      row.distance_eca || 0,
      row.port_day || 0,
      row.speed || 0,
      row.denizde_kalinan_sure || 0,
      row.gunluk_tuketim_sea || 0,
      row.gunluk_tuketim_port || 0,
      row.sea_fuel || '',
      row.eca_fuel || '',
      row.port_fuel || '',
      parseFloat(row.sea_consumption) || 0,  // Sayısal değerleri tırnak olmadan
      parseFloat(row.eca_consumption) || 0,  // Sayısal değerleri tırnak olmadan
      parseFloat(row.port_consumption) || 0, // Sayısal değerleri tırnak olmadan
      parseFloat(row.consumption_100_sea) || 0,
      parseFloat(row.consumption_50_sea) || 0,
      parseFloat(row.consumption_100_eca) || 0,
      parseFloat(row.consumption_50_eca) || 0,
      parseFloat(row.consumption_100_port) || 0,
      parseFloat(row.consumption_0_port) || 0,
      parseFloat(row.zeroSeaConsumption) || 0,
      parseFloat(row.zeroEcaConsumption) || 0,
      row.ets || '',
      parseFloat(row.Fuel_Consumption_Total) || 0,
      parseFloat(row.TTW) || 0,
      parseFloat(row.WTT) || 0,
      parseFloat(row.GHG_ACTUAL) || 0,
      parseFloat(row.COMPLIANCE_BALANCE) || 0,
      row.fuel_eu || ''
    ];

    // Veritabanına eklemeyi bir promise olarak dönüyoruz
    return new Promise((resolve, reject) => {
      db.query(sql, values, (err, result) => {
        if (err) {
          console.error("Veritabanına eklenirken hata oluştu:", err);
          FailureData.push(row); // Başarısız kayıtları listeye ekle
          reject(err);
        } else {
          succesData.push(row);  // Başarılı kayıtları listeye ekle
          resolve(result);
        }
      });
    });
  });

  try {
    // Tüm insert işlemlerini bekliyoruz
    await Promise.all(insertPromises);

    // Geçici dosyayı sil
    fs.unlinkSync(filePath);

    // Yanıtı gönder
    return res.json({
      msg: "İşlem tamamlandı.",
      succesData,
      FailureData,
    });
  } catch (err) {
    // Herhangi bir hata durumunda
    console.error("İşlem sırasında hata oluştu:", err);
    return res.status(500).json({ msg: "İşlem sırasında hata oluştu.", err });
  }
});

// Static dosyalar (CSS, JS vs.)
app.use("/static", express.static(path.join(__dirname, "public")));

// Serve HTML files
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "view", "dashboard.html"))
);
app.get("/pool.html", (req, res) =>{
  res.sendFile(path.join(__dirname, "view", "pool.html"))
});
app.get("/pooldetails.html", (req, res) =>{
  res.sendFile(path.join(__dirname, "view", "pooldetails.html"))
});
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

              const safeValue = (value) => (isNaN(value) ? 0 : value);

              const ayakValues = [
                1, // company_id varsayılan olarak 1
                vesselName,
                safeValue(seferBilgisi.DWT),
                ayak.from,
                ayak.to,
                status,
                ayak.start_date,
                ayak.end_date,
                safeValue(ayak.distance),
                safeValue(ayak.distance_eca),
                safeValue(ayak.port_day),
                safeValue(ayak.speed),
                safeValue(ayak.denizde_kalinan_sure),
                safeValue(seferBilgisi.gunluk_tuketim_sea),
                safeValue(seferBilgisi.gunluk_tuketim_port),
                safeValue(seaConsumption),
                safeValue(ecaConsumption),
                safeValue(portConsumption),
                safeValue(consumption100Sea),
                safeValue(consumption50Sea),
                safeValue(consumption100Eca),
                safeValue(consumption50Eca),
                safeValue(consumption100Port),
                safeValue(consumption0Port),
                ayak.sea_fuel,
                ayak.eca_fuel,
                ayak.port_fuel,
                safeValue(zeroSeaConsumption),
                safeValue(zeroEcaConsumption),
                safeValue(etsValue),
                safeValue(fuelConsumptionTotal),
                safeValue(ttwEmissions),
                safeValue(wttEmissions),
                safeValue(ghgActual),
                safeValue(complianceBalance),
                safeValue(fuel_eu),
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
app.get('/api/get-fuel-detay', (req, res) => {
  const vesselName = req.query.vessel_name;

  const query = `CALL fuel_eu_detay(?)`; 
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
app.get('/api/total-consumption', (req, res) => {
  db.query('CALL total_consumption()', (error, results) => {
    if (error) {
      console.error('MySQL Hatası:', error); // Hata logu
      return res.status(500).json({ error: 'Error fetching total consumption' });
    }

    // MySQL sonucunu logla ve yanıt olarak dön
    const totalConsumption = results[0][0].total;
    res.json({ totalConsumption });
  });
});
app.get('/api/complian-balance', (req, res) => {
  db.query('CALL complian_balance()', (error, results) => {
    if (error) {
      console.error('MySQL Hatası:', error);
      return res.status(500).json({ error: 'Error fetching complian balance' });
    }

    // Sonuçları konsola yazdır
    console.log('MySQL Sonucu:', results);

    if (results && results.length > 0 && results[0].length > 0) {
      const complianBalance = results[0][0].balance;
      res.json({ complianBalance });
    } else {
      console.error('Sonuç bulunamadı');
      res.status(404).json({ error: 'No results found' });
    }
  });
});
app.get('/api/ghg_intensity', (req, res) => {
  db.query('CALL ghg_intensity()', (error, results) => {
    if (error) {
      console.error('MySQL Hatası:', error);
      return res.status(500).json({ error: 'Error fetching GHG intensity' });
    }

    // Sonuçları konsola yazdır
    console.log('MySQL Sonucu:', results);

    if (results && results.length > 0 && results[0].length > 0) {
      // GHG intensity değerini al
      const GHG_intensity = results[0][0].ghg;  // Eğer prosedür 'ghg' adıyla sonuç döndürüyor.
      res.json({ GHG_intensity });
    } else {
      console.error('Sonuç bulunamadı');
      res.status(404).json({ error: 'No results found' });
    }
  });
});


app.get('/api/get-cii-detail', (req, res) => {
  const vesselName = req.query.vessel_name;

  const query = `CALL cii_detay(?)`; // ets_detay prosedürü için query
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
app.get('/api/total-consumption', (req, res) => {
  db.query('CALL total_consumption()', (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error fetching total consumption' });
    }
    
    
    const totalConsumption = results[0][0].total;
    res.json({ totalConsumption });
  });
});
app.get('/api/vessels', (req, res) => {
  db.query('CALL get_vessel_cii()', (error, results) => {
    if (error) {
      console.error('MySQL Hatası:', error);
      return res.status(500).json({ error: 'Veri çekilirken bir hata oluştu' });
    }

    // Procedure sonuçları results[0] içinde döner
    res.json(results[0]);  // JSON formatında sonuçları gönder
  });
});
app.get('/api/get-data', (req, res) => {
  const query = `
      SELECT 
          MONTHNAME(start_date) AS month_name, 
          SUM(ets) AS total_ets
      FROM sefer_7
      GROUP BY MONTH(start_date)
      ORDER BY MONTH(start_date);
  `;

  db.query(query, (err, results) => {
      if (err) {
          return res.status(500).json({ error: 'Veri alınırken hata oluştu.' });
      }
      res.json(results);
  });
});


// Yeni endpoint: Gemi adına göre ETS verileri
app.get('/api/get-vessel-data2', (req, res) => {
  const query = `
      SELECT 
          vessel_name,
           
          MONTHNAME(start_date) AS month_name, 
          SUM(ets) AS total_ets
      FROM sefer_7
      GROUP BY vessel_name
  `;

  db.query(query, (err, results) => {
      if (err) {
          return res.status(500).json({ error: 'Veri alınırken hata oluştu.' });
      }
      res.json(results);
  });
});
app.get('/api/vessel-report', async (req, res) => {
  let { startDate, endDate, vessels } = req.query;
  startDate = startDate || null;
  endDate = endDate || null;
  const vesselArray = vessels ? vessels.split(',').map(vessel => vessel.trim()) : [];

  try {
    const [rows] = await db.promise().execute(
      'CALL GetConsumptionAndETS(?, ?)', [startDate, endDate]
    );

    console.log('Stored procedure results:', rows[0]);

    const filteredResults = vesselArray.length > 0
      ? rows[0].filter(row => vesselArray.includes(row.vessel_name))
      : rows[0];

    console.log('Filtered results:', filteredResults);

    res.json(filteredResults);
  } catch (error) {
    console.error('MySQL Hatası:', error.message);
    res.status(500).json({ error: 'Veri çekilirken bir hata oluştu', details: error.message });
  }
});


app.post('/save-pool', (req, res) => {
  const { poolName, tableData } = req.body;

  if (!poolName || !tableData || !tableData.length) {
      return res.status(400).json({ error: 'Invalid pool name or data' });
  }

  // `pool_details` tablosuna verileri kaydetme
  const insertDataQuery = `
      INSERT INTO pool_details 
      (pool_name, vessel_name, sefer_tekrar_sayisi, leg_durumu, current_leg, total_distance, eca_distance, sea_fuel_consumption, eca_fuel_consumption, port_fuel_consumption, ets, compliance_balance) 
      VALUES ?
  `;

  // Tablo verilerini dizi haline getiriyoruz
  const values = tableData.map(row => [
      poolName,                             // Pool ismi
      row.vessel_name,                      // Gemi adı
      row.sefer_tekrar_sayisi,              // Sefer tekrar sayısı
      row.leg_durumu,                       // Leg durumu
      row.current_leg,                      // Şu anki leg
      row.total_distance,                   // Toplam mesafe
      row.eca_distance,                     // ECA mesafesi
      row.sea_fuel_consumption,             // Deniz yakıt tüketimi
      row.eca_fuel_consumption,             // ECA yakıt tüketimi
      row.port_fuel_consumption,            // Liman yakıt tüketimi
      row.ets,                              // ETS
      row.compliance_balance                // Uyum bakiyesi
  ]);

  // Veritabanına verileri ekliyoruz
  db.query(insertDataQuery, [values], (err, results) => {
      if (err) {
          console.error('Error inserting pool details:', err);
          return res.status(500).json({ error: 'Failed to save pool details' });
      }

      res.status(200).json({ success: true });
  });
});
app.get('/get-pool-summary', (req, res) => {
  const query = `
      SELECT pool_name, SUM(compliance_balance) AS total_compliance_balance 
      FROM pool_details 
      GROUP BY pool_name
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching pool summary:', err);
          return res.status(500).json({ error: 'Failed to fetch pool summary' });
      }

      res.status(200).json(results);
  });
});

// Pool Details Endpoint (to fetch specific pool details)
app.get('/get-pool-details/:poolName', (req, res) => {
  const poolName = req.params.poolName;

  const query = `
      SELECT * FROM pool_details WHERE pool_name = ?
  `;

  db.query(query, [poolName], (err, results) => {
      if (err) {
          console.error('Error fetching pool details:', err);
          return res.status(500).json({ error: 'Failed to fetch pool details' });
      }

      res.status(200).json(results);
  });
});


// Delete Pool Endpoint
app.delete('/delete-pool/:poolName', (req, res) => {
  const poolName = req.params.poolName;

  const deleteQuery = 'DELETE FROM pool_details WHERE pool_name = ?';

  db.query(deleteQuery, [poolName], (err, results) => {
      if (err) {
          console.error('Error deleting pool:', err);
          return res.status(500).json({ error: 'Failed to delete pool' });
      }

      res.status(200).json({ success: true });
  });
});
app.get('/export-excel', (req, res) => {
  const query = `
      SELECT pool_name, SUM(compliance_balance) AS total_compliance_balance 
      FROM pool_details 
      GROUP BY pool_name
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching pool details:', err);
          return res.status(500).json({ error: 'Failed to fetch pool details' });
      }

      // Veritabanı sonuçlarını Excel dosyasına çevir
      const worksheet = XLSX.utils.json_to_sheet(results);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pool Details");

      // Excel dosyasını kaydet
      const filePath = 'pool_details.xlsx';
      XLSX.writeFile(workbook, filePath);

      // Dosyayı frontend'e gönder
      res.download(filePath, (err) => {
          if (err) {
              console.error('Error downloading the Excel file:', err);
          }

          // Dosyayı indirdikten sonra sunucudan sil
          fs.unlinkSync(filePath);
      });
  });
});
app.get('/export-excel2', (req, res) => {
  const sqlQuery = `
    SELECT 
      sefer_7.vessel_name, 
      MIN(sefer_7.start_date) AS start_date_, 
      MAX(sefer_7.end_date) AS end_date_, 
      SUM(sefer_7.distance) AS distance_sum,
      SUM(sefer_7.distance_eca) AS distance_eca_sum, 
      AVG(sefer_7.speed) AS speed_avg,
      ROUND(SUM(sefer_7.port_day + sefer_7.denizde_kalinan_sure),2) AS total_days,
      SUM(sefer_7.sea_fuel) AS sea_fuel, 
      SUM(sefer_7.sea_consumption) AS sea_consumption, 
      SUM(sefer_7.eca_fuel) AS eca_fuel, 
      SUM(sefer_7.eca_consumption) AS eca_consumption, 
      SUM(sefer_7.port_fuel) AS port_fuel, 
      SUM(sefer_7.port_consumption) AS port_consumption,
      ROUND(SUM(sefer_7.ets),2) AS ets_sum
    FROM sefer_7
    GROUP BY sefer_7.vessel_name
  `; 

  db.query(sqlQuery, (err, results) => {
      if (err) {
          console.error('Error fetching data:', err);
          return res.status(500).json({ error: 'Error fetching data from database' });
      }

      // Veritabanı sonuçlarını Excel formatına çevir
      const worksheet = xlsx.utils.json_to_sheet(results);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Vessel Data');

      // Excel dosyasını kaydet
      const filePath = path.join(__dirname, 'vessel_data.xlsx');
      xlsx.writeFile(workbook, filePath);

      // Dosyayı frontend'e gönder
      res.download(filePath, (err) => {
          if (err) {
              console.error('Error sending the Excel file:', err);
          }

          // Dosyayı indirdikten sonra sunucudan sil
          fs.unlinkSync(filePath);
      });
  });
});
app.post('/export-selected', (req, res) => {
  const { selectedRows } = req.body;

  if (!selectedRows || selectedRows.length === 0) {
      return res.status(400).json({ error: 'No rows selected for export.' });
  }

  try {
      // Verileri Excel formatına dönüştür
      const worksheet = xlsx.utils.json_to_sheet(selectedRows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Selected Vessels');

      // Excel dosyasını kaydet
      const filePath = path.join(__dirname, 'selected_vessels.xlsx');
      xlsx.writeFile(workbook, filePath);

      // Dosyayı frontend'e gönder
      res.download(filePath, (err) => {
          if (err) {
              console.error('Error sending the Excel file:', err);
              return res.status(500).json({ error: 'Failed to send the file.' });
          }

          // Dosyayı indirdikten sonra sunucudan sil
          fs.unlinkSync(filePath);
      });
  } catch (error) {
      console.error('Error creating Excel file:', error);
      res.status(500).json({ error: 'Failed to create Excel file.' });
  }
});

app.get('/export-excel3', (req, res) => {
  const sqlQuery = `
    SELECT 
    sefer_7.vessel_name,
   
   
   ROUND( SUM(sefer_7.port_day + sefer_7.denizde_kalinan_sure),2) AS duration,
    
    CONCAT(
        sefer_7.sea_fuel, ', ',
        sefer_7.consumption_100_sea, ', ',
        sefer_7.eca_fuel, ', ',
        sefer_7.consumption_100_eca, ', ',
        sefer_7.port_fuel, ', ',
        sefer_7.consumption_100_port
    ) AS intra_eu,
    
    CONCAT(
        sefer_7.sea_fuel, ', ',
        sefer_7.consumption_50_sea, ', ',
        sefer_7.eca_fuel, ', ',
        sefer_7.consumption_50_eca, ', ',
        sefer_7.port_fuel, ', ',
        sefer_7.consumption_0_port
    ) AS extra_eu,
    
    SUM(sefer_7.TTW + sefer_7.WTT) AS ghg_intensity,
    89.34 AS ghg_target, 
    SUM(sefer_7.COMPLIANCE_BALANCE) AS compliance_balance,
    (ABS(SUM(sefer_7.COMPLIANCE_BALANCE))/SUM(sefer_7.TTW + sefer_7.WTT)*41000)*2400 as penalty

FROM 
    sefer_7

   
GROUP BY 
    sefer_7.vessel_name
  `; 

  db.query(sqlQuery, (err, results) => {
      if (err) {
          console.error('Error fetching data:', err);
          return res.status(500).json({ error: 'Error fetching data from database' });
      }

      // Veritabanı sonuçlarını Excel formatına çevir
      const worksheet = xlsx.utils.json_to_sheet(results);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Vessel Data CII');

      // Excel dosyasını kaydet
      const filePath = path.join(__dirname, 'vessel_data_cii.xlsx');
      xlsx.writeFile(workbook, filePath);

      // Dosyayı frontend'e gönder
      res.download(filePath, (err) => {
          if (err) {
              console.error('Error sending the Excel file:', err);
          }

          // Dosyayı indirdikten sonra sunucudan sil
          fs.unlinkSync(filePath);
      });
  });
});