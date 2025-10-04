-- seed-fun-facts.sql
-- Run this SQL in Supabase SQL Editor

-- First, delete existing fun facts
DELETE FROM fun_facts;

-- Insert new fun facts (3 facts per town with fact_order)
INSERT INTO fun_facts (town_slug, fact, fact_order) VALUES
  ('chicago', 'The Chicago River flows backwards! Engineers reversed it in 1900 to improve sanitation.'),
  ('evanston', 'Home to Northwestern University and birthplace of the ice cream sundae (1890s).'),
  ('oakpark', 'Frank Lloyd Wright''s architectural playground - 25 buildings still stand here.'),
  ('cicero', 'Al Capone ran his empire from the Hawthorne Hotel, still standing on Ogden Ave.'),
  ('skokie', 'The "World''s Largest Village" was called Niles Center until 1940.'),
  ('schaumburg', 'Went from 130 residents (1956) to 75,000+ today - one of America''s fastest-growing suburbs.'),
  ('naperville', 'Named "Best Place to Live in America" twice by Money magazine.'),
  ('aurora', 'First U.S. city to illuminate its streets entirely with electric lights (1881).'),
  ('joliet', 'The Old Joliet Prison hosted Jake and Elwood in The Blues Brothers opening scene.'),
  ('waukegan', 'Ray Bradbury grew up here - Green Town in his novels is based on Waukegan.'),
  ('oak lawn', 'The Hilltop restaurant''s iconic neon sign has been a Route 66 landmark since 1961.'),
  ('des plaines', 'Home of the first McDonald''s franchise opened by Ray Kroc in 1955.'),
  ('wilmette', 'The Baha''i House of Worship is the oldest surviving Baha''i temple in the world.'),
  ('berwyn', 'Features the world''s largest laundromat and Cermak Plaza''s iconic "Spindle" car sculpture.'),
  ('park ridge', 'Hillary Clinton''s hometown - she graduated from Maine South High School.'),
  ('glen ellyn', 'Lake Ellyn was created in 1889 by damming a creek to power a mill.'),
  ('wheaton', 'Red Grange, "The Galloping Ghost," played football at Wheaton College.'),
  ('orland park', 'Named after the town''s founder, John Orland, who arrived in the 1840s.'),
  ('tinley park', 'Home to the Hollywood Casino Amphitheatre, one of the Midwest''s premier concert venues.'),
  ('oak brook', 'McDonald''s global headquarters moved here in 2018 to a sprawling campus.'),
  ('lombard', 'The Lilac Village celebrates Lilacia Park''s 1,200+ lilac bushes each May.'),
  ('downers grove', 'The Pierce Downer cabin (1832) is one of the oldest structures in the area.'),
  ('elmhurst', 'York Theatre, built in 1924, is one of the few remaining atmospheric movie palaces.'),
  ('palatine', 'Named after Palatine, New York, by early settlers from that region.'),
  ('arlington heights', 'Arlington Park racetrack hosted the first million-dollar horse race in 1981.'),
  ('buffalo grove', 'Named after the buffalo that once roamed the prairie groves here.'),
  ('mount prospect', 'The Busse-Biermann mansion (1910) is now a historical museum.'),
  ('hoffman', 'Hoffman Estates was farmland until the 1950s when Sam Hoffman built planned suburbs.'),
  ('bolingbrook', 'Incorporated in 1965, it''s one of Illinois''s youngest and fastest-growing towns.'),
  ('crystal lake', 'The lake itself was formed by a glacier and is spring-fed - hence the crystal-clear water.');

SELECT COUNT(*) as total_facts FROM fun_facts;
