/**
 * Category Rules for Transaction Classification
 * 
 * HOW IT WORKS:
 * - Each key is the category name (used in QIF L-field)
 * - Each value is an array of keywords to match against transaction descriptions
 * - Matching is case-insensitive and uses "contains" (substring) matching
 * - First match wins — order matters if a keyword could match multiple categories
 * 
 * HOW TO ADD NEW CATEGORIES:
 * 1. Add a new key with your category name
 * 2. Add an array of uppercase keyword strings
 * 3. Keywords should be specific enough to avoid false matches
 * 
 * EXAMPLE:
 *   'MyCategory:Subcategory': ['KEYWORD1', 'KEYWORD2'],
 */

const CATEGORY_RULES = {
    // --- Transport ---
    'Fahrtkosten:Bus & MRT': ['BUS/MRT'],
    'Fahrtkosten:Taxi': ['GOJEK', 'RYDE', 'GRAB', 'TADA'],
    'Fahrtkosten:Bike': ['HELLORIDE'],

    // --- Vehicle ---
    'Fahrzeuge:Parkgebühren': ['PARKING'],
    'Fahrzeuge:Benzin': ['SPC', 'SINGAPORE PETROLEUM'],
    'Fahrzeuge:TÜV': ['VICOM'],
    'Fahrzeuge:Inspektion': ['YAMAHA'],
    'Fahrzeuge:Steuer': ['LTA E-SERVICE', 'LTA ESERVICE', 'VR20'],

    // --- Food & Drink ---
    'Ernährung:Groceries': [
        'SHENG SIONG', 'FAIRPRICE', 'COLD STORAGE', 'NTUC', 'GIANT',
        'GERMANMARKETPLACE', 'REDMART', '7-ELEVEN', 'AMAZON RETAIL', 'AFRICAN MARKETP'
    ],
    'Ernährung:Restaurants': [
        'PASTA & CO', 'HUSHIRO',
        'SUBWAY', 'RESTAURANT', 'FOOD', 'TACO', 'YOSHINOYA', 'AN LA GHIEN',
        'GYG', 'OMOTE', 'PIZZERIA', 'PIZZA', 'ROLLIE OLIE', 'BANGKOK JAM',
        'WOK HEY', 'MRS PHO', 'HAI DI LAO', "THAI'D ME UP", 'OH SOME BOWLS',
        'DIM SUM', 'WINE CONNECTION', 'VIETNAMESE DELIGHTS', 'AL BORGO',
        'STUFF', 'MERCI MARCEL', 'LOTUS NGUYEN', 'KAZBAR', 'SPIZZA',
        'KEBAB', 'MCDONALD', 'ENSEEDS', 'CO CHUNG', 'PPUNCH', 'SUSHI BAR',
        'WARMUPCAFE', 'OPERETTA CORNER BAR', 'AUTHENTIC THAI',
        'MEXICAN FOOD CORP', 'BROTZEIT', 'SUSHI-TEI', 'AYAMPRESIDENT',
        'NOBU', 'IZAKAYA', 'MANGIAMO', "DELI'S KITCHEN", 'D.O.P'
    ],
    'Ernährung:Coffee': [
        'MORNING GRIND', 'ALCHEMIST', 'COFFEE', 'ESPRESSO',
        'ROUND BOY ROASTERS', 'MADROASTER', 'CAFFEINATION', 'KURASU', 'KOPI', 'APARTMENT',
        'WORKING TITLE'
    ],
    'Ernährung:Getränke': ['BOOST JUICE'],
    'Ernährung:Foodcourt': [
        'PEPPER LUNCH', 'KOOPITIAM', 'AMOY ST FC', 'SG F&B MANAGEMENT',
        'PBK EATING HOUSE', 'BK EATING HOUSE', 'KOPITIAM'
    ],

    // --- Payments & Banking ---
    //
    // The bracket-notation category [SG-HSBC-Premier] tells MoneyMoney that
    // a credit card payment transaction is a transfer *from* that bank account.
    // This creates the matching transfer entry automatically when you import the
    // CC statement QIF — no need to categorize the corresponding COLL/GIRO line
    // on the bank statement side; it gets reconciled against the CC transfer.
    //
    // If you change which account your GIRO payments come from (e.g. switch from
    // HSBC Premier to DBS), update the bracket name below to match your new
    // account name exactly as it appears in your accounting software.
    '[SG-HSBC-Premier]': ['GIRO PAYMENT', 'THANK YOU'],

    'Kreditkartenkosten': ['ANNUAL MEMBER FEE', 'MEMBERSHIP FEE', 'GST ON MEMBERSHIP', 'CARD ANNUAL FEE', 'GST', 'REVERSAL GST', 'REFUND OF CARD ANNUAL FEE', 'ANNUAL FEE CREDIT'],
    'Zinseinkünfte': ['CR INTEREST', 'CREDIT INTEREST'],
    'Cashback': ['UOB ABSOLUTE CASHBACK', 'CASHBACK', 'CASH BACK'],

    // --- Personal Care ---
    'Friseur': ['JEAN YIP'],

    // --- Health ---
    'Krankheitskost.:Arzt': ['MEDSTAR', 'PARKWAY DENTAL', 'SEOW-CHOEN COLORECT', 'TOOFDOCTOR', 'ORCHARD SURGERY', 'RADLINK', 'THE VASCULAR'],
    'Krankheitskost.:Physio': ['CALIBRATE HEALTH'],
    'Krankheitskost.:Medikamente': ["WATSON'S", 'GUARDIAN'],

    // --- Housing & Utilities ---
    // TODO: double-check Siva is the only landlord keyword needed
    'Wohnung:Miete': ['SIVA'],
    'Nebenk. Wohnung:Strom': ['SP SERVICES', 'SP GROUP'],
    'Nebenk. Wohnung:Telefon': ['GOMO MOBILE'],
    'Nebenk. Wohnung:Internet': ['STARHUB RECUR'],
    'Nebenk. Wohnung:TV': ['NETFLIX'],

    // --- Pets ---
    'Pets:Food': ['PET LOVERS'],

    // --- Leisure ---
    'Freizeit:Drinks': ['DRUGGISTS', 'KULT KAFE', 'BREWERKZ', 'HARRY', 'MORTAR AND PESTLE', 'BAR NKD', 'BAR NAKED', 'LION BREWERY', 'BLU JAZ', 'GULPBEER', 'SWISS CLUB', 'ONE LEVELUP', 'THIRSTY BEER', 'JIBIRU', 'ALLEY BAR', 'EMERALD HILL'],
    'Freizeit:Kino': ['THEATRES', 'GOLDEN VILLAGE'],
    'Freizeit:Gym': ['F45'],
    'Freizeit:Massage': ['NATURELAND'],
    'Freizeit:Wellness': ['WELLNESS RESET', 'REVA SOCIAL'],

    // --- Travel ---
    'Reise:Hotelkosten': ['ALOFT', 'HOTEL'],
    'Reise:Pass und Visas': ['MOM*'],
    // TODO: double-check — Klook sells many things (tours, eSIMs, activities); may need splitting
    'Reise:Telefon': ['KLOOK'],
};

