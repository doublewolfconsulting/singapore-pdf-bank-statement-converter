/**
 * Default Category Rules for Transaction Classification
 *
 * This is the default category file — a starting point with common English categories.
 * Copy this file, rename it to categories.personal.js, and customise it for your
 * own merchants, keywords, and accounting software's category names.
 *
 * HOW IT WORKS:
 * - Each key is the category name (used in QIF L-field)
 * - Each value is an array of keywords to match against transaction descriptions
 * - Matching is case-insensitive and uses "contains" (substring matching)
 * - First match wins — order matters if a keyword could match multiple categories
 *
 * EXAMPLE:
 *   'Food:Groceries': ['TESCO', 'WAITROSE', 'WHOLE FOODS'],
 */

var CATEGORY_RULES = {
    // --- Transport ---
    'Transport:Public Transit': ['BUS', 'MRT', 'SUBWAY', 'METRO', 'TRANSIT'],
    'Transport:Taxi & Rideshare': ['GRAB', 'UBER', 'LYFT', 'GOJEK', 'TAXI'],
    'Transport:Parking': ['PARKING'],
    'Transport:Fuel': ['PETROL', 'FUEL', 'GAS STATION', 'SHELL', 'ESSO'],

    // --- Food & Drink ---
    'Food:Groceries': ['SUPERMARKET', 'GROCERY', 'FAIRPRICE', 'COLD STORAGE', '7-ELEVEN'],
    'Food:Restaurants': ['RESTAURANT', 'FOOD', 'PIZZA', 'SUSHI', 'MCDONALD', 'SUBWAY', 'KFC'],
    'Food:Coffee': ['COFFEE', 'STARBUCKS', 'ESPRESSO', 'CAFE'],
    'Food:Bars & Drinks': ['BAR', 'PUB', 'BREWERY', 'WINE'],

    // --- Shopping ---
    'Shopping:Clothing': ['ZARA', 'H&M', 'UNIQLO', 'CLOTHING', 'FASHION'],
    'Shopping:Electronics': ['APPLE', 'SAMSUNG', 'BESTBUY', 'ELECTRONICS'],
    'Shopping:Online': ['AMAZON', 'LAZADA', 'SHOPEE'],

    // --- Health ---
    'Health:Pharmacy': ['PHARMACY', 'GUARDIAN', 'WATSONS', 'BOOTS'],
    'Health:Doctor': ['CLINIC', 'HOSPITAL', 'MEDICAL', 'DENTAL'],
    'Health:Fitness': ['GYM', 'FITNESS', 'YOGA', 'SPORT'],

    // --- Housing & Utilities ---
    'Utilities:Phone': ['MOBILE', 'TELCO', 'SINGTEL', 'STARHUB', 'M1'],
    'Utilities:Internet': ['BROADBAND', 'INTERNET', 'FIBRE'],
    'Utilities:Electricity & Water': ['UTILITIES', 'ELECTRIC', 'WATER BILL'],

    // --- Leisure ---
    'Leisure:Entertainment': ['NETFLIX', 'SPOTIFY', 'CINEMA', 'THEATRE'],
    'Leisure:Travel': ['HOTEL', 'AIRBNB', 'AIRLINE', 'FLIGHT', 'BOOKING'],

    // --- Banking & Finance ---
    'Banking:Fees': ['ANNUAL FEE', 'MEMBERSHIP FEE', 'SERVICE CHARGE'],
    'Banking:Interest': ['INTEREST'],
    'Banking:Cashback': ['CASHBACK'],
    'Banking:Payment': ['PAYMENT', 'THANK YOU', 'GIRO'],
};
