-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Anamakine: 127.0.0.1:3306
-- Üretim Zamanı: 05 Eyl 2024, 18:18:06
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
DROP PROCEDURE IF EXISTS `class`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `class` (IN `class` VARCHAR(50))   SELECT fuel_data.Pathway_Name,fuel_data.Fuel_Class
FROM fuel_data
WHERE fuel_data.Fuel_Class=class$$

DROP PROCEDURE IF EXISTS `energy_used_and_board`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `energy_used_and_board` ()   SELECT sum(fuel_eu.energy_consumption) as Intra_EU_energy_used

FROM fuel_eu$$

DROP PROCEDURE IF EXISTS `ets`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ets` (IN `fuel_1_sea` VARCHAR(50), IN `fuel_2_port` VARCHAR(50), IN `from_` VARCHAR(50), IN `to_` VARCHAR(50), IN `gemi` VARCHAR(50), IN `EUA_PRICE` FLOAT, IN `hiz` FLOAT, IN `max_tuketim` FLOAT, IN `port_kalan_sure` FLOAT, IN `distance` FLOAT)   SELECT 
    ships_data.VESSEL_NAME,
    rota_data.from,
    rota_data.to,
    rota_data.status,
    
    
    SUM(
        CASE
            WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
            WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel * port_kalan_sure*5
            ELSE 0
        END
    ) AS emission,
    
    CASE 
        WHEN rota_data.status = 'NON-EU/EU' THEN (0.4 * SUM(
            CASE
                WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
                WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel * port_kalan_sure*5
                ELSE 0
            END
        )) * 0.5 * EUA_PRICE
        WHEN rota_data.status = 'EU/NON-EU' THEN (0.4 * SUM(
            CASE
                WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
                WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel *  port_kalan_sure*5
                ELSE 0
            END
        )) * 0.5 * EUA_PRICE
        WHEN rota_data.status = 'NON-EU/NON-EU' THEN 0
        WHEN rota_data.status = 'EU/EU' THEN (0.4 * SUM(
            CASE
                WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
                WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel *  port_kalan_sure*5
                ELSE 0
            END
        )) * 1 * EUA_PRICE
    END AS ets,

    
    (SUM(
        CASE
            WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
            WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel * port_kalan_sure*5
            ELSE 0
        END
    ) * 1000) / (ships_data.DWT * distance) AS score,

    
    CASE 
        WHEN (SUM(
            CASE
                WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
                WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel * port_kalan_sure*5
                ELSE 0
            END
        ) * 1000) / (ships_data.DWT * distance) <= 9.875759075 THEN 'A'
        
        WHEN (SUM(
            CASE
                WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
                WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel * port_kalan_sure*5
                ELSE 0
            END
        ) * 1000) / (ships_data.DWT * distance) <= 11.18459461 THEN 'B'
        
        WHEN (SUM(
            CASE
                WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
                WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel * port_kalan_sure*5
                ELSE 0
            END
        ) * 1000) / (ships_data.DWT * distance) <= 11.89850491 THEN 'C'
        
        WHEN (SUM(
            CASE
                WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel * ((distance/hız)/24)*max_tuketim
                WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel *port_kalan_sure*5
                ELSE 0
            END
        ) * 1000) / (ships_data.DWT * distance) <= 12.73140025 THEN 'D'
        
        WHEN (SUM(
            CASE
                WHEN fuel_data.Pathway_Name = fuel_1_sea THEN fuel_data.Cf_CO2_ggFuel *  ((distance/hız)/24)*max_tuketim
                WHEN fuel_data.Pathway_Name = fuel_2_port THEN fuel_data.Cf_CO2_ggFuel * port_kalan_sure*5
                ELSE 0
            END
        ) * 1000) / (ships_data.DWT * distance) > 14.15922084 THEN 'E'
    END AS kategori

FROM 
    ships_data
JOIN 
    arkas_ships ON arkas_ships.company_id = ships_data.company_id
JOIN 
    rota_data ON rota_data.company_id = ships_data.company_id
JOIN 
    fuel_data ON rota_data.company_id = fuel_data.Company_id
WHERE 
    ships_data.VESSEL_NAME = gemi 
    AND fuel_data.Pathway_Name IN (fuel_1_sea, fuel_2_port)
    AND rota_data.from = from_ 
    AND rota_data.to = to_
GROUP BY 
    ships_data.VESSEL_NAME,
    rota_data.from,
    rota_data.to,
    rota_data.status
ORDER BY 
    score DESC$$

DROP PROCEDURE IF EXISTS `fuel_eu`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `fuel_eu` (IN `VESSEL` VARCHAR(50), IN `BUNKER_TYPE_1` VARCHAR(50), IN `mt_1` FLOAT, IN `BUNKER_TYPE_2` VARCHAR(50), IN `mt_2` FLOAT, IN `BUNKER_TYPE_3` VARCHAR(50), IN `mt_3` FLOAT)   INSERT INTO fuel_eu (VESSEL_NAME, Pathway_Name, energy_consumption,LCV, CO2eqWtT, CO2eqTTW, Cf_CO2eq_TtW, complain_balance, fuel_eu,yakıt_miktar)
SELECT 
    ships_data.VESSEL_NAME,
    fuel_data.Pathway_Name,
    fuel_data.LCV * mt_1 * 10000000 AS energy_consumption,
    fuel_data.LCV,
    fuel_data.CO2eqWtT,
    fuel_data.CO2eqTTW,
    fuel_data.Cf_CO2eq_TtW,
    (arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * mt_1 * 10000000 AS complain_balance,
    ((arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * mt_1 * 10000000) * 2400 / ((fuel_data.CO2eqWtT + fuel_data.CO2eqTTW) * 4100) AS fuel_eu,
    mt_1 as yakıt_miktar
FROM 
    ships_data
    JOIN fuel_data ON ships_data.company_id = fuel_data.Company_id
    JOIN arkas_ships ON ships_data.company_id = arkas_ships.company_id
WHERE 
    ships_data.VESSEL_NAME = VESSEL 
    AND fuel_data.Pathway_Name = BUNKER_TYPE_1

UNION ALL

SELECT 
    ships_data.VESSEL_NAME,
    fuel_data.Pathway_Name,
    fuel_data.LCV * mt_2 * 10000000 AS energy_consumption,
    fuel_data.LCV,
    fuel_data.CO2eqWtT,
    fuel_data.CO2eqTTW,
    fuel_data.Cf_CO2eq_TtW,
    (arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * mt_2 * 10000000 AS complain_balance,
    ((arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * mt_2 * 10000000) * 2400 / ((fuel_data.CO2eqWtT + fuel_data.CO2eqTTW) * 4100) AS fuel_eu,
     mt_2 as yakıt_miktar
FROM 
    ships_data
    JOIN fuel_data ON ships_data.company_id = fuel_data.Company_id
    JOIN arkas_ships ON ships_data.company_id = arkas_ships.company_id
WHERE 
    ships_data.VESSEL_NAME = VESSEL 
    AND fuel_data.Pathway_Name = BUNKER_TYPE_2

UNION ALL

SELECT 
    ships_data.VESSEL_NAME,
    fuel_data.Pathway_Name,
    fuel_data.LCV * mt_3 * 10000000 AS energy_consumption,
    fuel_data.LCV,
    fuel_data.CO2eqWtT,
    fuel_data.CO2eqTTW,
    fuel_data.Cf_CO2eq_TtW,
    (arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * mt_3 * 10000000 AS complain_balance,
    ((arkas_ships.GHG_Target - (fuel_data.CO2eqWtT + fuel_data.CO2eqTTW)) * fuel_data.LCV * mt_3 * 10000000) * 2400 / ((fuel_data.CO2eqWtT + fuel_data.CO2eqTTW) * 4100) AS fuel_eu,
     mt_3 as yakıt_miktar
FROM 
    ships_data
    JOIN fuel_data ON ships_data.company_id = fuel_data.Company_id
    JOIN arkas_ships ON ships_data.company_id = arkas_ships.company_id
WHERE 
    ships_data.VESSEL_NAME = VESSEL 
    AND fuel_data.Pathway_Name = BUNKER_TYPE_3$$

DROP PROCEDURE IF EXISTS `GHG_intensity`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GHG_intensity` ()   SELECT 89.34 as target,
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

FROM fuel_eu$$

DROP PROCEDURE IF EXISTS `GHG_intensity_name_search`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GHG_intensity_name_search` (IN `VESSEL` VARCHAR(50))   SELECT fuel_eu.VESSEL_NAME,
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
    )) * SUM(fuel_eu.energy_consumption) as pool

FROM fuel_eu
WHERE fuel_eu.VESSEL_NAME=VESSEL$$

DROP PROCEDURE IF EXISTS `ManageShipVoyageTable`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `ManageShipVoyageTable` (IN `id` INT, IN `ship_name` VARCHAR(255), IN `from_` VARCHAR(255), IN `to_` VARCHAR(255), IN `fuel_1` VARCHAR(255), IN `fuel_2` VARCHAR(255), IN `tuketim_1` FLOAT, IN `tuketim_2` FLOAT, IN `Carbon_Price` FLOAT)   BEGIN
    DECLARE table_name VARCHAR(255);
    DECLARE table_exists INT;

    -- Tablo adını oluştur ve özel karakterleri korumak için köşeli tırnak içine al
    SET table_name = CONCAT('`', REPLACE(ship_name, ' ', '_'), '_voyage_table`');

    -- Mevcut tablo olup olmadığını kontrol et
    SELECT COUNT(*) INTO table_exists
    FROM information_schema.tables
    WHERE table_schema = DATABASE() 
    AND table_name = REPLACE(table_name, '`', '');

    -- Eğer tablo yoksa, yeni tablo oluştur
    IF table_exists = 0 THEN
        SET @query = CONCAT(
            'CREATE TABLE ', table_name, ' (',
            'id INT PRIMARY KEY, ',  
            'VESSEL_NAME VARCHAR(255), ',
            '`from` VARCHAR(255), ',
            '`to` VARCHAR(255), ',
            'status VARCHAR(255), ',
            'distance FLOAT, ',
            'emission FLOAT, ',
            'ets FLOAT, ',
            'score FLOAT, ',
            'kategori VARCHAR(1))');
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;

    -- Tabloya veri ekle
    SET @query = CONCAT(
        'INSERT INTO ', table_name, ' (id, VESSEL_NAME, `from`, `to`, status, distance, emission, ets, score, kategori) ',
        'SELECT ', 
        id, ', ',  -- Manuel olarak sağlanan ID
        '''', ship_name, '''', ', ',  
        'rota_data.`from`, ', 
        'rota_data.`to`, ', 
        'rota_data.status, ', 
        'rota_data.distance, ',
        'SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END) AS emission, ',
        'CASE ',
        'WHEN rota_data.status = ''NON-EU/EU'' THEN (0.4 * SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1,
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END)) * 0.5 * ', Carbon_Price, 
        'WHEN rota_data.status = ''EU/NON-EU'' THEN (0.4 * SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END)) * 0.5 * ', Carbon_Price, 
        'WHEN rota_data.status = ''NON-EU/NON-EU'' THEN 0 ',
        'WHEN rota_data.status = ''EU/EU'' THEN (0.4 * SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END)) * 1 * ', Carbon_Price, ' END AS ets, ',
        '(SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, 
        ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END) * 1000) / (ships_data.DWT * rota_data.distance) AS score, ',
        'CASE ',
        'WHEN (SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END) * 1000) / (ships_data.DWT * rota_data.distance) <= 9.875759075 THEN ''A'' ',
        'WHEN (SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END) * 1000) / (ships_data.DWT * rota_data.distance) <= 11.18459461 THEN ''B'' ',
        'WHEN (SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END) * 1000) / (ships_data.DWT * rota_data.distance) <= 11.89850491 THEN ''C'' ',
        'WHEN (SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END) * 1000) / (ships_data.DWT * rota_data.distance) <= 12.73140025 THEN ''D'' ',
        'WHEN (SUM(CASE WHEN fuel_data.Pathway_Name = ''', fuel_1, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_1, 
        ' WHEN fuel_data.Pathway_Name = ''', fuel_2, ''' THEN fuel_data.Cf_CO2_ggFuel * ', tuketim_2, 
        ' ELSE 0 END) * 1000) / (ships_data.DWT * rota_data.distance) > 14.15922084 THEN ''E'' END AS kategori ',
        'FROM ships_data ',
        'JOIN arkas_ships ON arkas_ships.company_id = ships_data.company_id ',
        'JOIN rota_data ON rota_data.company_id = ships_data.company_id ',
        'JOIN fuel_data ON rota_data.company_id = fuel_data.Company_id ',
        'WHERE ships_data.VESSEL_NAME = ''', ship_name, ''' ',
        'AND fuel_data.Pathway_Name IN (''', fuel_1, ''', ''', fuel_2, ''') ',
        'AND rota_data.`from` = ''', from_, ''' ',
        'AND rota_data.`to` = ''', to_, ''' ',
        'GROUP BY ships_data.VESSEL_NAME, rota_data.`from`, rota_data.`to`, rota_data.status');
        
    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

END$$

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

--
-- Tablo döküm verisi `fuel_eu`
--

INSERT INTO `fuel_eu` (`VESSEL_NAME`, `Pathway_Name`, `energy_consumption`, `LCV`, `CO2eqWtT`, `CO2eqTTW`, `Cf_CO2eq_TtW`, `complain_balance`, `fuel_eu`, `yakıt_miktar`) VALUES
('ship_1', 'HFO', 40500000, 0.0405, 13.5, 78.1, 3.1631, -91530100, -584919, 100),
('ship_1', 'LFO', 49200000, 0.041, 13.2, 78.05, 3.2001, -93972300, -602829, 120),
('ship_1', 'MDO', 76860000, 0.0427, 14.4, 76.23, 3.2551, -99149900, -640395, 180),
('ship_2', 'LFO', 61500000, 0.041, 13.2, 78.05, 3.2001, -117465000, -753537, 150),
('ship_2', 'HFO', 121500000, 0.0405, 13.5, 78.1, 3.1631, -274590000, -1754760, 300),
('ship_2', 'LFO', 61500000, 0.041, 13.2, 78.05, 3.2001, -117465000, -753537, 150),
('ship_2', 'HFO', 121500000, 0.0405, 13.5, 78.1, 3.1631, -274590000, -1754760, 300);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `rota_data`
--

DROP TABLE IF EXISTS `rota_data`;
CREATE TABLE IF NOT EXISTS `rota_data` (
  `rota_id` int NOT NULL,
  `from` varchar(14) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `to` varchar(14) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `status` varchar(13) COLLATE utf8mb3_turkish_ci DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  PRIMARY KEY (`rota_id`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_turkish_ci;

--
-- Tablo döküm verisi `rota_data`
--

INSERT INTO `rota_data` (`rota_id`, `from`, `to`, `status`, `company_id`) VALUES
(1, 'Aliğa', 'Valencia', 'NON-EU/EU', 1),
(2, 'Valencia', 'Savannah', 'EU/NON-EU', 1),
(3, 'Savannah', 'Tanger MED', 'NON-EU/NON-EU', 1),
(4, 'Tanger MED', 'ALEXANDRIA', 'NON-EU/NON-EU', 1),
(5, 'ALEXANDRIA', 'Aliğa', 'NON-EU/NON-EU', 1),
(6, 'Tanger MED', 'EAST PORT SAID', 'NON-EU/NON-EU', 1),
(7, 'EAST PORT SAID', 'ALEXANDRIA', 'NON-EU/NON-EU', 1),
(8, 'ALEXANDRIA', 'BARCELONA', 'NON-EU/EU', 1),
(9, 'BARCELONA', 'Savannah', 'NON-EU/EU', 1),
(10, 'Savannah', 'Aliğa', 'NON-EU/NON-EU', 1);

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
