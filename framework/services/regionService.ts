/**
 * regionService.ts
 *
 * Full India geographic hierarchy:
 *   State → Cities → Sub-regions (neighbourhoods / zones within each city)
 *
 * Also provides helper functions:
 *   - getStates()               → all state names
 *   - getCitiesForState(state)  → cities in a state
 *   - getSubRegionsForCity(city)→ sub-regions / zones in a city
 *   - guessSubRegion(city, area, pincode) → best-effort sub-region from address fields
 *   - legacyHubForCity(city)    → backwards-compat mapping to old RegionHub for kit filtering
 */

export interface SubRegion {
  id: string;       // slug, e.g. 'pune-koregaon-park'
  name: string;     // human label, e.g. 'Koregaon Park / Kalyani Nagar'
  pincodes?: string[]; // representative pincodes for this zone
  keywords?: string[]; // area/landmark keywords that map to this zone
}

export interface IndiaCity {
  name: string;
  subRegions: SubRegion[];
}

export interface IndiaState {
  name: string;
  cities: IndiaCity[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GEO DATABASE
// ─────────────────────────────────────────────────────────────────────────────

export const INDIA_GEO: IndiaState[] = [
  // ── MAHARASHTRA ──────────────────────────────────────────────────────────────
  {
    name: 'Maharashtra',
    cities: [
      {
        name: 'Pune',
        subRegions: [
          { id: 'pune-koregaon-park', name: 'Koregaon Park / Kalyani Nagar', pincodes: ['411001', '411006'], keywords: ['koregaon', 'kalyani nagar', 'KP'] },
          { id: 'pune-shivajinagar', name: 'Shivajinagar / Deccan', pincodes: ['411005', '411004'], keywords: ['shivajinagar', 'deccan', 'fc road', 'jm road'] },
          { id: 'pune-kothrud',      name: 'Kothrud / Warje',              pincodes: ['411038', '411058'], keywords: ['kothrud', 'warje', 'karve nagar'] },
          { id: 'pune-hinjewadi',    name: 'Hinjewadi / Wakad',            pincodes: ['411057', '411027'], keywords: ['hinjewadi', 'wakad', 'pimpri', 'pune it park'] },
          { id: 'pune-baner',        name: 'Baner / Balewadi / Aundh',     pincodes: ['411045', '411007'], keywords: ['baner', 'balewadi', 'aundh', 'pashan'] },
          { id: 'pune-viman-nagar',  name: 'Viman Nagar / Kharadi',        pincodes: ['411014', '411015'], keywords: ['viman nagar', 'kharadi', 'nagar road'] },
          { id: 'pune-hadapsar',     name: 'Hadapsar / Magarpatta',        pincodes: ['411028', '411013'], keywords: ['hadapsar', 'magarpatta', 'manjri', 'fursungi'] },
          { id: 'pune-camp',         name: 'Camp / Cantonment',            pincodes: ['411001'], keywords: ['camp', 'cantonment', 'pune station', 'mg road'] },
          { id: 'pune-pcmc',         name: 'Pimpri-Chinchwad (PCMC)',      pincodes: ['411017', '411018', '411019'], keywords: ['pimpri', 'chinchwad', 'nigdi', 'akurdi', 'pcmc'] },
          { id: 'pune-kondhwa',      name: 'Kondhwa / Undri / NIBM',       pincodes: ['411048', '411060'], keywords: ['kondhwa', 'undri', 'nibm', 'mohammadwadi'] },
        ],
      },
      {
        name: 'Mumbai',
        subRegions: [
          { id: 'mumbai-south',       name: 'South Mumbai / Fort / Colaba', pincodes: ['400001', '400005', '400039'], keywords: ['colaba', 'fort', 'churchgate', 'marine lines', 'nariman point'] },
          { id: 'mumbai-bandra',      name: 'Bandra / Khar / Santacruz',    pincodes: ['400050', '400052', '400054'], keywords: ['bandra', 'khar', 'santacruz', 'bkc', 'linking road'] },
          { id: 'mumbai-andheri',     name: 'Andheri / Jogeshwari',         pincodes: ['400053', '400058', '400059'], keywords: ['andheri', 'jogeshwari', 'versova', 'oshiwara'] },
          { id: 'mumbai-borivali',    name: 'Borivali / Kandivali / Malad', pincodes: ['400066', '400067', '400064'], keywords: ['borivali', 'kandivali', 'malad', 'goregaon'] },
          { id: 'mumbai-thane',       name: 'Thane / Mulund',               pincodes: ['400601', '400080'], keywords: ['thane', 'mulund', 'ghodbunder'] },
          { id: 'mumbai-navi-mumbai', name: 'Navi Mumbai / Vashi / Belapur',pincodes: ['400703', '400614'], keywords: ['navi mumbai', 'vashi', 'belapur', 'kharghar', 'cbd'] },
          { id: 'mumbai-dadar',       name: 'Dadar / Parel / Worli',        pincodes: ['400014', '400012', '400025'], keywords: ['dadar', 'parel', 'worli', 'lower parel', 'elphinstone'] },
          { id: 'mumbai-powai',       name: 'Powai / Vikhroli / Ghatkopar', pincodes: ['400076', '400083', '400077'], keywords: ['powai', 'vikhroli', 'ghatkopar', 'hiranandani'] },
        ],
      },
      {
        name: 'Nashik',
        subRegions: [
          { id: 'nashik-city',     name: 'Nashik City / CBS',  pincodes: ['422001'], keywords: ['nashik', 'cbs', 'mahamarg'] },
          { id: 'nashik-panchvati',name: 'Panchvati / Trimbak',pincodes: ['422003'], keywords: ['panchvati', 'trimbak', 'nashik road'] },
          { id: 'nashik-satpur',   name: 'Satpur / Ambad MIDC',pincodes: ['422007'], keywords: ['satpur', 'ambad', 'midc'] },
        ],
      },
      {
        name: 'Nagpur',
        subRegions: [
          { id: 'nagpur-civil-lines',  name: 'Civil Lines / Dhantoli',   pincodes: ['440001', '440012'], keywords: ['civil lines', 'dhantoli', 'centre point'] },
          { id: 'nagpur-sitabuldi',    name: 'Sitabuldi / Itwari',       pincodes: ['440012'], keywords: ['sitabuldi', 'itwari', 'cotton market'] },
          { id: 'nagpur-sadar',        name: 'Sadar / Ramdaspeth',       pincodes: ['440010'], keywords: ['sadar', 'ramdaspeth'] },
          { id: 'nagpur-hingna',       name: 'Hingna / MIDC / Butibori', pincodes: ['441110'], keywords: ['hingna', 'butibori', 'midc nagpur'] },
        ],
      },
      {
        name: 'Aurangabad',
        subRegions: [
          { id: 'aurangabad-city',   name: 'Aurangabad City', pincodes: ['431001'], keywords: ['aurangabad', 'cidco'] },
          { id: 'aurangabad-waluj',  name: 'Waluj / MIDC',    pincodes: ['431136'], keywords: ['waluj', 'midc aurangabad'] },
        ],
      },
    ],
  },

  // ── KARNATAKA ─────────────────────────────────────────────────────────────
  {
    name: 'Karnataka',
    cities: [
      {
        name: 'Bengaluru',
        subRegions: [
          { id: 'blr-indiranagar',   name: 'Indiranagar / Ulsoor',       pincodes: ['560038', '560008'], keywords: ['indiranagar', 'ulsoor', '100 feet road'] },
          { id: 'blr-koramangala',   name: 'Koramangala / HSR Layout',   pincodes: ['560034', '560102'], keywords: ['koramangala', 'hsr layout', 'somasundarapalya'] },
          { id: 'blr-whitefield',    name: 'Whitefield / ITPL / Marathahalli', pincodes: ['560066', '560037'], keywords: ['whitefield', 'itpl', 'marathahalli', 'brookefield'] },
          { id: 'blr-electronic-city', name: 'Electronic City / Bommanahalli', pincodes: ['560100', '560068'], keywords: ['electronic city', 'bommanahalli', 'hosa road'] },
          { id: 'blr-jayanagar',     name: 'Jayanagar / JP Nagar',       pincodes: ['560041', '560078'], keywords: ['jayanagar', 'jp nagar', 'banashankari'] },
          { id: 'blr-malleswaram',   name: 'Malleswaram / Rajajinagar',  pincodes: ['560003', '560010'], keywords: ['malleswaram', 'rajajinagar', 'basaveshwaranagar'] },
          { id: 'blr-hebbal',        name: 'Hebbal / Yelahanka / Devanahalli', pincodes: ['560024', '560064'], keywords: ['hebbal', 'yelahanka', 'devanahalli', 'airport road blr'] },
          { id: 'blr-sarjapur',      name: 'Sarjapur Road / Bellandur',  pincodes: ['562125', '560103'], keywords: ['sarjapur', 'bellandur', 'outer ring road blr'] },
          { id: 'blr-mg-road',       name: 'MG Road / Brigade / CBD',    pincodes: ['560001', '560025'], keywords: ['mg road', 'brigade road', 'commercial street', 'residency road'] },
        ],
      },
      {
        name: 'Mysuru',
        subRegions: [
          { id: 'mysuru-city',     name: 'Mysuru City / Devaraja',  pincodes: ['570001'], keywords: ['mysuru', 'mysore', 'devaraja'] },
          { id: 'mysuru-vijayanagar', name: 'Vijayanagar / Bogadi', pincodes: ['570017'], keywords: ['vijayanagar mysuru', 'bogadi'] },
        ],
      },
      {
        name: 'Mangaluru',
        subRegions: [
          { id: 'mangaluru-city',    name: 'Mangaluru City',       pincodes: ['575001'], keywords: ['mangalore', 'mangaluru', 'hampankatta'] },
          { id: 'mangaluru-bejai',   name: 'Bejai / Kadri / Attavar', pincodes: ['575004'], keywords: ['bejai', 'kadri', 'attavar'] },
        ],
      },
      {
        name: 'Hubballi',
        subRegions: [
          { id: 'hubli-dharwad',  name: 'Hubballi-Dharwad',  pincodes: ['580020', '580001'], keywords: ['hubli', 'hubballi', 'dharwad'] },
        ],
      },
    ],
  },

  // ── TELANGANA ─────────────────────────────────────────────────────────────
  {
    name: 'Telangana',
    cities: [
      {
        name: 'Hyderabad',
        subRegions: [
          { id: 'hyd-banjara-hills',  name: 'Banjara Hills / Jubilee Hills', pincodes: ['500034', '500033'], keywords: ['banjara hills', 'jubilee hills', 'road no'] },
          { id: 'hyd-hitech-city',    name: 'HITECH City / Gachibowli',     pincodes: ['500081', '500032'], keywords: ['hitech city', 'gachibowli', 'madhapur', 'kondapur'] },
          { id: 'hyd-secunderabad',   name: 'Secunderabad / Trimulgherry',  pincodes: ['500003', '500015'], keywords: ['secunderabad', 'trimulgherry', 'sd road'] },
          { id: 'hyd-charminar',      name: 'Charminar / Old City',         pincodes: ['500002', '500064'], keywords: ['charminar', 'old city hyd', 'mehdipatnam', 'tolichowki'] },
          { id: 'hyd-kukatpally',     name: 'Kukatpally / KPHB / Miyapur',  pincodes: ['500072', '500049'], keywords: ['kukatpally', 'kphb', 'miyapur', 'moosapet'] },
          { id: 'hyd-uppal',          name: 'Uppal / LB Nagar / Hayathnagar', pincodes: ['500039', '500074'], keywords: ['uppal', 'lb nagar', 'hayathnagar', 'ecil'] },
        ],
      },
      {
        name: 'Warangal',
        subRegions: [
          { id: 'warangal-city', name: 'Warangal City', pincodes: ['506001'], keywords: ['warangal', 'hanamkonda'] },
        ],
      },
    ],
  },

  // ── TAMIL NADU ────────────────────────────────────────────────────────────
  {
    name: 'Tamil Nadu',
    cities: [
      {
        name: 'Chennai',
        subRegions: [
          { id: 'che-anna-nagar',  name: 'Anna Nagar / Arumbakkam',     pincodes: ['600040', '600106'], keywords: ['anna nagar', 'arumbakkam', 'koyambedu'] },
          { id: 'che-t-nagar',     name: 'T. Nagar / Pondy Bazaar',     pincodes: ['600017'], keywords: ['t nagar', 't.nagar', 'pondy bazaar', 'thyagaraya nagar'] },
          { id: 'che-adyar',       name: 'Adyar / Besant Nagar',        pincodes: ['600020', '600090'], keywords: ['adyar', 'besant nagar', 'gandhi nagar chennai'] },
          { id: 'che-velachery',   name: 'Velachery / Pallikaranai',    pincodes: ['600042', '600100'], keywords: ['velachery', 'pallikaranai', 'medavakkam'] },
          { id: 'che-omr',         name: 'OMR / Sholinganallur / Perungudi', pincodes: ['600119', '600096'], keywords: ['omr', 'sholinganallur', 'perungudi', 'siruseri'] },
          { id: 'che-porur',       name: 'Porur / Valasaravakkam / Ambattur', pincodes: ['600116', '600053'], keywords: ['porur', 'valasaravakkam', 'ambattur', 'padi'] },
        ],
      },
      {
        name: 'Coimbatore',
        subRegions: [
          { id: 'cbe-rs-puram',   name: 'RS Puram / Gandhipuram',  pincodes: ['641002', '641012'], keywords: ['rs puram', 'gandhipuram'] },
          { id: 'cbe-peelamedu', name: 'Peelamedu / Hopes College', pincodes: ['641004'], keywords: ['peelamedu', 'hopes college', 'avinashi road'] },
          { id: 'cbe-saravanampatti', name: 'Saravanampatti / Kovaipudur', pincodes: ['641035'], keywords: ['saravanampatti', 'kovaipudur'] },
        ],
      },
      {
        name: 'Madurai',
        subRegions: [
          { id: 'madurai-meenakshi', name: 'Meenakshi / Anna Nagar Madurai', pincodes: ['625001'], keywords: ['madurai', 'meenakshi', 'anna nagar madurai'] },
        ],
      },
    ],
  },

  // ── KERALA ────────────────────────────────────────────────────────────────
  {
    name: 'Kerala',
    cities: [
      {
        name: 'Kochi',
        subRegions: [
          { id: 'kochi-edapally',    name: 'Edapally / Kakkanad',      pincodes: ['682024', '682030'], keywords: ['edapally', 'kakkanad', 'info park kochi'] },
          { id: 'kochi-fort',        name: 'Fort Kochi / Mattancherry',pincodes: ['682001'], keywords: ['fort kochi', 'mattancherry', 'jewish town'] },
          { id: 'kochi-marine-drive',name: 'Marine Drive / Ernakulam', pincodes: ['682011'], keywords: ['marine drive', 'ernakulam', 'mg road kochi'] },
          { id: 'kochi-aluva',       name: 'Aluva / Perumbavoor',      pincodes: ['683101'], keywords: ['aluva', 'perumbavoor'] },
        ],
      },
      {
        name: 'Thiruvananthapuram',
        subRegions: [
          { id: 'tvm-city',     name: 'Trivandrum City / Kowdiar',  pincodes: ['695001', '695003'], keywords: ['trivandrum', 'thiruvananthapuram', 'kowdiar', 'pattom'] },
          { id: 'tvm-technopark', name: 'Technopark / Kazhakuttom', pincodes: ['695581'], keywords: ['technopark', 'kazhakuttom', 'technocity'] },
        ],
      },
    ],
  },

  // ── DELHI ─────────────────────────────────────────────────────────────────
  {
    name: 'Delhi',
    cities: [
      {
        name: 'New Delhi',
        subRegions: [
          { id: 'del-south-delhi',  name: 'South Delhi / Saket / Vasant Kunj', pincodes: ['110017', '110070'], keywords: ['south delhi', 'saket', 'vasant kunj', 'malviya nagar'] },
          { id: 'del-connaught',    name: 'Connaught Place / Central Delhi',   pincodes: ['110001'], keywords: ['connaught place', 'cp', 'central delhi', 'rajpath'] },
          { id: 'del-dwarka',       name: 'Dwarka / Uttam Nagar',              pincodes: ['110075', '110059'], keywords: ['dwarka', 'uttam nagar', 'janakpuri'] },
          { id: 'del-rohini',       name: 'Rohini / Pitampura',                pincodes: ['110085', '110034'], keywords: ['rohini', 'pitampura', 'shalimar bagh'] },
          { id: 'del-karol-bagh',   name: 'Karol Bagh / Patel Nagar',         pincodes: ['110005', '110008'], keywords: ['karol bagh', 'patel nagar', 'rajendra nagar'] },
          { id: 'del-lajpat-nagar', name: 'Lajpat Nagar / Defence Colony',   pincodes: ['110024', '110003'], keywords: ['lajpat nagar', 'defence colony', 'jangpura'] },
          { id: 'del-noida-sector', name: 'Noida (Sector 18-62)',              pincodes: ['201301', '201304'], keywords: ['noida', 'sector 18', 'sector 62', 'sector 137'] },
          { id: 'del-gurugram',     name: 'Gurugram / DLF / Sohna Road',      pincodes: ['122001', '122002'], keywords: ['gurgaon', 'gurugram', 'dlf phase', 'sohna road', 'cyber city'] },
        ],
      },
    ],
  },

  // ── HARYANA ───────────────────────────────────────────────────────────────
  {
    name: 'Haryana',
    cities: [
      {
        name: 'Gurugram',
        subRegions: [
          { id: 'grg-dlf',         name: 'DLF Phase / Golf Course Road',  pincodes: ['122002'], keywords: ['dlf phase', 'golf course road', 'cyber city'] },
          { id: 'grg-sohna-road',  name: 'Sohna Road / Sector 47-58',    pincodes: ['122001'], keywords: ['sohna road', 'sector 47', 'sector 56', 'sector 58'] },
          { id: 'grg-manesar',     name: 'Manesar / NH-48',               pincodes: ['122051'], keywords: ['manesar', 'nh48', 'nh8'] },
        ],
      },
      {
        name: 'Faridabad',
        subRegions: [
          { id: 'fbd-sector',  name: 'NIT / Sector 14-22', pincodes: ['121001'], keywords: ['faridabad', 'nit', 'mathura road'] },
        ],
      },
    ],
  },

  // ── RAJASTHAN ─────────────────────────────────────────────────────────────
  {
    name: 'Rajasthan',
    cities: [
      {
        name: 'Jaipur',
        subRegions: [
          { id: 'jai-c-scheme',     name: 'C-Scheme / Ashok Nagar',    pincodes: ['302001', '302016'], keywords: ['c scheme', 'ashok nagar jaipur'] },
          { id: 'jai-vaishali-nagar', name: 'Vaishali Nagar / Ajmer Road', pincodes: ['302021'], keywords: ['vaishali nagar', 'ajmer road jaipur'] },
          { id: 'jai-malviya-nagar', name: 'Malviya Nagar / Jagatpura',  pincodes: ['302017', '302025'], keywords: ['malviya nagar jaipur', 'jagatpura'] },
          { id: 'jai-mansarovar',   name: 'Mansarovar / Chitrakoot',    pincodes: ['302020'], keywords: ['mansarovar jaipur', 'chitrakoot jaipur'] },
        ],
      },
      {
        name: 'Jodhpur',
        subRegions: [
          { id: 'jod-city',  name: 'Jodhpur City / Sardarpura', pincodes: ['342001'], keywords: ['jodhpur', 'sardarpura'] },
        ],
      },
      {
        name: 'Udaipur',
        subRegions: [
          { id: 'udp-city', name: 'Udaipur City / Fatehsagar', pincodes: ['313001'], keywords: ['udaipur', 'fatehsagar', 'sukhadia circle'] },
        ],
      },
    ],
  },

  // ── UTTAR PRADESH ─────────────────────────────────────────────────────────
  {
    name: 'Uttar Pradesh',
    cities: [
      {
        name: 'Lucknow',
        subRegions: [
          { id: 'lko-gomti-nagar',  name: 'Gomti Nagar / Vikas Nagar',  pincodes: ['226010', '226022'], keywords: ['gomti nagar', 'vikas nagar lucknow'] },
          { id: 'lko-hazratganj',   name: 'Hazratganj / Mahanagar',     pincodes: ['226001', '226006'], keywords: ['hazratganj', 'mahanagar lucknow'] },
          { id: 'lko-alambagh',     name: 'Alambagh / Chinhat',         pincodes: ['226005'], keywords: ['alambagh', 'chinhat lucknow'] },
        ],
      },
      {
        name: 'Agra',
        subRegions: [
          { id: 'agr-taj-ganj',   name: 'Taj Ganj / Fatehabad Road',  pincodes: ['282001'], keywords: ['taj ganj', 'fatehabad road', 'taj mahal area'] },
          { id: 'agr-sikandra',   name: 'Sikandra / Kamla Nagar',     pincodes: ['282007'], keywords: ['sikandra agra', 'kamla nagar agra'] },
        ],
      },
      {
        name: 'Kanpur',
        subRegions: [
          { id: 'knp-civil-lines',  name: 'Civil Lines / The Mall',   pincodes: ['208001'], keywords: ['civil lines kanpur', 'the mall kanpur'] },
          { id: 'knp-kidwai-nagar', name: 'Kidwai Nagar / Govind Nagar', pincodes: ['208011'], keywords: ['kidwai nagar', 'govind nagar kanpur'] },
        ],
      },
    ],
  },

  // ── PUNJAB ────────────────────────────────────────────────────────────────
  {
    name: 'Punjab',
    cities: [
      {
        name: 'Chandigarh',
        subRegions: [
          { id: 'chd-sector-17',  name: 'Sector 17 / 22 / 35 (City Centre)', pincodes: ['160017', '160022'], keywords: ['sector 17 chd', 'sector 22 chd', 'chandigarh city'] },
          { id: 'chd-sector-44',  name: 'Sector 44 / 46 / Manimajra',        pincodes: ['160047'], keywords: ['sector 44 chd', 'manimajra', 'sector 46 chd'] },
          { id: 'chd-mohali',     name: 'Mohali / Panchkula',                pincodes: ['160059', '134109'], keywords: ['mohali', 'panchkula', 'zirakpur'] },
        ],
      },
      {
        name: 'Ludhiana',
        subRegions: [
          { id: 'ldh-model-town', name: 'Model Town / Sarabha Nagar', pincodes: ['141002'], keywords: ['model town ludhiana', 'sarabha nagar'] },
          { id: 'ldh-brs-nagar',  name: 'BRS Nagar / Gurdev Nagar',   pincodes: ['141012'], keywords: ['brs nagar', 'gurdev nagar ludhiana'] },
        ],
      },
      {
        name: 'Amritsar',
        subRegions: [
          { id: 'asr-golden-temple', name: 'Golden Temple / Old City', pincodes: ['143001'], keywords: ['golden temple', 'amritsar old city'] },
          { id: 'asr-ranjit-avenue', name: 'Ranjit Avenue / GT Road',  pincodes: ['143001'], keywords: ['ranjit avenue', 'gt road amritsar'] },
        ],
      },
    ],
  },

  // ── GUJARAT ───────────────────────────────────────────────────────────────
  {
    name: 'Gujarat',
    cities: [
      {
        name: 'Ahmedabad',
        subRegions: [
          { id: 'ahm-navrangpura',  name: 'Navrangpura / CG Road',     pincodes: ['380009', '380006'], keywords: ['navrangpura', 'cg road', 'law garden'] },
          { id: 'ahm-sg-highway',   name: 'SG Highway / Bodakdev',     pincodes: ['380054', '380059'], keywords: ['sg highway', 'bodakdev', 'satellite ahm'] },
          { id: 'ahm-maninagar',    name: 'Maninagar / Vastral',       pincodes: ['380008', '382418'], keywords: ['maninagar', 'vastral', 'ramol'] },
          { id: 'ahm-prahlad-nagar',name: 'Prahlad Nagar / Vastrapur', pincodes: ['380015'], keywords: ['prahlad nagar', 'vastrapur', 'judges bungalow'] },
        ],
      },
      {
        name: 'Surat',
        subRegions: [
          { id: 'srt-adajan',      name: 'Adajan / Vesu',             pincodes: ['395009', '395007'], keywords: ['adajan', 'vesu surat'] },
          { id: 'srt-udhna',       name: 'Udhna / Katargam',         pincodes: ['394210', '395004'], keywords: ['udhna', 'katargam'] },
          { id: 'srt-city',        name: 'Surat City / Ring Road',   pincodes: ['395003'], keywords: ['surat ring road', 'surat city'] },
        ],
      },
      {
        name: 'Vadodara',
        subRegions: [
          { id: 'vdr-alkapuri',   name: 'Alkapuri / Productivity Road', pincodes: ['390007'], keywords: ['alkapuri', 'productivity road'] },
          { id: 'vdr-sayajigunj', name: 'Sayajigunj / Fatehgunj',       pincodes: ['390005'], keywords: ['sayajigunj', 'fatehgunj baroda'] },
        ],
      },
    ],
  },

  // ── WEST BENGAL ───────────────────────────────────────────────────────────
  {
    name: 'West Bengal',
    cities: [
      {
        name: 'Kolkata',
        subRegions: [
          { id: 'kol-salt-lake',  name: 'Salt Lake / New Town / Rajarhat', pincodes: ['700064', '700156'], keywords: ['salt lake', 'new town kolkata', 'rajarhat', 'sector v'] },
          { id: 'kol-south',      name: 'South Kolkata / Ballygunge',      pincodes: ['700019', '700029'], keywords: ['ballygunge', 'south kolkata', 'lake gardens', 'jodhpur park'] },
          { id: 'kol-park-street',name: 'Park Street / Central Kolkata',   pincodes: ['700016', '700001'], keywords: ['park street', 'central kolkata', 'esplanade'] },
          { id: 'kol-dum-dum',    name: 'Dum Dum / Dakshineswar',          pincodes: ['700028', '700076'], keywords: ['dum dum', 'dakshineswar', 'airport kolkata'] },
          { id: 'kol-howrah',     name: 'Howrah / Shibpur',               pincodes: ['711101', '711102'], keywords: ['howrah', 'shibpur'] },
        ],
      },
    ],
  },

  // ── ODISHA ────────────────────────────────────────────────────────────────
  {
    name: 'Odisha',
    cities: [
      {
        name: 'Bhubaneswar',
        subRegions: [
          { id: 'bbsr-saheed-nagar',  name: 'Saheed Nagar / Jaydev Vihar', pincodes: ['751007', '751013'], keywords: ['saheed nagar', 'jaydev vihar'] },
          { id: 'bbsr-nayapalli',     name: 'Nayapalli / Khandagiri',      pincodes: ['751012'], keywords: ['nayapalli', 'khandagiri'] },
          { id: 'bbsr-patia',         name: 'Patia / Infocity',            pincodes: ['751024'], keywords: ['patia', 'infocity bhubaneswar'] },
        ],
      },
    ],
  },

  // ── JHARKHAND ─────────────────────────────────────────────────────────────
  {
    name: 'Jharkhand',
    cities: [
      {
        name: 'Ranchi',
        subRegions: [
          { id: 'rnc-city',     name: 'Ranchi City / Lalpur',      pincodes: ['834001'], keywords: ['ranchi', 'lalpur'] },
          { id: 'rnc-kanke',    name: 'Kanke / Tupudana',          pincodes: ['834006'], keywords: ['kanke', 'tupudana'] },
        ],
      },
    ],
  },

  // ── ASSAM ─────────────────────────────────────────────────────────────────
  {
    name: 'Assam',
    cities: [
      {
        name: 'Guwahati',
        subRegions: [
          { id: 'gwt-pan-bazar',  name: 'Pan Bazar / Fancy Bazar',  pincodes: ['781001'], keywords: ['pan bazar', 'fancy bazar guwahati'] },
          { id: 'gwt-gmc',        name: 'GMC / VIP Road / Dispur',  pincodes: ['781005', '781006'], keywords: ['gmc guwahati', 'vip road gwt', 'dispur'] },
          { id: 'gwt-zoo-road',   name: 'Zoo Road / Ulubari',       pincodes: ['781007'], keywords: ['zoo road', 'ulubari guwahati'] },
        ],
      },
    ],
  },

  // ── BIHAR ─────────────────────────────────────────────────────────────────
  {
    name: 'Bihar',
    cities: [
      {
        name: 'Patna',
        subRegions: [
          { id: 'ptn-boring-road', name: 'Boring Road / Rajendra Nagar', pincodes: ['800001', '800016'], keywords: ['boring road patna', 'rajendra nagar patna'] },
          { id: 'ptn-kankarbagh',  name: 'Kankarbagh / Bailey Road',     pincodes: ['800020'], keywords: ['kankarbagh', 'bailey road patna'] },
        ],
      },
    ],
  },

  // ── MADHYA PRADESH ────────────────────────────────────────────────────────
  {
    name: 'Madhya Pradesh',
    cities: [
      {
        name: 'Indore',
        subRegions: [
          { id: 'ind-vijay-nagar',  name: 'Vijay Nagar / AB Road',    pincodes: ['452010'], keywords: ['vijay nagar indore', 'ab road indore'] },
          { id: 'ind-rau',          name: 'Rau / Bypass Road',        pincodes: ['453446'], keywords: ['rau indore', 'bypass indore'] },
          { id: 'ind-palasia',      name: 'Palasia / Bhawarkuan',     pincodes: ['452001'], keywords: ['palasia', 'bhawarkuan'] },
        ],
      },
      {
        name: 'Bhopal',
        subRegions: [
          { id: 'bpl-mp-nagar',   name: 'MP Nagar / Arera Colony',  pincodes: ['462011', '462016'], keywords: ['mp nagar bhopal', 'arera colony'] },
          { id: 'bpl-kolar',      name: 'Kolar / Hoshangabad Road',  pincodes: ['462042'], keywords: ['kolar bhopal', 'hoshangabad road'] },
        ],
      },
    ],
  },

  // ── ANDHRA PRADESH ────────────────────────────────────────────────────────
  {
    name: 'Andhra Pradesh',
    cities: [
      {
        name: 'Visakhapatnam',
        subRegions: [
          { id: 'vsk-mvp-colony', name: 'MVP Colony / Seethammadara', pincodes: ['530017', '530013'], keywords: ['mvp colony', 'seethammadara'] },
          { id: 'vsk-gajuwaka',   name: 'Gajuwaka / Steel Plant',    pincodes: ['530026'], keywords: ['gajuwaka', 'steel plant vizag'] },
        ],
      },
      {
        name: 'Vijayawada',
        subRegions: [
          { id: 'vja-city',   name: 'Vijayawada City / Governorpet', pincodes: ['520002'], keywords: ['vijayawada', 'governorpet'] },
          { id: 'vja-mg-road',name: 'MG Road / Patamata',           pincodes: ['520010'], keywords: ['mg road vijayawada', 'patamata'] },
        ],
      },
    ],
  },

  // ── UTTARAKHAND ───────────────────────────────────────────────────────────
  {
    name: 'Uttarakhand',
    cities: [
      {
        name: 'Dehradun',
        subRegions: [
          { id: 'ddn-rajpur-road', name: 'Rajpur Road / Prem Nagar', pincodes: ['248001'], keywords: ['rajpur road', 'prem nagar ddn'] },
          { id: 'ddn-eccles-road', name: 'Eccles Road / Nehru Colony', pincodes: ['248001'], keywords: ['eccles road', 'nehru colony ddn'] },
        ],
      },
    ],
  },

  // ── HIMACHAL PRADESH ──────────────────────────────────────────────────────
  {
    name: 'Himachal Pradesh',
    cities: [
      {
        name: 'Shimla',
        subRegions: [
          { id: 'sml-the-mall', name: 'The Mall / Ridge',        pincodes: ['171001'], keywords: ['the mall shimla', 'ridge shimla'] },
          { id: 'sml-sanjauli', name: 'Sanjauli / Chhota Shimla',pincodes: ['171006'], keywords: ['sanjauli', 'chhota shimla'] },
        ],
      },
    ],
  },

  // ── GOA ───────────────────────────────────────────────────────────────────
  {
    name: 'Goa',
    cities: [
      {
        name: 'Panaji',
        subRegions: [
          { id: 'goa-north',  name: 'North Goa / Mapusa / Calangute', pincodes: ['403507', '403516'], keywords: ['north goa', 'mapusa', 'calangute', 'baga'] },
          { id: 'goa-south',  name: 'South Goa / Margao / Colva',    pincodes: ['403601', '403708'], keywords: ['south goa', 'margao', 'colva', 'vasco'] },
          { id: 'goa-panaji', name: 'Panaji / Panjim',               pincodes: ['403001'], keywords: ['panaji', 'panjim'] },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Return all state names in alphabetical order */
export function getStates(): string[] {
  return INDIA_GEO.map((s) => s.name).sort();
}

/** Return cities for a given state name (case-insensitive) */
export function getCitiesForState(stateName: string): string[] {
  const state = INDIA_GEO.find(
    (s) => s.name.toLowerCase() === stateName.trim().toLowerCase(),
  );
  return state ? state.cities.map((c) => c.name) : [];
}

/** Return sub-regions for a given city name (searches across all states) */
export function getSubRegionsForCity(cityName: string): SubRegion[] {
  for (const state of INDIA_GEO) {
    const city = state.cities.find(
      (c) => c.name.toLowerCase() === cityName.trim().toLowerCase(),
    );
    if (city) return city.subRegions;
  }
  return [];
}

/** Return the state name for a given city (case-insensitive) */
export function getStateForCity(cityName: string): string | undefined {
  const lower = cityName.trim().toLowerCase();
  for (const state of INDIA_GEO) {
    if (state.cities.some((c) => c.name.toLowerCase() === lower)) {
      return state.name;
    }
  }
  return undefined;
}

/**
 * Best-effort sub-region derivation from the user's address fields.
 * Checks pincode first (most precise), then area/landmark keywords.
 * Returns the SubRegion id or empty string if no match found.
 */
export function guessSubRegion(
  cityName: string,
  areaAndLandmark: string = '',
  pincode: string = '',
): string {
  const subRegions = getSubRegionsForCity(cityName);
  if (subRegions.length === 0) return '';

  const cleanPin = pincode.trim();
  const cleanArea = areaAndLandmark.toLowerCase().trim();

  // 1. Try pincode match first
  if (cleanPin.length >= 5) {
    const byPin = subRegions.find((sr) =>
      sr.pincodes?.some((p) => p.startsWith(cleanPin.substring(0, 6)) || cleanPin.startsWith(p.substring(0, 5))),
    );
    if (byPin) return byPin.id;
  }

  // 2. Try keyword match on area + landmark
  if (cleanArea) {
    const byKeyword = subRegions.find((sr) =>
      sr.keywords?.some((kw) => cleanArea.includes(kw.toLowerCase())),
    );
    if (byKeyword) return byKeyword.id;
  }

  return '';
}

/** Return the human-readable name for a sub-region id */
export function getSubRegionName(cityName: string, subRegionId: string): string {
  const subRegions = getSubRegionsForCity(cityName);
  return subRegions.find((sr) => sr.id === subRegionId)?.name ?? subRegionId;
}

/**
 * Legacy backwards-compat: map a city to the old RegionHub string.
 * Used wherever RegionHub is still required (e.g. MealKit.availableRegions, Supabase schema).
 */
export function legacyHubForCity(city: string): 'North' | 'South' | 'West' | 'East' {
  const state = getStateForCity(city);
  if (!state) return 'North';

  const stateL = state.toLowerCase();
  if (['karnataka', 'telangana', 'tamil nadu', 'kerala', 'andhra pradesh'].includes(stateL)) return 'South';
  if (['maharashtra', 'gujarat', 'goa'].includes(stateL)) return 'West';
  if (['west bengal', 'odisha', 'jharkhand', 'assam', 'bihar'].includes(stateL)) return 'East';
  return 'North';
}
