-- ══════════════════════════════════════════════════════════════
-- CLERESTORY — 67 Buyer Accounts Seed Data
-- Run AFTER 01_accounts_upgrade.sql
-- ══════════════════════════════════════════════════════════════

-- Clear existing demo accounts first
DELETE FROM accounts WHERE source = 'Buyer Intelligence DB';

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Rexford Industrial Realty', 'Institutional Buyer', 'Public REIT', 'REIT',
  'Los Angeles', 'CA', '(213) 455-5220', 'rexford.com',
  ARRAY['IE','LA','OC','SGV'], ARRAY['Value-Add'], ARRAY['IOS (Outdoor Storage)','Manufacturing','Warehouse/Distribution'],
  50000, 500000, 7500000, 200000000, 150.0, 400.0,
  'Value-Add', 'Actively Buying Now',
  95, 95, 50,
  '$5B+ (2021-2024)', '50+/yr', 'NYSE: REXR. Co-CEOs Howard Schwimmer & Michael Frankel. #1 SoCal industrial buyer. 2% of entire SoCal market. Your Milliken relationship.', 'NYSE: REXR. Co-CEOs Howard Schwimmer & Michael Frankel. #1 SoCal industrial buyer. 2% of entire SoCal market. Your Milliken relationship.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Prologis', 'Institutional Buyer', 'Public REIT', 'REIT',
  'San Francisco', 'CA', '(415) 394-9000', 'prologis.com',
  ARRAY['IE','LA','OC','San Diego'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  200000, 1000000, 35000000, 300000000, 175.0, 300.0,
  'Value-Add', 'Actively Buying Now',
  95, 95, 20,
  '$3B+', '20+', 'NYSE: PLD. Largest industrial REIT globally. 1.2B SF portfolio. Big-box focus.', 'NYSE: PLD. Largest industrial REIT globally. 1.2B SF portfolio. Big-box focus.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Blackstone / BREIT / Link Logistics', 'Institutional Buyer', 'PE / REIT', 'REIT',
  'New York', 'NY', '(212) 583-5000', 'blackstone.com',
  ARRAY['IE','LA','OC','SGV','San Diego'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 1000000, 15000000, 350000000, 150.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  95, 95, 30,
  '$5B+', '30+', 'Link Logistics is operating platform. Both buyer AND seller. Portfolio rotation.', 'Link Logistics is operating platform. Both buyer AND seller. Portfolio rotation.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'TA Realty', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Boston', 'MA', NULL, 'tarealty.com',
  ARRAY['IE','LA','OC','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  75000, 300000, 18000000, 109500000, 240.0, 365.0,
  'Value-Add', 'Actively Buying Now',
  84, 80, 8,
  '$350M+ (SGV+IE)', '8+', 'Most active repeat buyer in SGV (5 deals, $219M). Also 3 IE-West deals.', 'Most active repeat buyer in SGV (5 deals, $219M). Also 3 IE-West deals.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Bridge Investment Group / Bridge Logistics', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Sandy', 'UT', '(801) 716-4500', 'bridgeig.com',
  ARRAY['IE','OC','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 500000, 20000000, 140000000, 200.0, 280.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$350M+', '5+', 'Logistics-focused. Bought Link portfolio in SGV. Active IE-West.', 'Logistics-focused. Bought Link portfolio in SGV. Active IE-West.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Ares Management / AIREIT', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Los Angeles', 'CA', '(310) 201-4100', 'aresmgmt.com',
  ARRAY['IE','LA','OC','SGV'], ARRAY['Core','Value-Add'], ARRAY['Manufacturing','Warehouse/Distribution'],
  75000, 300000, 18375000, 128100000, 245.0, 427.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$360M+', '5+', 'Paid highest $/SF in SGV ($427/SF). Also active via AIREIT.', 'Paid highest $/SF in SGV ($427/SF). Also active via AIREIT.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'BGO (BentallGreenOak)', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Toronto', 'Canada', NULL, 'bfrg.com',
  ARRAY['IE','OC'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 500000, 30000000, 200000000, 300.0, 400.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$640M+', '5+', 'Canadian institutional. Active buyer AND seller in IE-West.', 'Canadian institutional. Active buyer AND seller in IE-West.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Westcore', 'Institutional Buyer', 'Institutional', 'Institutional',
  'San Diego', 'CA', NULL, 'westcore.net',
  ARRAY['IE','San Diego'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 400000, 27500000, 150000000, 275.0, 375.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$380M+', '5+', 'SD-based. 5 IE-West deals. Active San Diego buyer.', 'SD-based. 5 IE-West deals. Active San Diego buyer.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Sagard Real Estate', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Toronto', 'Canada', NULL, 'sagard.com',
  ARRAY['IE','LA','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  80000, 250000, 20000000, 95000000, 250.0, 380.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$200M+', '5+', 'Canadian institutional. Active in SGV (2 deals) and IE-West (3).', 'Canadian institutional. Active in SGV (2 deals) and IE-West (3).',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Duke Realty / Prologis', 'Institutional Buyer', 'Public REIT', 'REIT',
  'Indianapolis', 'IN', '(317) 808-6000', 'dukerealty.com',
  ARRAY['IE','LA','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  150000, 500000, 30000000, 125000000, 200.0, 250.0,
  'Value-Add', 'Actively Buying Now',
  52, 40, 4,
  '$300M+', '4+', 'Acquired by Prologis. Large-box distribution focus.', 'Acquired by Prologis. Large-box distribution focus.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'EQT Real Estate / EQT Exeter', 'Institutional Buyer', 'PE', 'Institutional',
  'Stockholm', 'Sweden', NULL, 'eqtgroup.com',
  ARRAY['IE','OC','San Diego'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 500000, 17500000, 125000000, 175.0, 250.0,
  'Value-Add', 'Actively Buying Now',
  44, 30, 3,
  '$270M+', '3+', 'Swedish PE. New SoCal entrant. Active in IE-West and San Diego (Otay Mesa).', 'Swedish PE. New SoCal entrant. Active in IE-West and San Diego (Otay Mesa).',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Cabot Properties', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Boston', 'MA', NULL, 'cabotprop.com',
  ARRAY['IE'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  75000, 400000, 20625000, 140000000, 275.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  52, 40, 4,
  '$230M+', '4+', 'Logistics-focused institutional. Active IE buyer.', 'Logistics-focused institutional. Active IE buyer.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Stockbridge Capital Group', 'Institutional Buyer', 'Institutional', 'Institutional',
  'San Francisco', 'CA', NULL, 'stockbridge.com',
  ARRAY['IE','LA'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 300000, 24000000, 93000000, 240.0, 310.0,
  'Value-Add', 'Actively Buying Now',
  36, 20, 2,
  '$142M+', '2+', 'SF-based institutional.', 'SF-based institutional.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'J.P. Morgan Asset Management', 'Institutional Buyer', 'Institutional', 'Institutional',
  'New York', 'NY', NULL, 'jpmorgan.com',
  ARRAY['IE','LA','OC'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  200000, 800000, 56000000, 320000000, 280.0, 400.0,
  'Value-Add', 'Actively Buying Now',
  44, 30, 3,
  '$500M+', '3+', 'Massive capital pool. Class A institutional quality.', 'Massive capital pool. Class A institutional quality.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Morgan Stanley Real Estate', 'Institutional Buyer', 'Institutional', 'Institutional',
  'New York', 'NY', NULL, 'morganstanley.com',
  ARRAY['IE','OC'], ARRAY['Core','Value-Add'], ARRAY['Manufacturing','Warehouse/Distribution'],
  75000, 300000, 22500000, 300000000, 300.0, 1000.0,
  'Value-Add', 'Actively Buying Now',
  36, 20, 2,
  '$150M+', '2+', 'Active in special situations.', 'Active in special situations.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'CenterPoint Properties', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Oak Brook', 'IL', NULL, 'centerpoint.com',
  ARRAY['IE','LA'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 500000, 35000000, 237500000, 350.0, 475.0,
  'Value-Add', 'Actively Buying Now',
  44, 30, 3,
  '$200M+', '3+', 'Infill logistics specialist. Active buyer AND seller.', 'Infill logistics specialist. Active buyer AND seller.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Nuveen Real Estate', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Chicago', 'IL', NULL, 'nuveen.com',
  ARRAY['IE','OC','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 400000, 22500000, 112000000, 225.0, 280.0,
  'Value-Add', 'Buying Selectively',
  52, 40, 4,
  '$160M+', '4+', 'TIAA subsidiary. Both buyer and seller.', 'TIAA subsidiary. Both buyer and seller.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'LaSalle Investment Management', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Chicago', 'IL', NULL, 'lasalle.com',
  ARRAY['IE','LA','OC'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  150000, 500000, 37500000, 175000000, 250.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  36, 20, 2,
  '$200M+', '2+', 'JLL subsidiary. Active seller — portfolio rotation.', 'JLL subsidiary. Active seller — portfolio rotation.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'MetLife Investment Management', 'Institutional Buyer', 'Institutional', 'Institutional',
  'New York', 'NY', NULL, 'metlife.com',
  ARRAY['IE','OC','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  75000, 400000, 18600000, 120000000, 248.0, 300.0,
  'Value-Add', 'Actively Buying Now',
  52, 40, 4,
  '$225M+', '4+', 'Active seller in SGV (3 deals to TA Realty). Also buyer.', 'Active seller in SGV (3 deals to TA Realty). Also buyer.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'PGIM Real Estate', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Madison', 'NJ', NULL, 'pgim.com',
  ARRAY['IE','LA','OC','SGV'], ARRAY['Core','Value-Add'], ARRAY['Manufacturing','Warehouse/Distribution'],
  100000, 400000, 25000000, 140000000, 250.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  44, 30, 3,
  '$200M+', '3+', 'Prudential subsidiary. Active across SoCal.', 'Prudential subsidiary. Active across SoCal.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Principal Real Estate', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Des Moines', 'IA', NULL, 'principalglobal.com',
  ARRAY['IE'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 400000, 25000000, 128000000, 250.0, 320.0,
  'Value-Add', 'Actively Buying Now',
  36, 20, 2,
  '$150M+', '2+', 'Active IE seller — portfolio rotation.', 'Active IE seller — portfolio rotation.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Manulife Investment Mgmt', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Toronto', 'Canada', NULL, 'manulife.com',
  ARRAY['IE'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  200000, NULL, 56000000, NULL, 280.0, 350.0,
  'Value-Add', 'Buying Selectively',
  28, 10, 1,
  '$200M+', '1+', 'Canadian institutional. IE-West seller.', 'Canadian institutional. IE-West seller.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Stos Partners', 'Private Buyer', 'Private Equity', 'Private',
  'San Diego', 'CA', NULL, 'stospartners.com',
  ARRAY['IE','OC','SGV','San Diego'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 250000, 6000000, 75000000, 120.0, 300.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$150M+', '5+', 'SD-based value-add specialist. Both buyer and seller. SGV + San Diego active.', 'SD-based value-add specialist. Both buyer and seller. SGV + San Diego active.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Staley Point Capital / Bain Capital RE', 'Institutional Buyer', 'PE JV', 'Institutional',
  'Los Angeles', 'CA', NULL, 'staleypoint.com',
  ARRAY['IE','OC','SGV','San Diego'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 200000, 10000000, 84000000, 200.0, 420.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$100M+', '5+', 'LA-based value-add. JV with Bain Capital. Active flipper — SGV (bought $241, sold $421/SF). Expanding to San Diego.', 'LA-based value-add. JV with Bain Capital. Active flipper — SGV (bought $241, sold $421/SF). Expanding to San Diego.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'CapRock Partners', 'Institutional Buyer', 'Developer/Investor', 'Institutional',
  'Newport Beach', 'CA', NULL, 'caprockpartners.com',
  ARRAY['IE','SGV'], ARRAY['Value-Add','Development'], ARRAY['Warehouse/Distribution'],
  100000, 500000, 17500000, 137500000, 175.0, 275.0,
  'Value-Add', 'Buying Selectively',
  44, 30, 3,
  '$200M+', '3+', 'OC-based developer. Both buyer and seller in SGV.', 'OC-based developer. Both buyer and seller in SGV.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Elion Partners', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Miami', 'FL', NULL, 'elionpartners.com',
  ARRAY['LA','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  75000, 150000, 20625000, 52500000, 275.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  36, 20, 2,
  '$100M+', '2+', 'Last-mile logistics specialist.', 'Last-mile logistics specialist.',
  'Buyer Intelligence DB', 'LA'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'High Street Logistics Properties', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Irvine', 'CA', NULL, NULL,
  ARRAY['OC','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  75000, 200000, 20625000, 70000000, 275.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  36, 20, 2,
  '$75M+', '2+', 'OC-based logistics investor.', 'OC-based logistics investor.',
  'Buyer Intelligence DB', 'OC'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Pacific Industrial / Rockpoint', 'Institutional Buyer', 'PE JV', 'Institutional',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 200000, 25000000, 60000000, 250.0, 300.0,
  'Value-Add', 'Actively Buying Now',
  28, 10, 1,
  '$50M+', '1+', 'Bought Reuland at $269/SF in SGV.', 'Bought Reuland at $269/SF in SGV.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Excelsior Partners', 'Private Buyer', 'Private', 'Private',
  'Los Angeles', 'CA', NULL, NULL,
  ARRAY['IE','SGV'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  75000, 200000, 15000000, 56000000, 200.0, 280.0,
  'Value-Add', 'Actively Buying Now',
  44, 30, 3,
  '$90M+', '3+', 'LA-based. Active in both SGV and IE-West.', 'LA-based. Active in both SGV and IE-West.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Safco Capital Corporation', 'Private Buyer', 'Private', 'Private',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 200000, 20000000, 50000000, 200.0, 250.0,
  'Value-Add', 'Actively Buying Now',
  28, 10, 1,
  '$40M+', '1+', 'Bought 705 Baldwin Park @ $222/SF.', 'Bought 705 Baldwin Park @ $222/SF.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'West Harbor Capital', 'Private Buyer', 'Private', 'Private',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  100000, 200000, 20000000, 50000000, 200.0, 250.0,
  'Value-Add', 'Buying Selectively',
  28, 10, 1,
  '$40M+', '1+', 'Sold 705 Baldwin Park to Safco.', 'Sold 705 Baldwin Park to Safco.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Avant Real Estate', 'Private Buyer', 'Private', 'Private',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  200000, 400000, 40000000, 100000000, 200.0, 250.0,
  'Value-Add', 'Actively Buying Now',
  28, 10, 1,
  '$65M+', '1+', 'Bought 2875 Pomona Blvd @ $227/SF.', 'Bought 2875 Pomona Blvd @ $227/SF.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Scout Cold Logistics / AEW', 'Institutional Buyer', 'Institutional JV', 'Institutional',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Core','Value-Add'], ARRAY['Cold Storage'],
  200000, 400000, 60000000, 140000000, 300.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  28, 10, 1,
  '$120M+', '1+', 'Cold storage specialist. Bought $334/SF in SGV.', 'Cold storage specialist. Bought $334/SF in SGV.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'MDH Partners', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Atlanta', 'GA', NULL, NULL,
  ARRAY['IE'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  200000, 600000, 45000000, 165000000, 225.0, 275.0,
  'Value-Add', 'Actively Buying Now',
  28, 10, 1,
  '$105M+', '1+', 'Atlanta-based. Active IE buyer.', 'Atlanta-based. Active IE buyer.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Dermody Properties', 'Institutional Buyer', 'Developer/Investor', 'Institutional',
  'Reno', 'NV', NULL, 'dermody.com',
  ARRAY['IE'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  100000, 500000, 14000000, 100000000, 140.0, 200.0,
  'Opportunistic', 'Actively Buying Now',
  44, 30, 3,
  '$75M+', '3+', 'JV with AXA. Developer and investor.', 'JV with AXA. Developer and investor.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Panattoni', 'Institutional Buyer', 'Developer', 'Institutional',
  'Irvine', 'CA', NULL, 'panattoni.com',
  ARRAY['IE'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  200000, 1000000, NULL, NULL, NULL, NULL,
  'Opportunistic', 'Buying Selectively',
  44, 30, 3,
  '$300M+', '3+', 'Top industrial developer. Seller of completed product.', 'Top industrial developer. Seller of completed product.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Transwestern Development', 'Institutional Buyer', 'Developer', 'Institutional',
  'Houston', 'TX', NULL, 'transwestern.com',
  ARRAY['IE'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  100000, 500000, NULL, NULL, NULL, NULL,
  'Opportunistic', 'Buying Selectively',
  44, 30, 3,
  '$160M+', '3+', 'Developer — seller of completed product.', 'Developer — seller of completed product.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Molto Properties', 'Institutional Buyer', 'Developer', 'Institutional',
  NULL, NULL, NULL, NULL,
  ARRAY['IE'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  100000, 300000, NULL, NULL, NULL, NULL,
  'Opportunistic', 'Actively Buying Now',
  36, 20, 2,
  '$113M+', '2+', 'Developer. IE-West focused.', 'Developer. IE-West focused.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Oakmont Industrial Group', 'Institutional Buyer', 'Developer', 'Institutional',
  NULL, NULL, NULL, NULL,
  ARRAY['IE'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  100000, 300000, NULL, NULL, NULL, NULL,
  'Opportunistic', 'Actively Buying Now',
  36, 20, 2,
  '$97M+', '2+', 'Developer.', 'Developer.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Hillwood Development', 'Institutional Buyer', 'Developer', 'Institutional',
  'Dallas', 'TX', NULL, 'hillwood.com',
  ARRAY['IE'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  200000, 800000, NULL, NULL, NULL, NULL,
  'Opportunistic', 'Actively Buying Now',
  28, 10, 1,
  '$75M+', '1+', 'Ross Perot Jr. Family. Large-format developer.', 'Ross Perot Jr. Family. Large-format developer.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Greenlaw Partners', 'Private Buyer', 'Private', 'Private',
  'Newport Beach', 'CA', NULL, NULL,
  ARRAY['LA','OC'], ARRAY['Core','Value-Add'], ARRAY['Flex/R&D','Warehouse/Distribution'],
  50000, 200000, 12500000, 80000000, 250.0, 400.0,
  'Value-Add', 'Actively Buying Now',
  44, 30, 3,
  '$100M+', '3+', 'Acquired 171K SF Cerritos business park for $50M.', 'Acquired 171K SF Cerritos business park for $50M.',
  'Buyer Intelligence DB', 'LA'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Scuderia Development', 'Institutional Buyer', 'Developer', 'Institutional',
  NULL, NULL, NULL, NULL,
  ARRAY['IE'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  100000, 400000, 20000000, 110000000, 200.0, 275.0,
  'Opportunistic', 'Buying Selectively',
  36, 20, 2,
  '$215M+', '2+', 'IE-West developer. Seller.', 'IE-West developer. Seller.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Stream Realty Partners', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Dallas', 'TX', NULL, 'streamrealty.com',
  ARRAY['IE','LA'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  75000, 300000, 15000000, 90000000, 200.0, 300.0,
  'Value-Add', 'Buying Selectively',
  36, 20, 2,
  '$100M+', '2+', 'Acquired 12930 Bradley Ave, Sylmar (SFV). Also IE seller.', 'Acquired 12930 Bradley Ave, Sylmar (SFV). Also IE seller.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Investcorp', 'Institutional Buyer', 'Institutional', 'Institutional',
  'New York', 'NY', NULL, 'investcorp.com',
  ARRAY['IE','LA','San Diego'], ARRAY['Core','Value-Add'], ARRAY['Multi-Tenant','Warehouse/Distribution'],
  50000, 200000, 10000000, 60000000, 200.0, 300.0,
  'Value-Add', 'Actively Buying Now',
  95, 95, 17,
  '$400M+ (US-wide)', '17+', 'Top-5 cross-border US RE buyer. Infill industrial focus. Active in SD, Denver, Bay Area.', 'Top-5 cross-border US RE buyer. Infill industrial focus. Active in SD, Denver, Bay Area.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Steel Peak', 'Private Buyer', 'Private', 'Private',
  'San Diego', 'CA', NULL, NULL,
  ARRAY['San Diego'], ARRAY['Value-Add'], ARRAY['IOS (Outdoor Storage)'],
  50000, 150000, 7500000, 45000000, 150.0, 300.0,
  'Value-Add', 'Actively Buying Now',
  95, 95, 11,
  '$150M target', '11+', 'IOS specialist. JV with Tarsadia. Targeting $150M in yard buys 2026.', 'IOS specialist. JV with Tarsadia. Targeting $150M in yard buys 2026.',
  'Buyer Intelligence DB', 'San Diego'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'IDS Real Estate Group', 'Private Buyer', 'Private', 'Private',
  NULL, NULL, NULL, NULL,
  ARRAY['San Diego'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 200000, 7500000, 55000000, 150.0, 275.0,
  'Value-Add', 'Actively Buying Now',
  36, 20, 2,
  '$25M+', '2+', 'Active Otay Mesa buyer.', 'Active Otay Mesa buyer.',
  'Buyer Intelligence DB', 'San Diego'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Washington Capital Management', 'Institutional Buyer', 'Institutional', 'Institutional',
  'Seattle', 'WA', NULL, NULL,
  ARRAY['San Diego'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  75000, 300000, 15000000, 90000000, 200.0, 300.0,
  'Value-Add', 'Buying Selectively',
  36, 20, 2,
  '$50M+', '2+', 'Seller in San Diego (Otay Mesa to EQT Exeter).', 'Seller in San Diego (Otay Mesa to EQT Exeter).',
  'Buyer Intelligence DB', 'San Diego'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Bain Capital Real Estate', 'Institutional Buyer', 'PE', 'Institutional',
  'Boston', 'MA', NULL, 'baincapitalrealestate.com',
  ARRAY['IE','OC','SGV','San Diego'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 200000, 10000000, 85000000, 200.0, 425.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$150M+', '5+', 'JV with Staley Point. Active across SoCal + expanding to SD.', 'JV with Staley Point. Active across SoCal + expanding to SD.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Pan Am Equities', 'Private Buyer', 'Private', 'Private',
  NULL, NULL, NULL, NULL,
  ARRAY['LA'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 200000, 10000000, 80000000, 200.0, 400.0,
  'Value-Add', 'Buying Selectively',
  36, 20, 2,
  '$50M+', '2+', 'Sold 2800 Casitas Ave, Burbank to Rexford for $43M.', 'Sold 2800 Casitas Ave, Burbank to Rexford for $43M.',
  'Buyer Intelligence DB', 'LA'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Majestic Realty', 'Private Buyer', 'Private', 'Private',
  'Ontario', 'CA', '(909) 945-2730', 'majesticrealty.com',
  ARRAY['IE','LA','SGV'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  100000, 1000000, 17500000, 300000000, 175.0, 300.0,
  'Opportunistic', 'Actively Buying Now',
  95, 95, 10,
  '$1B+', '10+', 'Ed Roski family. Largest private industrial owner in US. Both owner and developer.', 'Ed Roski family. Largest private industrial owner in US. Both owner and developer.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Watson Land Company', 'Private Buyer', 'Private', 'Private',
  'Carson', 'CA', '(310) 952-6400', 'watsonlandcompany.com',
  ARRAY['LA'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 500000, 10000000, 175000000, 200.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$500M+', '5+', 'Legacy South Bay/Carson landowner. Ground lessor + developer.', 'Legacy South Bay/Carson landowner. Ground lessor + developer.',
  'Buyer Intelligence DB', 'LA'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Dedeaux Properties', 'Private Buyer', 'Private', 'Private',
  'Los Angeles', 'CA', NULL, NULL,
  ARRAY['LA','SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 200000, 10000000, 70000000, 200.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$200M+', '5+', 'LA-based private industrial investor.', 'LA-based private industrial investor.',
  'Buyer Intelligence DB', 'LA'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Oltmans Construction', 'Institutional Buyer', 'Developer', 'Institutional',
  'Whittier', 'CA', NULL, 'oltmans.com',
  ARRAY['LA','SGV'], ARRAY['Development'], ARRAY['Warehouse/Distribution'],
  50000, 300000, NULL, NULL, NULL, NULL,
  'Opportunistic', 'Actively Buying Now',
  44, 30, 3,
  '$150M+', '3+', 'Whittier-based developer. Active in SGV.', 'Whittier-based developer. Active in SGV.',
  'Buyer Intelligence DB', 'LA'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Hager Pacific Properties', 'Private Buyer', 'Private', 'Private',
  'Los Angeles', 'CA', NULL, 'hagerpacific.com',
  ARRAY['LA','OC','SGV'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 300000, 10000000, 105000000, 200.0, 350.0,
  'Value-Add', 'Actively Buying Now',
  60, 50, 5,
  '$200M+', '5+', 'LA-based value-add investor. Active across SoCal.', 'LA-based value-add investor. Active across SoCal.',
  'Buyer Intelligence DB', 'LA'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'McMaster-Carr Supply', 'Owner-User', 'User', 'Owner-User',
  'Elmhurst', 'IL', NULL, 'mcmaster.com',
  ARRAY['LA'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  200000, 500000, 40000000, 150000000, 200.0, 300.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$75M+', '1+', 'Bought 4-bldg complex in Santa Fe Springs from Brookfield for $75M.', 'Bought 4-bldg complex in Santa Fe Springs from Brookfield for $75M.',
  'Buyer Intelligence DB', 'LA'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Kay Management', 'Private Buyer', 'Private', 'Private',
  'Brooklyn', 'NY', NULL, NULL,
  ARRAY['SGV'], ARRAY['Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 100000, 10000000, 25000000, 200.0, 250.0,
  'Value-Add', 'Actively Buying Now',
  28, 10, 1,
  '$20M+', '1+', 'NY-based private. Bought ITT property in SGV.', 'NY-based private. Bought ITT property in SGV.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Caravan Group', 'Private Buyer', 'Private', 'Private',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Core','Value-Add'], ARRAY['Warehouse/Distribution'],
  50000, 100000, 11250000, 27500000, 225.0, 275.0,
  'Value-Add', 'Actively Buying Now',
  28, 10, 1,
  '$20M+', '1+', 'SGV buyer.', 'SGV buyer.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Costco Wholesale', 'Owner-User', 'User', 'Owner-User',
  'Issaquah', 'WA', '(425) 313-8100', 'costco.com',
  ARRAY['IE'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  500000, 1600000, 87500000, 360000000, 175.0, 225.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$345M+', '1+', 'NASDAQ: COST. Bought $345M IE-West distribution.', 'NASDAQ: COST. Bought $345M IE-West distribution.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Pleaser USA', 'Owner-User', 'User', 'Owner-User',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  200000, 300000, 70000000, 120000000, 350.0, 400.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$100M', '1+', 'Footwear co. Paid $370/SF in Walnut.', 'Footwear co. Paid $370/SF in Walnut.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'MSI Computer Corp', 'Owner-User', 'User', 'Owner-User',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  70000, 200000, 21000000, 70000000, 300.0, 350.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$65M', '1+', 'Taiwan PC manufacturer. Paid $326/SF.', 'Taiwan PC manufacturer. Paid $326/SF.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Gigabyte Technology', 'Owner-User', 'User', 'Owner-User',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  75000, 125000, 28125000, 53125000, 375.0, 425.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$38M', '1+', 'Taiwan PC manufacturer. Paid $421/SF.', 'Taiwan PC manufacturer. Paid $421/SF.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'G.A. Gertmenian & Sons', 'Owner-User', 'User', 'Owner-User',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  100000, 200000, 35000000, 80000000, 350.0, 400.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$57M', '1+', 'Rug manufacturer. Paid $384/SF.', 'Rug manufacturer. Paid $384/SF.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Ardmore Home Designs', 'Owner-User', 'User', 'Owner-User',
  NULL, NULL, NULL, NULL,
  ARRAY['IE','SGV'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  200000, 300000, 35000000, 67500000, 175.0, 225.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$60M', '1+', 'Home furnishings. Paid $212/SF in IE-West.', 'Home furnishings. Paid $212/SF in IE-West.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Future Foam', 'Owner-User', 'User', 'Owner-User',
  NULL, NULL, NULL, NULL,
  ARRAY['SGV'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  150000, 200000, 37500000, 60000000, 250.0, 300.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$53M', '1+', 'Foam manufacturer. Paid $276/SF.', 'Foam manufacturer. Paid $276/SF.',
  'Buyer Intelligence DB', 'SGV'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Union Pacific Corp', 'Owner-User', 'User', 'Owner-User',
  'Omaha', 'NE', NULL, 'up.com',
  ARRAY['IE','SGV'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  300000, 600000, 15000000, 378000000, 50.0, 630.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$75M+', '1+', 'Railroad. Bought 593K SF in Baldwin Park + $75M IE property.', 'Railroad. Bought 593K SF in Baldwin Park + $75M IE property.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Tireco Inc', 'Owner-User', 'User', 'Owner-User',
  NULL, NULL, NULL, NULL,
  ARRAY['IE'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  500000, NULL, 137500000, NULL, 275.0, 350.0,
  'Core', 'Buying Selectively',
  28, 10, 1,
  '$365M', '1+', 'Tire distributor. SOLD for $365M — user-occupant exit.', 'Tire distributor. SOLD for $365M — user-occupant exit.',
  'Buyer Intelligence DB', 'IE'
);

INSERT INTO accounts (name, account_type, entity_type, buyer_type, city, hq_state, phone, website, preferred_markets, deal_type_preference, product_preference, min_sf, max_sf, min_price, max_price, min_price_psf, max_price_psf, risk_profile, acquisition_timing, buyer_activity_score, buyer_velocity_score, total_deals_closed, est_capital_deployed, deal_count, known_acquisitions, notes, source, market) VALUES (
  'Walt Disney Company', 'Owner-User', 'User', 'Owner-User',
  'Burbank', 'CA', NULL, 'disney.com',
  ARRAY['OC'], ARRAY['Owner-User'], ARRAY['Warehouse/Distribution'],
  100000, 250000, 15000000, 50000000, 150.0, 200.0,
  'Core', 'Actively Buying Now',
  28, 10, 1,
  '$50M+', '1+', 'Bought 1501-1601 E St, Irvine. OC owner-user.', 'Bought 1501-1601 E St, Irvine. OC owner-user.',
  'Buyer Intelligence DB', 'OC'
);

SELECT count(*) || ' buyer accounts inserted' as result FROM accounts WHERE source = 'Buyer Intelligence DB';