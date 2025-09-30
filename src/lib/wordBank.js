// Big, Chicago-flavored word bank for two-word slugs.
// Feel free to add/remove items. Duplicates are auto-deduped when exported.

export const SPORTS_FIGURES = [
  // Bulls
  "Jordan","Pippen","Rodman","Kerr","Longley","Kukoc","Rose","Noah","Butler","DeRozan","LaVine","Vucevic","Gilmore","MVP",
  // Bears
  "Ditka","Payton","Butkus","Urlacher","McMahon","Hester","Singletary","Forte","Fields","Gould",
  // Cubs
  "Rizzo","Bryant","Sandberg","Banks","Sosa","Maddox","Wood","Prior","Dawson","Zambrano","Hendry",
  // White Sox
  "Konerko","Buehrle","Fisk","Thome","Abreu","Anderson","Minoso","Ventura","Crede","Burhle",
  // Blackhawks
  "Kane","Toews","Hull","Mikita","Esposito","Hasek","Crawford","Seabrook","Keith",
  // Sky / Fire
  "Parker","Quigley","Vandersloot","DelleDonne","Shaqiri"
]

export const NEIGHBORHOODS = [
  "Wicker Park","Logan Square","Hyde Park","Bronzeville","Pilsen","Lincoln Park","Lakeview","Englewood","Uptown","Bridgeport",
  "West Loop","South Loop","Old Town","Chinatown","Rogers Park","Avondale","Humboldt Park","Bucktown","Albany Park","Andersonville",
  "Edgewater","Little Italy","Little Village","Back of the Yards","Garfield Ridge","Jefferson Park","Norwood Park","Portage Park",
  "Beverly","Mount Greenwood","Kenwood","Woodlawn","Near North","Near West","Near South","Printers Row","Streeterville","Gold Coast",
]

export const STREETS = [
  "Michigan Avenue","State Street","Clark","Halsted","Ashland","Damen","Cicero","Western","Kedzie","Pulaski",
  "Roosevelt","Madison","Belmont","Diversey","Irving Park","Fullerton","Addison","Lawrence","63rd","79th",
  "Lake Shore Drive","Columbus","Wabash","Dearborn","LaSalle","Milwaukee","Elston","Clybourn","Ogden","Canal",
]

export const HISTORIC_EVENTS = [
  "Great Chicago Fire","Worlds Fair","Haymarket","Pullman Strike","Prohibition","St Valentines Day","1968 Convention",
  "Columbian Exposition","Eastland Disaster","Fort Dearborn","Union Stockyards","Route 66",
]

export const NICKNAMES = [
  "Windy City","Second City","Chi-Town","City of Big Shoulders","Sweet Home","The 312","The Chi","Hog Butcher",
]

export const FOODS = [
  "Deep Dish","Tavern Cut","Italian Beef","Maxwell Street Polish","Rainbow Cone","Chicago Dog","Char Dog","Giardiniera",
  "Malort","Garrett Popcorn","Old Style","Italian Ice","Steak Sandwich","Beef Combo","Jibarito","Paczkis","Chocolate Cake Shake",
]

export const RESTAURANTS_BRANDS = [
  "Als Beef","Gene and Judes","Superdawg","Pequods","Portillos","Ginos East","Giordanos","Lou Malnatis","Pizzeria Uno",
  "Harolds Chicken","Billy Goat","Vienna Beef","Alinea","Girl and the Goat","Parsons","Smoque","Devon Seafood","Joe Flamm",
]

export const WATER_PARKS = [
  "Chicago River","Calumet","Des Plaines","North Branch","South Branch","Lake Michigan","Jackson Park","Grant Park",
  "Humboldt Park","Garfield Park","Lincoln Park","Burnham Harbor","Monroe Harbor",
]

export const ATTRACTIONS = [
  "Navy Pier","Willis Tower","Hancock","The Bean","Buckingham Fountain","Wrigley Field","Soldier Field","United Center",
  "Field Museum","Shedd Aquarium","Adler Planetarium","Art Institute","Museum of Science and Industry","606 Trail","Magnificent Mile",
  "Water Tower","Merchandise Mart","Union Station","Rookery","Cultural Center",
]

// Extra Chicago-y nouns to boost variety & combos
export const EXTRAS = [
  "L", "Elevated", "Brown Line", "Red Line", "Blue Line", "Green Line", "Pink Line", "Orange Line", "Purple Line", "Metra",
  "Bungalow", "Greystone", "Drawbridge", "Lakefront", "Skyway", "Harbor", "Pier", "Shoreline", "Boulevard",
  "Snow", "Lake Effect", "Polar Vortex", "Summerfest", "Taste of Chicago", "Blizzard", "Street Fest",
  "Mural", "Skylight", "Corner Tavern", "Neighborhood Bar", "Corner Store", "Mom and Pop", "Corner Bakery",
];

// Deduped, trimmed, safe for display & slugging
function normalize(w) {
  return String(w || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[’']/g, "") // normalize apostrophes
}
const ALL_SETS = [
  SPORTS_FIGURES, NEIGHBORHOODS, STREETS, HISTORIC_EVENTS, NICKNAMES,
  FOODS, RESTAURANTS_BRANDS, WATER_PARKS, ATTRACTIONS, EXTRAS
]
export const WORD_BANK = Array.from(
  new Set(ALL_SETS.flat().map(normalize).filter(Boolean))
)
