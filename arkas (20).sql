-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Anamakine: 127.0.0.1:3306
-- Üretim Zamanı: 29 Eyl 2024, 16:03:01
-- Sunucu sürümü: 8.0.31
-- PHP Sürümü: 8.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Veritabanı: `arkas`
--

DELIMITER $$
--
-- Yordamlar
--
DROP PROCEDURE IF EXISTS `calculate_total_fuel`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `calculate_total_fuel` ()   BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(255);
    DECLARE cur CURSOR FOR 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'arkas'
        AND table_name LIKE 'sefer%';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Toplam ve geçici yakıt değişkenlerini sıfırla
    SET @total_fuel = 0;
    SET @fuel = 0;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO table_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- fuel_eu sütununun mevcut olup olmadığını kontrol edelim
        SET @column_check = CONCAT(
            'SELECT COUNT(*) INTO @column_exists FROM information_schema.columns ',
            'WHERE table_schema = ''arkas'' AND table_name = ''', table_name, ''' ',
            'AND column_name = ''fuel_eu'';'
        );
        
        PREPARE stmt FROM @column_check;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        -- Eğer sütun mevcutsa, fuel_eu sütunundaki değerleri topla
        IF @column_exists > 0 THEN
            SET @query = CONCAT(
                'SELECT IFNULL(SUM(fuel_eu), 0) INTO @fuel FROM ', table_name, ';'
            );
            PREPARE stmt FROM @query;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            
            -- Eğer fuel değeri sıfırsa, tabloyu ve değerleri görüntüle
            IF @fuel = 0 THEN
                SELECT table_name AS table_with_zero_fuel, @fuel AS fuel_value_for_table;
            END IF;
            
            -- Toplamı güncelle
            SET @total_fuel = @total_fuel + @fuel;
            
            -- Her bir tablo için fuel_eu değerini ve güncellenen toplamı gösterecek şekilde çıktı al
            SELECT @fuel AS fuel_value_for_table, @total_fuel AS updated_total, table_name;
        END IF;
    END LOOP;
    
    CLOSE cur;
    
    -- Toplam sonucu döndür
    SELECT @total_fuel AS total_fuel;
    
END$$

DROP PROCEDURE IF EXISTS `cii`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `cii` ()   SELECT sefer_7.vessel_name , MAX(sefer_7.start_date) as start_date_,MIN(sefer_7.end_date) as end_date_,sefer_7.dwt,SUM(sefer_7.distance+sefer_7.distance_eca) as distance, sefer_7.sea_fuel,sefer_7.sea_consumption,sefer_7.eca_fuel,sefer_7.eca_consumption,sefer_7.port_fuel,sefer_7.port_consumption,
 SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
    sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca)) AS AER,

    -- CII harfi atama işlemi
    CASE
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 14.170510 THEN 'E'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 12.741531 THEN 'D'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.907992 THEN 'C'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.193510 THEN 'B'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) <= 9.883633 THEN 'A'
        ELSE 'Unknown'
    END AS CII

FROM sefer_7
GROUP BY sefer_7.vessel_name$$

DROP PROCEDURE IF EXISTS `cii_detay`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `cii_detay` (IN `VESSEL` VARCHAR(255))   SELECT sefer_7.vessel_name , MAX(sefer_7.start_date) as start_date_,MIN(sefer_7.end_date) as end_date_,sefer_7.dwt,SUM(sefer_7.distance+sefer_7.distance_eca) as distance, sefer_7.sea_fuel,sefer_7.sea_consumption,sefer_7.eca_fuel,sefer_7.eca_consumption,sefer_7.port_fuel,sefer_7.port_consumption,
 SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
    sefer_7.dwt * (SUM(sefer_7.distance+sefer_7.distance_eca)) AS AER,

    -- CII harfi atama işlemi
    CASE
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 14.170510 THEN 'E'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 12.741531 THEN 'D'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.907992 THEN 'C'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.193510 THEN 'B'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) <= 9.883633 THEN 'A'
        ELSE 'Unknown'
    END AS CII

FROM sefer_7
WHERE sefer_7.vessel_name=VESSEL
GROUP BY sefer_7.vessel_name,sefer_7.id$$

DROP PROCEDURE IF EXISTS `complian_balance`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `complian_balance` ()   SELECT round(sum(sefer_7.COMPLIANCE_BALANCE),2) as balance
FROM sefer_7$$

DROP PROCEDURE IF EXISTS `ets`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ets` ()   SELECT 
    sefer_7.vessel_name, 
    sefer_7.dwt, 
    MIN(sefer_7.start_date) AS start_date_, 
    MAX(sefer_7.end_date) AS end_date_, 
    SUM(sefer_7.distance) AS distance_sum,
    SUM(sefer_7.distance_eca) AS distance_eca_sum, 
    AVG(sefer_7.speed) AS speed_avg,
    ROUND(SUM(sefer_7.port_day + sefer_7.denizde_kalinan_sure),2) AS total_days,
    sefer_7.sea_fuel, 
    sefer_7.sea_consumption, 
    sefer_7.eca_fuel, 
    sefer_7.eca_consumption, 
    sefer_7.port_fuel, 
    sefer_7.port_consumption,
    round(SUM(sefer_7.ets),2) AS ets_sum, 
    SUM(sefer_7.COMPLIANCE_BALANCE) AS compliance_balance_sum,
    (ABS(SUM(sefer_7.COMPLIANCE_BALANCE))/SUM(sefer_7.TTW + sefer_7.WTT)*41000)*2400 as penalty,

    -- AER hesaplaması
    SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
    sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca)) AS AER,

    -- CII harfi atama işlemi
    CASE
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 14.170510 THEN 'E'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 12.741531 THEN 'D'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.907992 THEN 'C'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.193510 THEN 'B'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) <= 9.883633 THEN 'A'
        ELSE 'Unknown'
    END AS CII

FROM sefer_7
GROUP BY sefer_7.vessel_name$$

DROP PROCEDURE IF EXISTS `ets_detay`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ets_detay` (IN `VESSEL` VARCHAR(255))   SELECT 
    sefer_7.vessel_name, 
    sefer_7.dwt, 
    sefer_7.start_date AS start_date_, 
    sefer_7.end_date AS end_date_, 
    sefer_7.distance AS distance_sum,
    sefer_7.distance_eca AS distance_eca_sum, 
    sefer_7.speed AS speed_avg,
    sefer_7.port_day + sefer_7.denizde_kalinan_sure AS total_days,
    sefer_7.sea_fuel, 
    sefer_7.sea_consumption, 
    sefer_7.eca_fuel, 
    sefer_7.eca_consumption, 
    sefer_7.port_fuel, 
    sefer_7.port_consumption,
    sefer_7.ets AS ets_sum, 
    sefer_7.COMPLIANCE_BALANCE AS compliance_balance_sum,

    -- AER hesaplaması
    (sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
    (sefer_7.dwt * (sefer_7.distance + sefer_7.distance_eca)) AS AER,

    -- CII harfi atama işlemi
    CASE
        WHEN (sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              (sefer_7.dwt * (sefer_7.distance + sefer_7.distance_eca)) > 14.170510 THEN 'E'
        WHEN (sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              (sefer_7.dwt * (sefer_7.distance + sefer_7.distance_eca)) > 12.741531 THEN 'D'
        WHEN (sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              (sefer_7.dwt * (sefer_7.distance + sefer_7.distance_eca)) > 11.907992 THEN 'C'
        WHEN (sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              (sefer_7.dwt * (sefer_7.distance + sefer_7.distance_eca)) > 11.193510 THEN 'B'
        WHEN (sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              (sefer_7.dwt * (sefer_7.distance + sefer_7.distance_eca)) <= 9.883633 THEN 'A'
        ELSE 'Unknown'
    END AS CII

FROM sefer_7
WHERE sefer_7.vessel_name = VESSEL  -- Gemiyi burada belirtmelisiniz
GROUP BY 
    sefer_7.vessel_name, 
    sefer_7.start_date, 
    sefer_7.end_date, 
    sefer_7.dwt, 
    sefer_7.distance, 
    sefer_7.distance_eca, 
    sefer_7.speed, 
    sefer_7.port_day, 
    sefer_7.denizde_kalinan_sure, 
    sefer_7.sea_fuel, 
    sefer_7.sea_consumption, 
    sefer_7.eca_fuel, 
    sefer_7.eca_consumption, 
    sefer_7.port_fuel, 
    sefer_7.port_consumption, 
    sefer_7.ets, 
    sefer_7.COMPLIANCE_BALANCE$$

DROP PROCEDURE IF EXISTS `fuel_eu`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `fuel_eu` ()   SELECT 
    sefer_7.vessel_name,
    MIN(sefer_7.start_date) AS min_start_date,
    MAX(sefer_7.end_date) AS max_end_date,
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
    sefer_7.vessel_name$$

DROP PROCEDURE IF EXISTS `fuel_eu_detay`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `fuel_eu_detay` (IN `VESSEL` VARCHAR(255))   SELECT 
    sefer_7.vessel_name,
    MIN(sefer_7.start_date) AS min_start_date,
    MAX(sefer_7.end_date) AS max_end_date,
    SUM(sefer_7.port_day + sefer_7.denizde_kalinan_sure) AS duration,
    CONCAT(sefer_7.sea_fuel, ', ', sefer_7.consumption_100_sea, ', ', sefer_7.eca_fuel, ', ', sefer_7.consumption_100_eca, ', ', sefer_7.port_fuel, ', ', sefer_7.consumption_100_port) AS intra_fuel_types,
    CONCAT(sefer_7.sea_fuel, ', ', sefer_7.consumption_50_sea, ', ', sefer_7.eca_fuel, ', ', sefer_7.consumption_50_eca, ', ', sefer_7.port_fuel, ', ', sefer_7.consumption_0_port) AS extra_fuel_types,
    SUM(sefer_7.TTW + sefer_7.WTT) AS ghg_intensity,
    89.34 AS ghg_target,
    SUM(sefer_7.COMPLIANCE_BALANCE) AS compliance_balance
FROM 
    sefer_7
WHERE 
    sefer_7.vessel_name = VESSEL
GROUP BY 
    sefer_7.vessel_name,sefer_7.id$$

DROP PROCEDURE IF EXISTS `GetETSBetweenDates`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetETSBetweenDates` ()   SELECT 
        vessel_name,
      
        MONTHNAME(start_date) AS month_name, 
        round(SUM(ets),2) AS total_ets
    FROM sefer_7
   
    GROUP BY vessel_name$$

DROP PROCEDURE IF EXISTS `GetETSByMonth`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetETSByMonth` ()   BEGIN
    SELECT 
        MONTHNAME(start_date) AS month_name, 
        SUM(ets) AS total_ets
    FROM sefer_7
   
    GROUP BY MONTH(start_date)
    ORDER BY MONTH(start_date);
END$$

DROP PROCEDURE IF EXISTS `get_vessel_cii`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `get_vessel_cii` ()   BEGIN
    SELECT 
        sefer_7.vessel_name, 
        sefer_7.sea_fuel, 
        sefer_7.sea_consumption, 
        sefer_7.eca_fuel, 
        sefer_7.eca_consumption, 
        sefer_7.port_fuel, 
        sefer_7.port_consumption,

        -- CII harfi atama işlemi
        CASE
            WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
                  sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 14.170510 THEN 'E'
            WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
                  sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 12.741531 THEN 'D'
            WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
                  sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.907992 THEN 'C'
            WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
                  sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.193510 THEN 'B'
            WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
                  sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) <= 9.883633 THEN 'A'
            ELSE 'Unknown'
        END AS CII
    FROM sefer_7
    GROUP BY sefer_7.vessel_name;
END$$

DROP PROCEDURE IF EXISTS `ghg_intensity`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ghg_intensity` ()   SELECT 
    round(SUM(sefer_7.TTW + sefer_7.WTT),2) AS ghg
FROM sefer_7$$

DROP PROCEDURE IF EXISTS `total_consumption`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `total_consumption` ()   SELECT round(SUM(sefer_7.sea_consumption+sefer_7.eca_consumption+sefer_7.port_consumption),2) as total
FROM sefer_7$$

DROP PROCEDURE IF EXISTS `vessel_table`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `vessel_table` ()   SELECT sefer_7.vessel_name , sefer_7.sea_fuel,sefer_7.sea_consumption,sefer_7.eca_fuel,sefer_7.eca_consumption,sefer_7.port_fuel,sefer_7.port_consumption,
 

    -- CII harfi atama işlemi
    CASE
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 14.170510 THEN 'E'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 12.741531 THEN 'D'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.907992 THEN 'C'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) > 11.193510 THEN 'B'
        WHEN (SUM(sefer_7.sea_consumption + sefer_7.eca_consumption + sefer_7.port_consumption) /
              sefer_7.dwt * (SUM(sefer_7.distance) + SUM(sefer_7.distance_eca))) <= 9.883633 THEN 'A'
        ELSE 'Unknown'
    END AS CII

FROM sefer_7
GROUP BY sefer_7.vessel_name$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `arkas_ships`
--

DROP TABLE IF EXISTS `arkas_ships`;
CREATE TABLE IF NOT EXISTS `arkas_ships` (
  `company_id` int NOT NULL,
  `company_name` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_turkish_ci NOT NULL,
  `GHG_Target` float NOT NULL,
  PRIMARY KEY (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_turkish_ci;

--
-- Tablo döküm verisi `arkas_ships`
--

INSERT INTO `arkas_ships` (`company_id`, `company_name`, `GHG_Target`) VALUES
(1, 'arkas', 89.34);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `cii`
--

DROP TABLE IF EXISTS `cii`;
CREATE TABLE IF NOT EXISTS `cii` (
  `company_id` int NOT NULL,
  `refer_year` year NOT NULL,
  `A` float NOT NULL,
  `B` float NOT NULL,
  `C` float NOT NULL,
  `D` float NOT NULL,
  `E` float NOT NULL,
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_turkish_ci;

--
-- Tablo döküm verisi `cii`
--

INSERT INTO `cii` (`company_id`, `refer_year`, `A`, `B`, `C`, `D`, `E`) VALUES
(1, 2019, 8.77, 8.77, 8.77, 9.39, 9.39);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `fuel_data`
--

DROP TABLE IF EXISTS `fuel_data`;
CREATE TABLE IF NOT EXISTS `fuel_data` (
  `ID` int NOT NULL,
  `Company_id` int DEFAULT NULL,
  `Pathway_Name` varchar(27) CHARACTER SET utf8mb3 COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `Fuel_Class` varchar(8) CHARACTER SET utf8mb3 COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `LCV` float DEFAULT NULL,
  `E_(gCO2eq/MJ)` float DEFAULT NULL,
  `CO2eqWtT` float DEFAULT NULL,
  `Fuel Consumer Unit Class` varchar(33) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `Cf_CO2_ggFuel` float DEFAULT NULL,
  `Cf (CH4) (g/gFuel)` float DEFAULT NULL,
  `Cf (N2O) (g/gFuel)` float DEFAULT NULL,
  `Cslip (%)` float DEFAULT NULL,
  `Cf_CO2eq_TtW` float DEFAULT NULL,
  `CO2eqTTW` float DEFAULT NULL,
  `Fuel_Price` float DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `Company ID` (`Company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_turkish_ci;

--
-- Tablo döküm verisi `fuel_data`
--

INSERT INTO `fuel_data` (`ID`, `Company_id`, `Pathway_Name`, `Fuel_Class`, `LCV`, `E_(gCO2eq/MJ)`, `CO2eqWtT`, `Fuel Consumer Unit Class`, `Cf_CO2_ggFuel`, `Cf (CH4) (g/gFuel)`, `Cf (N2O) (g/gFuel)`, `Cslip (%)`, `Cf_CO2eq_TtW`, `CO2eqTTW`, `Fuel_Price`) VALUES
(1, 1, 'HFO', 'Fossil', 0.0405, 0, 13.5, 'ALL ICEs', 3.114, 0.00005, 0.00018, 0, 3.1631, 78.1, 592),
(2, 1, 'LFO', 'Fossil', 0.041, 0, 13.2, 'ALL ICEs', 3.151, 0.00005, 0.00018, 0, 3.2001, 78.05, 580),
(3, 1, 'MDO', 'Fossil', 0.0427, 0, 14.4, 'ALL ICEs', 3.206, 0.00005, 0.00018, 0, 3.2551, 76.23, 750),
(4, 1, 'MGO', 'Fossil', 0.0427, 0, 14.4, 'ALL ICEs', 3.206, 0.00005, 0.00018, 0, 3.2551, 76.23, 750),
(5, 1, 'LNG Otto - Medium Speed', 'Fossil', 0.0491, 0, 18.5, 'LNG Otto (dual fuel medium speed)', 2.75, 0, 0.00011, 3.1, 2.77915, 72.53, 800),
(6, 1, 'LNG Otto - Slow Speed', 'Fossil', 0.0491, 0, 18.5, 'LNG Otto (dual fuel slow speed)', 2.75, 0, 0.00011, 1.7, 2.77915, 65.33, 800),
(7, 1, 'LNG Diesel - Slow Speed', 'Fossil', 0.0491, 0, 18.5, 'LNG Diesel (dual fuel slow speed)', 2.75, 0, 0.00011, 0.2, 2.77915, 57.63, 800),
(8, 1, 'LNG - LBSI', 'Fossil', 0.0491, 0, 18.5, 'LBSI', 2.75, 0, 0.00011, 2.6, 2.77915, 69.96, 800),
(9, 1, 'LPG', 'Fossil', 0.046, 0, 7.8, 'ALL ICEs', 3, 0.00005, 0.00018, 0, 3.0491, 66.28, 650),
(10, 1, 'H2', 'Fossil', 0.12, 0, 100, 'Fuel cells & ICEs', 0, 0, 0.00018, 0, 0.0477, 0.4, 2400),
(11, 1, 'NH3', 'Fossil', 0.0186, 0, 100, 'Fuel cells & ICEs', 0, 0, 0.00018, 0, 0.0477, 2.56, 1200),
(12, 1, 'Methanol', 'Fossil', 0.0199, 0, 31.3, 'ALL ICEs', 1.375, 0, 0.00018, 0, 1.4227, 71.49, 700),
(13, 1, 'Ethanol', 'Biofuels', 0.027, 35.4, -35.4, 'ALL ICEs', 1.913, 0.00005, 0.00018, 0, 1.9621, 72.67, 950),
(14, 1, 'Bio-diesel', 'Biofuels', 0.037, 27.3, -49.3, 'ALL ICEs', 2.834, 0.00005, 0.00018, 0, 2.8831, 77.92, 1350),
(15, 1, 'HVO', 'Biofuels', 0.044, 37.4, -33.4, 'ALL ICEs', 3.115, 0.00005, 0.00018, 0, 3.1641, 71.91, 1300),
(16, 1, 'Bio-LNG Otto - Medium Speed', 'Biofuels', 0.05, 30, -25, 'LNG Otto (dual fuel medium speed)', 2.75, 0, 0.00011, 3.1, 2.77915, 71.22, 1600),
(17, 1, 'Bio-LNG Otto - Slow Speed', 'Biofuels', 0.05, 30, -25, 'LNG Otto (dual fuel slow speed)', 2.75, 0, 0.00011, 1.7, 2.77915, 64.16, 1600),
(18, 1, 'Bio-LNG Diesel - Slow Speed', 'Biofuels', 0.05, 30, -25, 'LNG Diesel (dual fuel slow speed)', 2.75, 0, 0.00011, 0.2, 2.77915, 56.59, 1600),
(19, 1, 'Bio-LNG - LBSI', 'Biofuels', 0.05, 30, -25, 'LBSI', 2.75, 0, 0.00011, 2.6, 2.77915, 68.7, 1600),
(20, 1, 'Bio-methanol', 'Biofuels', 0.02, 13.4, -55.4, 'ALL ICEs', 1.375, 0, 0.00018, 0, 1.4227, 71.14, 1400),
(21, 1, 'Other (Arkas Bunker B24)', 'Biofuels', 0.04175, 71.34, 12.8729, 'ALL ICEs', 2.367, 0.00005, 0.00018, 0, 2.4161, 56.6946, 1000),
(22, 1, 'Arkas Bunker B24', 'Biofuels', 0.04175, 0, 14.646, 'ALL ICEs', 2.367, 0.00005, 0.00018, 0, 2.367, 56.694, 550),
(23, 1, 'Bio-H2', 'Biofuels', 0.12, 0, 30, 'Fuel cells & ICEs', 0, 0, 0.00018, 0, 0.0477, 0.4, 4800),
(24, 1, 'e-diesel', 'RFNBO', 0.0427, 0, 27.3, 'ALL ICEs', 3.206, 0.00005, 0.00018, 0, 3.2551, 38.12, 1950),
(25, 1, 'e-methanol', 'RFNBO', 0.0199, 0, 13.4, 'ALL ICEs', 1.375, 0.00005, 0.00018, 0, 1.4241, 35.78, 2100),
(26, 1, 'e-LNG Otto - Medium Speed', 'RFNBO', 0.0491, 0, 30, 'LNG Otto (dual fuel medium speed)', 2.75, 0, 0.00011, 3.1, 823.275, 36.26, 2400),
(27, 1, 'e-LNG Otto - Slow Speed', 'RFNBO', 0.0491, 0, 30, 'LNG Otto (dual fuel slow speed)', 2.75, 0, 0.00011, 1.7, 784.075, 32.67, 2400),
(28, 1, 'e-LNG Diesel - Slow Speed', 'RFNBO', 0.0491, 0, 30, 'LNG Diesel (dual fuel slow speed)', 2.75, 0, 0.00011, 0.2, 742.075, 28.81, 2400),
(29, 1, 'e-LNG - LBSI', 'RFNBO', 0.0491, 0, 30, 'LBSI', 2.75, 0, 0.00011, 2.6, 809.275, 34.98, 2400),
(30, 1, 'e-H2', 'RFNBO', 0.12, 0, 30, 'Fuel cells & ICEs', 0, 0, 0.00018, 0, 12.6407, 0.2, 7200),
(31, 1, 'e-NH3', 'RFNBO', 0.0186, 0, 30, 'Fuel cells & ICEs', 0, 0, 0.00018, 0, 12.6407, 1.28, 1050),
(32, 1, 'e-LPG', 'RFNBO', 0.046, 0, 30, 'ALL ICEs', 3, 0.00005, 0.00018, 0, 808.012, 33.14, 1950),
(33, 1, 'e-DME', 'RFNBO', 0.288, 0, 30, 'ALL ICEs', 1.91, 0.00005, 0.00018, 0, 519.162, 3.4, 1950);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `fuel_eu`
--

DROP TABLE IF EXISTS `fuel_eu`;
CREATE TABLE IF NOT EXISTS `fuel_eu` (
  `VESSEL_NAME` varchar(50) COLLATE utf8mb3_turkish_ci NOT NULL,
  `Pathway_Name` varchar(50) COLLATE utf8mb3_turkish_ci NOT NULL,
  `energy_consumption` float NOT NULL,
  `LCV` float NOT NULL,
  `CO2eqWtT` float NOT NULL,
  `CO2eqTTW` float NOT NULL,
  `Cf_CO2eq_TtW` float NOT NULL,
  `complain_balance` float NOT NULL,
  `fuel_eu` float NOT NULL,
  `yakıt_miktar` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_turkish_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `rota_data`
--

DROP TABLE IF EXISTS `rota_data`;
CREATE TABLE IF NOT EXISTS `rota_data` (
  `rota_id` int NOT NULL,
  `port` varchar(14) CHARACTER SET utf8mb3 COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `status` varchar(13) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  PRIMARY KEY (`rota_id`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_turkish_ci;

--
-- Tablo döküm verisi `rota_data`
--

INSERT INTO `rota_data` (`rota_id`, `port`, `status`, `company_id`) VALUES
(1, 'Aliağa', 'NON-EU', 1),
(2, 'Valencia', 'EU', 1),
(3, 'Savannah', 'NON-EU', 1),
(4, 'Tanger MED', 'NON-EU', 1),
(5, 'ALEXANDRIA', 'NON-EU', 1),
(6, 'Tanger MED', 'NON-EU', 1),
(7, 'EAST PORT SAID', 'NON-EU', 1),
(8, 'ALEXANDRIA', 'NON-EU', 1),
(9, 'BARCELONA', 'EU', 1),
(10, 'Savannah', 'NON-EU', 1),
(11, 'Rades', 'NON-EU', 1),
(12, 'Mersin', 'NON-EU', 1),
(13, 'Bourgas', 'EU', 1),
(14, 'Piraeus', 'EU', 1),
(15, 'Genoa', 'EU', 1),
(16, 'La Spezia', 'EU', 1),
(17, 'sousse', 'NON-EU', 1),
(18, 'Salerno', 'EU', 1),
(19, 'Algeciras', 'EU', 1);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `sefer_7`
--

DROP TABLE IF EXISTS `sefer_7`;
CREATE TABLE IF NOT EXISTS `sefer_7` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT '1',
  `vessel_name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_turkish_ci NOT NULL,
  `dwt` float NOT NULL,
  `from_liman` varchar(255) COLLATE utf8mb3_turkish_ci NOT NULL,
  `to_liman` varchar(255) COLLATE utf8mb3_turkish_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `distance` float NOT NULL,
  `distance_eca` float NOT NULL,
  `port_day` float NOT NULL,
  `speed` float NOT NULL,
  `denizde_kalinan_sure` float NOT NULL,
  `gunluk_tuketim_sea` float NOT NULL,
  `gunluk_tuketim_port` float NOT NULL,
  `sea_fuel` varchar(255) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `eca_fuel` varchar(255) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `port_fuel` varchar(255) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `sea_consumption` float DEFAULT '0',
  `eca_consumption` float DEFAULT '0',
  `port_consumption` float DEFAULT '0',
  `consumption_100_sea` float DEFAULT '0',
  `consumption_50_sea` float DEFAULT '0',
  `consumption_100_eca` float DEFAULT '0',
  `consumption_50_eca` float DEFAULT '0',
  `consumption_100_port` float DEFAULT '0',
  `consumption_0_port` float DEFAULT '0',
  `zeroSeaConsumption` float DEFAULT '0',
  `zeroEcaConsumption` float DEFAULT '0',
  `ets` float DEFAULT '0',
  `Fuel_Consumption_Total` float DEFAULT '0',
  `TTW` float DEFAULT '0',
  `WTT` float DEFAULT '0',
  `GHG_ACTUAL` float DEFAULT '0',
  `COMPLIANCE_BALANCE` float DEFAULT '0',
  `fuel_eu` float DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`)
) ENGINE=MyISAM AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_turkish_ci;

--
-- Tablo döküm verisi `sefer_7`
--

INSERT INTO `sefer_7` (`id`, `company_id`, `vessel_name`, `dwt`, `from_liman`, `to_liman`, `status`, `start_date`, `end_date`, `distance`, `distance_eca`, `port_day`, `speed`, `denizde_kalinan_sure`, `gunluk_tuketim_sea`, `gunluk_tuketim_port`, `sea_fuel`, `eca_fuel`, `port_fuel`, `sea_consumption`, `eca_consumption`, `port_consumption`, `consumption_100_sea`, `consumption_50_sea`, `consumption_100_eca`, `consumption_50_eca`, `consumption_100_port`, `consumption_0_port`, `zeroSeaConsumption`, `zeroEcaConsumption`, `ets`, `Fuel_Consumption_Total`, `TTW`, `WTT`, `GHG_ACTUAL`, `COMPLIANCE_BALANCE`, `fuel_eu`, `created_at`) VALUES
(39, 1, '3', 150000, 'EAST PORT SAID', 'BARCELONA', 'NON-EU/EU', '2024-10-08', '2024-10-13', 1592, 0, 1, 15, 4.42222, 18, 5, 'HFO', 'MGO', 'MGO', 79.6, 0, 5, 0, 39.8, 0, 0, 5, 0, 0, 0, 55.9869, 44.8, 76.812, 13.6053, 90.4173, -48263300, 31245.9, '2024-09-26 21:04:06'),
(37, 1, '3', 150000, 'Valencia', 'Tanger MED', 'EU/NON-EU', '2024-09-30', '2024-10-02', 407, 0, 1, 15, 1.13056, 18, 5, 'HFO', 'MGO', 'MGO', 20.35, 0, 5, 0, 10.175, 0, 0, 0, 0, 0, 0, 12.674, 10.175, 76.8889, 13.5, 90.3889, -10672400, 6911.56, '2024-09-26 21:04:06'),
(38, 1, '3', 150000, 'Tanger MED', 'EAST PORT SAID', 'NON-EU/NON-EU', '2024-10-02', '2024-10-08', 1925, 0, 1, 15, 5.34722, 18, 5, 'HFO', 'MGO', 'MGO', 96.25, 0, 5, 0, 0, 0, 0, 0, 0, 96.25, 0, 0, 96.25, 0, 0, 0, 0, 0, '2024-09-26 21:04:06'),
(36, 1, '3', 150000, 'Aliağa', 'Valencia', 'NON-EU/EU', '2024-09-26', '2024-09-30', 1393, 0, 1, 15, 3.86944, 18, 5, 'HFO', 'MGO', 'MGO', 69.65, 0, 5, 0, 34.825, 0, 0, 5, 0, 0, 0, 49.79, 39.825, 76.8025, 13.6183, 90.4208, -43044100, 27865.9, '2024-09-26 21:04:06'),
(35, 1, '2', 1000, 'Savannah', 'Aliağa', 'NON-EU/NON-EU', '2024-10-31', '2024-11-19', 4798, 536, 1, 12, 18.5208, 18, 5, 'HFO', 'MGO', 'MGO', 333.375, 33.5, 5, 0, 0, 0, 0, 0, 0, 333.375, 33.5, 0, 366.875, 0, 0, 0, 0, 0, '2024-09-26 20:57:32'),
(33, 1, '2', 1000, 'ALEXANDRIA', 'BARCELONA', 'NON-EU/EU', '2024-10-11', '2024-10-17', 1473, 0, 1, 12, 5.11458, 18, 5, 'HFO', 'MGO', 'MGO', 92.0625, 0, 5, 0, 46.0312, 0, 0, 5, 0, 0, 0, 63.7485, 51.0312, 76.8214, 13.5925, 90.4139, -54800100, 35479.2, '2024-09-26 20:57:32'),
(34, 1, '2', 1000, 'BARCELONA', 'Savannah', 'EU/NON-EU', '2024-10-17', '2024-10-31', 3712, 195, 1, 12, 13.566, 18, 5, 'HFO', 'MGO', 'MGO', 244.188, 12.1875, 5, 0, 122.094, 0, 6.09375, 0, 0, 0, 0, 159.895, 128.188, 76.856, 13.545, 90.401, -136011000, 88070.3, '2024-09-26 20:57:32'),
(32, 1, '2', 1000, 'EAST PORT SAID', 'ALEXANDRIA', 'NON-EU/NON-EU', '2024-10-10', '2024-10-11', 157, 0, 1, 12, 0.545139, 18, 5, 'HFO', 'MGO', 'MGO', 9.8125, 0, 5, 0, 0, 0, 0, 0, 0, 9.8125, 0, 0, 9.8125, 0, 0, 0, 0, 0, '2024-09-26 20:57:32'),
(31, 1, '2', 1000, 'Tanger MED', 'EAST PORT SAID', 'NON-EU/NON-EU', '2024-10-03', '2024-10-10', 1925, 0, 1, 12, 6.68403, 18, 5, 'HFO', 'MGO', 'MGO', 120.312, 0, 5, 0, 0, 0, 0, 0, 0, 120.312, 0, 0, 120.312, 0, 0, 0, 0, 0, '2024-09-26 20:57:32'),
(30, 1, '2', 1000, 'Valencia', 'Tanger MED', 'EU/NON-EU', '2024-10-01', '2024-10-03', 407, 0, 1, 12, 1.41319, 18, 5, 'HFO', 'MGO', 'MGO', 25.4375, 0, 5, 0, 12.7188, 0, 0, 0, 0, 0, 0, 15.8425, 12.7188, 76.8889, 13.5, 90.3889, -13340600, 8639.45, '2024-09-26 20:57:32'),
(29, 1, '2', 1000, 'Aliağa', 'Valencia', 'NON-EU/EU', '2024-09-26', '2024-10-01', 1394, 0, 1, 12, 4.84028, 18, 5, 'HFO', 'MGO', 'MGO', 87.125, 0, 5, 0, 43.5625, 0, 0, 5, 0, 0, 0, 60.6735, 48.5625, 76.818, 13.5972, 90.4151, -52210300, 33802, '2024-09-26 20:57:32'),
(28, 1, '1', 15000, 'ALEXANDRIA', 'Aliağa', 'NON-EU/NON-EU', '2024-11-07', '2024-11-09', 555, 0, 1, 12, 1.92708, 18, 5, 'HFO', 'MGO', 'MGO', 34.6875, 0, 5, 0, 0, 0, 0, 0, 0, 34.6875, 0, 0, 34.6875, 0, 0, 0, 0, 0, '2024-09-26 20:52:54'),
(27, 1, '1', 15000, 'Tanger MED', 'ALEXANDRIA', 'NON-EU/NON-EU', '2024-10-31', '2024-11-07', 1804, 0, 1.2, 12, 6.26389, 18, 5, 'HFO', 'MGO', 'MGO', 112.75, 0, 6, 0, 0, 0, 0, 0, 0, 112.75, 0, 0, 112.75, 0, 0, 0, 0, 0, '2024-09-26 20:52:54'),
(26, 1, '1', 15000, 'Savannah', 'Tanger MED', 'NON-EU/NON-EU', '2024-10-16', '2024-10-31', 3675, 0, 2.8, 12, 12.7604, 18, 5, 'HFO', 'MGO', 'MGO', 229.688, 0, 14, 0, 0, 0, 0, 0, 0, 229.688, 0, 0, 229.688, 0, 0, 0, 0, 0, '2024-09-26 20:52:54'),
(25, 1, '1', 15000, 'Valencia', 'Savannah', 'EU/NON-EU', '2024-10-01', '2024-10-16', 4087, 0, 1.5, 12, 14.191, 18, 5, 'HFO', 'MGO', 'MGO', 255.438, 0, 7.5, 0, 127.719, 0, 0, 0, 0, 0, 0, 159.086, 127.719, 76.8889, 13.5, 90.3889, -133963000, 86755.4, '2024-09-26 20:52:54'),
(24, 1, '1', 15000, 'Aliağa', 'Valencia', 'NON-EU/EU', '2024-09-26', '2024-10-01', 1394, 0, 1, 12, 4.84028, 18, 5, 'HFO', 'MGO', 'MGO', 87.125, 0, 5, 0, 43.5625, 0, 0, 5, 0, 0, 0, 60.6735, 48.5625, 76.818, 13.5972, 90.4151, -52210300, 33802, '2024-09-26 20:52:54'),
(40, 1, '3', 150000, 'BARCELONA', 'ALEXANDRIA', 'EU/NON-EU', '2024-10-13', '2024-10-18', 1472, 0, 1, 15, 4.08889, 18, 5, 'HFO', 'MGO', 'MGO', 73.6, 0, 5, 0, 36.8, 0, 0, 0, 0, 0, 0, 45.8381, 36.8, 76.8889, 13.5, 90.3889, -38599100, 24997.1, '2024-09-26 21:04:06'),
(41, 1, '3', 150000, 'ALEXANDRIA', 'Aliağa', 'NON-EU/NON-EU', '2024-10-18', '2024-10-20', 555, 0, 1, 15, 1.54167, 18, 5, 'HFO', 'MGO', 'MGO', 27.75, 0, 5, 0, 0, 0, 0, 0, 0, 27.75, 0, 0, 27.75, 0, 0, 0, 0, 0, '2024-09-26 21:04:06'),
(42, 1, '4', 150000, 'Aliağa', 'Valencia', 'NON-EU/EU', '2024-09-27', '2024-10-02', 1394, 0, 1, 12, 4.84028, 18, 5, 'HFO', 'MGO', 'MGO', 87.125, 0, 5, 0, 43.5625, 0, 0, 5, 0, 0, 0, 60.6735, 48.5625, 76.818, 13.5972, 90.4151, -52210300, 33802, '2024-09-26 21:15:51'),
(43, 1, '4', 150000, 'Valencia', 'Tanger MED', 'EU/NON-EU', '2024-10-02', '2024-10-04', 407, 0, 1, 12, 1.41319, 18, 5, 'HFO', 'MGO', 'MGO', 25.4375, 0, 5, 0, 12.7188, 0, 0, 0, 0, 0, 0, 15.8425, 12.7188, 76.8889, 13.5, 90.3889, -13340600, 8639.45, '2024-09-26 21:15:51'),
(44, 1, '4', 150000, 'Tanger MED', 'Rades', 'NON-EU/NON-EU', '2024-10-04', '2024-10-07', 815, 0, 1, 12, 2.82986, 18, 5, 'HFO', 'MGO', 'MGO', 50.9375, 0, 5, 0, 0, 0, 0, 0, 0, 50.9375, 0, 0, 50.9375, 0, 0, 0, 0, 0, '2024-09-26 21:15:51'),
(45, 1, '4', 150000, 'Rades', 'BARCELONA', 'NON-EU/EU', '2024-10-07', '2024-10-09', 490, 0, 1, 12, 1.70139, 18, 5, 'HFO', 'MGO', 'MGO', 30.625, 0, 5, 0, 15.3125, 0, 0, 5, 0, 0, 0, 25.4853, 20.3125, 76.7206, 13.7305, 90.4511, -22569500, 14606.1, '2024-09-26 21:15:51'),
(46, 1, '4', 150000, 'BARCELONA', 'ALEXANDRIA', 'EU/NON-EU', '2024-10-09', '2024-10-15', 1472, 0, 1, 12, 5.11111, 18, 5, 'HFO', 'MGO', 'MGO', 92, 0, 5, 0, 46, 0, 0, 0, 0, 0, 0, 57.2976, 46, 76.8889, 13.5, 90.3889, -48248900, 31246.4, '2024-09-26 21:15:51'),
(47, 1, '4', 150000, 'ALEXANDRIA', 'Aliağa', 'NON-EU/NON-EU', '2024-10-15', '2024-10-17', 555, 0, 1, 12, 1.92708, 18, 5, 'HFO', 'MGO', 'MGO', 34.6875, 0, 5, 0, 0, 0, 0, 0, 0, 34.6875, 0, 0, 34.6875, 0, 0, 0, 0, 0, '2024-09-26 21:15:51'),
(48, 1, '5', 15000000, 'Aliağa', 'Mersin', 'NON-EU/NON-EU', '2024-09-11', '2024-09-13', 621, 0, 1, 13, 1.99038, 18, 5, 'HFO', 'MGO', 'MGO', 35.8269, 0, 5, 0, 0, 0, 0, 0, 0, 35.8269, 0, 0, 35.8269, 0, 0, 0, 0, 0, '2024-09-26 21:17:47'),
(49, 1, '5', 15000000, 'Mersin', 'Bourgas', 'NON-EU/EU', '2024-09-13', '2024-09-17', 939, 0, 1, 13, 3.00962, 18, 5, 'HFO', 'MGO', 'MGO', 54.1731, 0, 5, 0, 27.0865, 0, 0, 5, 0, 0, 0, 40.151, 32.0865, 76.7818, 13.6466, 90.4285, -34925300, 22608, '2024-09-26 21:17:47'),
(50, 1, '5', 15000000, 'Bourgas', 'Rades', 'EU/NON-EU', '2024-09-17', '2024-09-21', 1195, 0, 1, 13, 3.83013, 18, 5, 'HFO', 'MGO', 'MGO', 68.9423, 0, 5, 0, 34.4712, 0, 0, 0, 0, 0, 0, 42.9373, 34.4712, 76.8889, 13.5, 90.3889, -36156400, 23415.2, '2024-09-26 21:17:47'),
(51, 1, '5', 15000000, 'Rades', 'Aliağa', 'NON-EU/NON-EU', '2024-09-21', '2024-09-24', 896, 0, 1, 13, 2.87179, 18, 5, 'HFO', 'MGO', 'MGO', 51.6923, 0, 5, 0, 0, 0, 0, 0, 0, 51.6923, 0, 0, 51.6923, 0, 0, 0, 0, 0, '2024-09-26 21:17:47'),
(52, 1, '6', 1500000, 'Aliağa', 'Piraeus', 'NON-EU/EU', '2024-08-28', '2024-08-29', 198, 0, 1, 13, 0.634615, 18, 5, 'HFO', 'MGO', 'MGO', 11.4231, 0, 5, 0, 5.71154, 0, 0, 5, 0, 0, 0, 13.5263, 10.7115, 76.5735, 13.932, 90.5055, -12484300, 8074.54, '2024-09-26 21:21:41'),
(53, 1, '6', 1500000, 'Piraeus', 'Genoa', 'EU/EU', '2024-08-29', '2024-09-02', 979, 0, 1, 13, 3.13782, 18, 5, 'HFO', 'MGO', 'MGO', 56.4808, 0, 5, 56.4808, 0, 0, 0, 5, 0, 0, 0, 76.7644, 61.4808, 76.8328, 13.5768, 90.4096, -65761700, 42578, '2024-09-26 21:21:41'),
(54, 1, '6', 1500000, 'Genoa', 'La Spezia', 'EU/EU', '2024-09-02', '2024-09-03', 60, 0, 1, 13, 0.192308, 18, 5, 'HFO', 'MGO', 'MGO', 3.46154, 0, 5, 3.46154, 0, 0, 0, 5, 0, 0, 0, 10.7237, 8.46154, 76.4923, 14.0433, 90.5355, -10116200, 6540.71, '2024-09-26 21:21:41'),
(55, 1, '6', 1500000, 'La Spezia', 'ALEXANDRIA', 'EU/NON-EU', '2024-09-03', '2024-09-08', 1276, 0, 1, 13, 4.08974, 18, 5, 'HFO', 'MGO', 'MGO', 73.6154, 0, 5, 0, 36.8077, 0, 0, 0, 0, 0, 0, 45.8477, 36.8077, 76.8889, 13.5, 90.3889, -38607200, 25002.3, '2024-09-26 21:21:41'),
(56, 1, '6', 1500000, 'ALEXANDRIA', 'sousse', 'NON-EU/NON-EU', '2024-09-08', '2024-09-12', 1004, 0, 1, 13, 3.21795, 18, 5, 'HFO', 'MGO', 'MGO', 57.9231, 0, 5, 0, 0, 0, 0, 0, 0, 57.9231, 0, 0, 57.9231, 0, 0, 0, 0, 0, '2024-09-26 21:21:41'),
(57, 1, '6', 1500000, 'Mersin', 'Aliağa', 'NON-EU/NON-EU', '2024-09-12', '2024-09-14', 621, 0, 1, 13, 1.99038, 18, 5, 'HFO', 'MGO', 'MGO', 35.8269, 0, 5, 0, 0, 0, 0, 0, 0, 35.8269, 0, 0, 35.8269, 0, 0, 0, 0, 0, '2024-09-26 21:21:41'),
(58, 1, '7', 155000, 'Salerno', 'Piraeus', 'EU/EU', '2024-08-31', '2024-09-03', 649, 0, 1, 11, 2.45833, 18, 5, 'HFO', 'MGO', 'MGO', 44.25, 0, 5, 44.25, 0, 0, 0, 5, 0, 0, 0, 61.5298, 49.25, 76.8189, 13.5958, 90.4147, -52931500, 34269.1, '2024-09-26 21:23:55'),
(59, 1, '7', 155000, 'Piraeus', 'Genoa', 'EU/EU', '2024-09-03', '2024-09-07', 979, 0, 1, 11, 3.70833, 18, 5, 'HFO', 'MGO', 'MGO', 66.75, 0, 5, 66.75, 0, 0, 0, 5, 0, 0, 0, 89.5558, 71.75, 76.8408, 13.5659, 90.4067, -76533700, 49554.1, '2024-09-26 21:23:55'),
(60, 1, '7', 155000, 'Genoa', 'La Spezia', 'EU/EU', '2024-09-07', '2024-09-08', 60, 0, 1, 11, 0.227273, 18, 5, 'HFO', 'MGO', 'MGO', 4.09091, 0, 5, 4.09091, 0, 0, 0, 5, 0, 0, 0, 11.5076, 9.09091, 76.5189, 14.0067, 90.5257, -10779000, 6970.02, '2024-09-26 21:23:55'),
(61, 1, '7', 155000, 'La Spezia', 'BARCELONA', 'EU/EU', '2024-09-08', '2024-09-10', 381, 0, 1, 11, 1.44318, 18, 5, 'HFO', 'MGO', 'MGO', 25.9773, 0, 5, 25.9773, 0, 0, 0, 5, 0, 0, 0, 38.7693, 30.9773, 76.778, 13.6518, 90.4299, -33761400, 21854.2, '2024-09-26 21:23:55'),
(62, 1, '7', 155000, 'BARCELONA', 'Valencia', 'EU/EU', '2024-09-10', '2024-09-11', 164, 0, 1, 11, 0.621212, 18, 5, 'HFO', 'MGO', 'MGO', 11.1818, 0, 5, 11.1818, 0, 0, 0, 5, 0, 0, 0, 20.3401, 16.1818, 76.6784, 13.7884, 90.4667, -18232600, 11797.4, '2024-09-26 21:23:55'),
(63, 1, '7', 155000, 'Valencia', 'Algeciras', 'EU/EU', '2024-09-11', '2024-09-13', 397, 0, 1, 11, 1.50379, 18, 5, 'HFO', 'MGO', 'MGO', 27.0682, 0, 5, 27.0682, 0, 0, 0, 5, 0, 0, 0, 40.1281, 32.0682, 76.7818, 13.6467, 90.4285, -34906000, 22595.5, '2024-09-26 21:23:55'),
(64, 1, '7', 155000, 'Algeciras', 'Salerno', 'EU/EU', '2024-09-13', '2024-09-17', 995, 0, 1, 11, 3.76894, 18, 5, 'HFO', 'MGO', 'MGO', 67.8409, 0, 5, 67.8409, 0, 0, 0, 5, 0, 0, 0, 90.9146, 72.8409, 76.8415, 13.5649, 90.4064, -77678100, 50295.2, '2024-09-26 21:23:55'),
(65, 1, 'bio', 1500, 'Aliağa', 'Tanger MED', 'NON-EU/NON-EU', '2024-09-13', '2024-09-19', 1500, 0, 1, 12, 5.20833, 18, 5, 'Arkas Bunker B24', 'Arkas Bunker B24', 'MGO', 93.75, 0, 5, 0, 0, 0, 0, 0, 0, 93.75, 0, 0, 93.75, 0, 0, 0, 0, 0, '2024-09-26 21:25:56'),
(66, 1, 'bio', 1500, 'Tanger MED', 'BARCELONA', 'NON-EU/EU', '2024-09-19', '2024-09-25', 1500, 0, 1, 12, 5.20833, 18, 5, 'Arkas Bunker B24', 'HFO', 'Arkas Bunker B24', 93.75, 0, 5, 0, 46.875, 0, 0, 5, 0, 0, 0, 49.1152, 51.875, 56.6946, 14.646, 71.3406, 933718000, 0, '2024-09-26 21:25:56'),
(67, 1, 'bio', 1500, 'BARCELONA', 'Savannah', 'EU/NON-EU', '2024-09-25', '2024-09-27', 555, 5, 1, 12, 1.94444, 18, 5, 'HFO', 'Arkas Bunker B24', 'Arkas Bunker B24', 35, 0.3125, 5, 0, 17.5, 0, 0.15625, 0, 0, 0, 0, 21.9459, 17.6562, 76.7047, 13.5105, 90.2152, -15452100, 10026.2, '2024-09-26 21:25:56');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `ships_data`
--

DROP TABLE IF EXISTS `ships_data`;
CREATE TABLE IF NOT EXISTS `ships_data` (
  `ID` int NOT NULL,
  `VESSEL_NAME` varchar(13) CHARACTER SET utf8mb3 COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `DWT` float DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_turkish_ci;

--
-- Tablo döküm verisi `ships_data`
--

INSERT INTO `ships_data` (`ID`, `VESSEL_NAME`, `DWT`, `company_id`) VALUES
(1, 'ship_1', 11978, 1),
(2, 'ship_2', 44574, 1),
(3, 'ship_3', 114637, 1),
(4, 'ship_4', 9865, 1),
(5, 'ship_5', 11164, 1);

--
-- Dökümü yapılmış tablolar için kısıtlamalar
--

--
-- Tablo kısıtlamaları `cii`
--
ALTER TABLE `cii`
  ADD CONSTRAINT `cii_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `arkas_ships` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Tablo kısıtlamaları `fuel_data`
--
ALTER TABLE `fuel_data`
  ADD CONSTRAINT `fuel_data_ibfk_1` FOREIGN KEY (`Company_id`) REFERENCES `arkas_ships` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Tablo kısıtlamaları `rota_data`
--
ALTER TABLE `rota_data`
  ADD CONSTRAINT `rota_data_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `arkas_ships` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Tablo kısıtlamaları `ships_data`
--
ALTER TABLE `ships_data`
  ADD CONSTRAINT `ships_data_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `arkas_ships` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
