-- ─── CONTACTS SEED ───────────────────────────────────────────
INSERT INTO contacts (name, company, title, contact_type, phone, email, notes)
VALUES
  ('Jerry Kohl', 'Leegin Creative Leather Products Inc', 'Founder / President', 'Owner', '(626) 961-9381', '', 'Brighton Collectibles. Founded 1972. Late career owner. 14022 Nelson Ave E.'),
  ('Michael Axelrod', 'Snak King Corp', 'CEO', 'Owner', '(626) 336-7711', '', 'New CEO Oct 2025. PE-backed by Falfurrias Capital. 16150 Stephens St.'),
  ('Barry Levin', 'Snak King Corp', 'Founder / Board', 'Owner', '(626) 336-7711', 'blevin@snakking.com', 'Snak King founder. Strong SLB signal with new PE ownership.'),
  ('Gerald Niznick', 'Acromil LLC', 'Founder / Chairman', 'Owner', '(626) 964-2522', '', 'Lives in Las Vegas. Owns RE personally. Estate/succession play. 18421 Railroad St.'),
  ('Jon Konheim', 'Acromil LLC', 'CFO', 'Owner', '(626) 964-2522', 'jkonheim@acromil.com', 'Day-to-day contact at Acromil. Niznick is title holder.'),
  ('Young Kim', 'Hitex Dyeing and Finishing Inc.', 'President', 'Owner', '626-363-0160', 'chadykim@hotmail.com', 'Owner-user. 355 Vineland Ave. 5 acres. Good SLB candidate.'),
  ('Dipak Patel', 'Ultimate Paperbox Co', 'Owner', 'Owner', '(626) 820-5410', 'dipak@upbx.net', '15051 Don Julian Rd. Ultimate Investors LLC entity. 10yr hold. SLB candidate.'),
  ('David Landeros', 'Don Julian Investors LLC', 'Owner', 'Owner', '', 'david@prlaluminum.com', 'PRL Aluminum. 14760 Don Julian Rd. 21yr hold. Owner-user.'),
  ('James Park', 'Bridge Industrial', 'VP Acquisitions', 'Buyer', '(312) 555-0303', 'jpark@bridgeindustrial.com', 'Active SGV/IE buyer. Focus Class A 100K-500K SF.'),
  ('Maria Rodriguez', 'Rodriguez Produce LLC', 'President', 'Owner', '(323) 555-0202', 'mrodriguez@example.com', 'Owner-user 30+ years. 2850 Fruitland Ave, Vernon. SLB conversation started.');

-- Link contacts to properties
UPDATE contacts SET property_id = (
  SELECT id FROM properties WHERE owner ILIKE '%' || contacts.company || '%' OR tenant ILIKE '%' || contacts.company || '%' LIMIT 1
) WHERE property_id IS NULL;

SELECT count(*) || ' contacts inserted' as result FROM contacts;
