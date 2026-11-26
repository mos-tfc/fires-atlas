export const TOPICS = [
  {
    key: "north-korea",
    country: "North Korea",
    name: "Massed Fires, Missiles and the Russia Link",
    part: 5,
    order: 19,
    description: "How the Korean People’s Army masses artillery along the DMZ: artillery groups, the Koksan and 240mm rockets, missiles that blur into artillery, nuclear and chemical options, hardened sites, and what the war in Ukraine has taught it."
  },
  {
    key: "australia",
    country: "Australia",
    name: "Littoral Manoeuvre and Long-Range Fires",
    part: 5,
    order: 18,
    description: "How the Royal Australian Artillery is rebuilding for littoral and long-range war: joint fires teams, the 10th (Fires) Brigade, HIMARS and PrSM, the AS9 Huntsman, drones in an artillery regiment, the cluster munition law, air defence inside the artillery, and home production of rockets and shells."
  },
  {
    key: "japan",
    country: "Japan",
    name: "Island Defence Fires",
    part: 5,
    order: 17,
    description: "How the Ground Self-Defense Force plans fires for island defence: amphibious fire controllers, the legal limits on force, the FCCS fire control network, the Type 19 gun, anti-ship and glide missiles, the cluster munition ban and the ammunition build-up."
  },
  {
    key: "china",
    country: "China",
    name: "The PLA’s Networked Strike Complex",
    part: 5,
    order: 16,
    description: "How the PLA reorganised for joint operations and rebuilt its artillery: group armies and combined arms brigades, system destruction warfare, the Integrated Command Platform, new guns, rockets and guided shells, and its own doubts about its commanders."
  },
  {
    key: "ukraine",
    country: "Ukraine",
    name: "Digital Fires and Survival Under Fire",
    part: 5,
    order: 15,
    description: "How Ukraine, outgunned, turned to software, dispersion, precision and new delivery methods: the corps reform, Delta and GIS Arta, sensor-fuzed rounds, roving guns and domestic production."
  },
  {
    key: "south-korea",
    country: "South Korea",
    name: "Artillery and the Counter-Battery Kill Chain",
    part: 5,
    order: 14,
    description: "How the Republic of Korea Army organises and equips its artillery to win the counter-battery fight against North Korea: doctrine, radars and fire control, the K9 family, mortars, rockets, missiles and loitering munitions."
  },
  {
    key: "russia",
    country: "Russia",
    name: "Artillery and the Reconnaissance-Strike Complex",
    part: 5,
    order: 13,
    description: "How Russia organises, equips and uses its artillery: the reconnaissance-fire and reconnaissance-strike complexes, its guns, rockets, drones and sensors, and what limits them."
  },
  {
    key: 'liaison',
    name: 'Liaison and Fire Support Integration',
    part: 1,
    order: 1,
    description: 'Who links the guns, aircraft and ships to the manoeuvre commander, from company to theatre.'
  },
  {
    key: 'target-acquisition',
    name: 'Target Acquisition',
    part: 3,
    order: 7,
    description: 'How artillery finds, locates and reports targets: radars, the people who process what they find, and the drones now joining them.'
  },
  {
    key: 'digital-fires-c2',
    name: 'Digital Fires and Targeting',
    part: 3,
    order: 9,
    description: 'How a fire mission moves from sensor to gun as data, and how targets are chosen: the software, message formats and networks, the targeting cycle, and what breaks them.'
  },
  {
    key: 'technical-fire-direction',
    name: 'Technical Fire Direction and Gunnery',
    part: 3,
    order: 8,
    description: 'How a target location becomes aiming data for each gun: the fire direction centre, the inputs it needs, the checks it runs, and the fallback when computers fail.'
  },
  {
    key: 'loitering-munitions',
    name: 'Loitering Munitions and Armed Drones',
    part: 2,
    order: 5,
    description: 'Who owns the strike drones, what they are, how they are fitted into fires and airspace, and what recent wars show about using them.'
  },
  {
    key: 'counterfire-survivability',
    name: 'Counter-Fire and Force Protection',
    part: 4,
    order: 11,
    description: 'How enemy guns, rockets and mortars are found and struck, and how friendly firing units, observers and command posts stay alive.'
  },
  {
    key: 'cannon-artillery',
    name: 'Guns, Howitzers and Mortars',
    part: 2,
    order: 2,
    description: 'Tube artillery: the howitzers and the mortars, who owns them, how they are tasked and fired, and how barrels, crews and readiness are managed.'
  },
  {
    key: 'rocket-missile-artillery',
    name: 'Rocket and Missile Artillery',
    part: 2,
    order: 3,
    description: 'The launchers, their crews and munitions, the hide, fire and reload cycle, and the Marine anti-ship missile units.'
  },
  {
    key: 'ammunition-effects',
    name: 'Ammunition and Effects',
    part: 2,
    order: 6,
    description: 'Who chooses and approves the round, how shell, fuze and charge are matched to the target, and the limits set by law, safety and supply.'
  },
  {
    key: 'sustainment',
    name: 'Sustainment',
    part: 4,
    order: 12,
    description: 'How ammunition, fuel and parts reach the guns, how guns are kept firing and recovered, and the stocks and factories behind them.'
  },
  {"key": "indonesia", "country": "Indonesia", "name": "Archipelagic Fire Support", "part": 5, "order": 20, "description": "How Indonesia's Army and Marines deliver fire support across an archipelago: Kostrad and Kodam artillery, wheeled CAESAR guns, ASTROS II and RM-70 rockets, the Turkish ITBM-600/KHAN ballistic missile, armed drones, home-built fire control and data links, and domestic production of shells and propellant."},
  {"key": "malaysia", "country": "Malaysia", "name": "Towed Guns, Rockets and Split Theatres", "part": 5, "order": 21, "description": "How Malaysia's Royal Artillery Regiment delivers fire support across Peninsular and East Malaysia: 105mm light guns, towed G5 and new CAESAR 155mm howitzers, ASTROS II saturation rockets, ARTHUR radars and FlyEye drones, AS4000 digital fire control, short-range air defence, and local assembly under the 2026 defence industry policy."},
  {"key": "singapore", "country": "Singapore", "name": "Networked Precision Fires and Overseas Live-Firing", "part": 5, "order": 22, "description": "How the Singapore Artillery and HQ Sense and Strike link sensors and shooters for a small conscript force: STORM liaison teams, the automated Truck Mounted Gun and Precision Land Shooter, HIMARS with GMLRS, a mixed weapon locating radar fleet, CCIS and BMS digital fires, and major live firing overseas in Australia, New Zealand and the United States."},
  {"key": "india", "country": "India", "name": "Massed 155mm, Indigenous Rockets and Mountain Firepower", "part": 5, "order": 23, "description": "How the Indian Army's Regiment of Artillery is moving to a single 155mm calibre under the Field Artillery Rationalisation Plan, with home-built Dhanush and ATAGS guns, the licence-built K9 Vajra-T and the M777 for roadless mountain sectors. It also covers Pinaka and Smerch rockets, loitering munitions in artillery regiments, the Swathi radar and Shakti command network, training at Deolali and with US forces, and the lessons India drew from Kargil in 1999."}
];
