import { z } from "zod";
import type {
  SmartFeature,
  SmartFeatureOperator,
  SmartFeatureResponse,
  SmartFeatureType,
} from "@/types/smart-features";
import { smartFeatureCategoryKey } from "./smartFeatureCategory.ts";

export { smartFeatureCategoryKey };

const smartFeatureTypes = [
  "enum",
  "boolean",
  "number",
  "range",
  "text",
  "exclusion",
] as const;

const smartFeatureOperators = [
  "equals",
  "not_equals",
  "includes",
  "not_includes",
  "lte",
  "gte",
  "between",
  "required",
] as const;

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value: string) {
  return normalize(value).replace(/\s+/g, "-");
}

function feature(
  name: string,
  description: string,
  type: SmartFeatureType,
  examples: string[],
  options: {
    commonlyImportant?: boolean;
    operators?: SmartFeatureOperator[];
    possibleValues?: string[];
    unit?: string;
  } = {},
): SmartFeature {
  return {
    id: slug(name),
    name,
    description,
    type,
    examples:
      examples.length >= 2
        ? examples
        : [examples[0] || name, `${examples[0] || name} required`],
    commonlyImportant: options.commonlyImportant ?? true,
    operators:
      options.operators ??
      (type === "boolean"
        ? ["required"]
        : type === "number" || type === "range"
          ? ["lte", "gte", "between", "equals"]
          : type === "exclusion"
            ? ["not_includes"]
            : ["equals"]),
    possibleValues: options.possibleValues ?? examples,
    unit: options.unit ?? "",
  };
}

const fallbackFeaturePacks: Record<string, SmartFeature[]> = {
  chair: [
    feature("Seat material", "The main upholstery or seat surface.", "enum", [
      "Fabric",
      "Leather",
      "Velvet",
    ]),
    feature("Back support", "Whether the chair has a back or lumbar support.", "boolean", [
      "Has back",
    ]),
    feature("Seat height", "Seat height from the floor.", "number", [
      "Under 20 in",
      "20 in or taller",
    ], { unit: "in" }),
    feature("Weight capacity", "Maximum supported user weight.", "number", [
      "At least 250 lb",
      "At least 300 lb",
    ], { unit: "lb" }),
    feature("Swivel", "Whether the chair can rotate.", "boolean", ["Swivel"]),
  ],
  couch: [
    feature("Color", "Available upholstery color.", "enum", [
      "Beige",
      "Gray",
      "Black",
      "White",
    ]),
    feature("Width", "Overall couch width.", "number", [
      "Under 84 in",
      "Under 64 in",
      "At least 90 in",
    ], { unit: "in" }),
    feature("Material", "Main upholstery material.", "enum", [
      "Fabric",
      "Leather",
      "Performance fabric",
    ]),
    feature("Sleeper", "Whether the couch converts for sleeping.", "boolean", [
      "Sleeper",
    ]),
    feature("Washable covers", "Whether cushion covers are removable or washable.", "boolean", [
      "Washable covers",
    ]),
  ],
  desk: [
    feature("Width", "Overall desktop width.", "number", [
      "Under 48 in",
      "48 to 60 in",
      "At least 60 in",
    ], { unit: "in" }),
    feature("Height adjustable", "Whether the desk height can be adjusted.", "boolean", [
      "Height adjustable",
    ]),
    feature("Material", "Desktop or frame material.", "enum", ["Wood", "Metal", "Glass"]),
    feature("Storage", "Built-in drawers, shelves, or cable storage.", "boolean", [
      "Built-in storage",
    ]),
    feature("Shape", "Desk shape or layout.", "enum", ["Rectangular", "L-shaped", "Corner"]),
  ],
  dryer: [
    feature("Capacity", "Drum capacity.", "number", [
      "At least 7 cu ft",
      "At least 8 cu ft",
    ], { unit: "cu ft" }),
    feature("Fuel type", "Dryer power source.", "enum", ["Electric", "Gas"]),
    feature("Stackable", "Whether it can stack with a matching washer.", "boolean", [
      "Stackable",
    ]),
    feature("Venting", "Vent style.", "enum", ["Vented", "Ventless"]),
    feature("Steam", "Steam cycle support.", "boolean", ["Steam"]),
  ],
  laptop: [
    feature("Screen size", "Display size.", "number", [
      "13 in",
      "14 in",
      "15.6 in",
      "16 in",
    ], { unit: "in" }),
    feature("RAM", "System memory.", "number", [
      "At least 16 GB",
      "At least 32 GB",
    ], { unit: "GB" }),
    feature("Storage", "Internal SSD storage.", "number", [
      "At least 512 GB",
      "At least 1 TB",
    ], { unit: "GB" }),
    feature("Battery life", "Advertised or reviewed battery life.", "number", [
      "At least 8 hours",
      "At least 12 hours",
    ], { unit: "hours" }),
    feature("GPU", "Graphics capability.", "enum", ["Integrated", "Dedicated GPU"]),
  ],
  mattress: [
    feature("Size", "Mattress size.", "enum", ["Twin", "Full", "Queen", "King"]),
    feature("Firmness", "Comfort feel.", "enum", ["Soft", "Medium", "Firm"]),
    feature("Material", "Main mattress construction.", "enum", [
      "Memory foam",
      "Hybrid",
      "Innerspring",
      "Latex",
    ]),
    feature("Cooling", "Cooling cover or heat-dissipation features.", "boolean", [
      "Cooling",
    ]),
    feature("Trial period", "In-home trial length.", "number", [
      "At least 90 days",
      "At least 365 days",
    ], { unit: "days" }),
  ],
  monitor: [
    feature("Screen size", "Display size.", "number", ["27 in", "32 in"], {
      unit: "in",
    }),
    feature("Resolution", "Native display resolution.", "enum", ["4K", "1440p", "1080p"]),
    feature("Refresh rate", "Maximum refresh rate.", "number", [
      "At least 60 Hz",
      "At least 144 Hz",
    ], { unit: "Hz" }),
    feature("USB-C", "USB-C display or power delivery support.", "boolean", ["USB-C"]),
    feature("Panel type", "Display panel technology.", "enum", ["IPS", "OLED", "VA"]),
  ],
  refrigerator: [
    feature("Width", "Overall refrigerator width.", "number", [
      "Under 36 in",
      "Under 33 in",
      "At least 36 in",
    ], { unit: "in" }),
    feature("Capacity", "Interior storage capacity.", "number", [
      "At least 20 cu ft",
      "At least 25 cu ft",
    ], { unit: "cu ft" }),
    feature("Finish", "Exterior finish.", "enum", [
      "Stainless steel",
      "Black stainless",
      "White",
    ]),
    feature("Counter-depth", "Shallower cabinet-depth design.", "boolean", [
      "Counter-depth",
    ]),
    feature("Garage ready", "Designed for wider garage temperature ranges.", "boolean", [
      "Garage ready",
    ]),
    feature("Ice maker", "Built-in ice maker or dispenser.", "boolean", ["Ice maker"]),
  ],
  tv: [
    feature("Screen size", "TV display size.", "number", [
      "55 in",
      "65 in",
      "75 in",
    ], { unit: "in" }),
    feature("Display type", "Panel or backlight technology.", "enum", [
      "OLED",
      "QLED",
      "Mini LED",
    ]),
    feature("Refresh rate", "Native panel refresh rate.", "number", [
      "At least 60 Hz",
      "At least 120 Hz",
    ], { unit: "Hz" }),
    feature("HDMI 2.1", "HDMI 2.1 gaming ports.", "boolean", ["HDMI 2.1"]),
    feature("Anti-glare", "Screen coating for bright rooms.", "boolean", ["Anti-glare"]),
  ],
  vacuum: [
    feature("Power source", "Corded or battery-powered design.", "enum", [
      "Cordless",
      "Corded",
    ]),
    feature("HEPA filter", "HEPA filtration support.", "boolean", ["HEPA filter"]),
    feature("Surface type", "Flooring type the vacuum should handle.", "enum", [
      "Carpet",
      "Hardwood",
      "Pet hair",
    ]),
    feature("Battery life", "Runtime for cordless models.", "number", [
      "At least 40 minutes",
      "At least 60 minutes",
    ], { unit: "minutes" }),
    feature("Weight", "Vacuum weight.", "number", ["Under 8 lb", "Under 12 lb"], {
      unit: "lb",
    }),
  ],
  washer: [
    feature("Capacity", "Washer drum capacity.", "number", [
      "At least 4.5 cu ft",
      "At least 5 cu ft",
    ], { unit: "cu ft" }),
    feature("Load type", "Washer loading style.", "enum", ["Front load", "Top load"]),
    feature("Stackable", "Whether it can stack with a matching dryer.", "boolean", [
      "Stackable",
    ]),
    feature("Steam", "Steam wash cycle support.", "boolean", ["Steam"]),
    feature("Impeller", "Impeller wash plate instead of agitator.", "boolean", [
      "Impeller",
    ]),
  ],
};

const smartFeatureTemplates: Record<string, SmartFeature[]> = {
  air_conditioner: [
    feature("Cooling capacity", "Cooling output for the room size.", "number", [
      "At least 8000 BTU",
      "At least 12000 BTU",
    ], { unit: "BTU" }),
    feature("Room size", "Recommended room coverage.", "number", [
      "At least 300 sq ft",
      "At least 500 sq ft",
    ], { unit: "sq ft" }),
    feature("Installation type", "How the unit installs.", "enum", [
      "Window",
      "Portable",
      "Through-wall",
    ]),
    feature("Noise level", "Operating loudness.", "number", [
      "Under 55 dB",
      "Under 60 dB",
    ], { unit: "dB" }),
    feature("Smart controls", "Wi-Fi or app control support.", "boolean", [
      "Smart controls",
    ]),
    feature("Energy efficiency", "Energy Star or efficiency rating.", "enum", [
      "Energy Star",
      "High efficiency",
    ]),
  ],
  audio: [
    feature("Connection type", "How the audio device connects.", "enum", [
      "Bluetooth",
      "Wi-Fi",
      "Wired",
    ]),
    feature("Noise cancellation", "Active noise cancellation support.", "boolean", [
      "Noise cancellation",
    ]),
    feature("Battery life", "Runtime for portable models.", "number", [
      "At least 20 hours",
      "At least 40 hours",
    ], { unit: "hours" }),
    feature("Water resistance", "Splash or water resistance rating.", "enum", [
      "IPX4",
      "IPX7",
      "Water resistant",
    ]),
    feature("Microphone", "Built-in microphone support.", "boolean", ["Microphone"]),
    feature("Spatial audio", "Surround or spatial audio support.", "boolean", [
      "Spatial audio",
    ]),
  ],
  baby_car_seat: [
    feature("Seat type", "Car seat stage or format.", "enum", [
      "Infant",
      "Convertible",
      "Booster",
    ]),
    feature("Rear-facing limit", "Maximum rear-facing weight.", "number", [
      "At least 40 lb",
      "At least 50 lb",
    ], { unit: "lb" }),
    feature("Installation", "Latch or belt installation style.", "enum", [
      "Latch",
      "Seat belt",
      "Load leg",
    ]),
    feature("Width", "Seat width for fitting multiple seats.", "number", [
      "Under 18 in",
      "Under 20 in",
    ], { unit: "in" }),
    feature("No-rethread harness", "Harness adjusts without rethreading.", "boolean", [
      "No-rethread harness",
    ]),
    feature("Machine-washable cover", "Cover can be removed and washed.", "boolean", [
      "Machine-washable cover",
    ]),
  ],
  baby_stroller: [
    feature("Stroller type", "Primary stroller format.", "enum", [
      "Travel system",
      "Lightweight",
      "Jogging",
    ]),
    feature("Fold style", "How the stroller folds.", "enum", [
      "One-hand fold",
      "Compact fold",
    ]),
    feature("Weight", "Stroller weight.", "number", [
      "Under 15 lb",
      "Under 25 lb",
    ], { unit: "lb" }),
    feature("Car seat compatible", "Supports infant car seats.", "boolean", [
      "Car seat compatible",
    ]),
    feature("Storage basket", "Large under-seat storage.", "boolean", [
      "Storage basket",
    ]),
    feature("Terrain", "Surface type the stroller handles.", "enum", [
      "City",
      "All-terrain",
      "Jogging",
    ]),
  ],
  blender: [
    feature("Power", "Motor power.", "number", [
      "At least 800 watts",
      "At least 1200 watts",
    ], { unit: "watts" }),
    feature("Jar capacity", "Blending jar capacity.", "number", [
      "At least 48 oz",
      "At least 64 oz",
    ], { unit: "oz" }),
    feature("Use case", "Primary blending job.", "enum", [
      "Smoothies",
      "Ice crushing",
      "Hot soup",
    ]),
    feature("Dishwasher-safe parts", "Removable parts are dishwasher safe.", "boolean", [
      "Dishwasher-safe parts",
    ]),
    feature("Personal cup", "Includes personal blending cup.", "boolean", [
      "Personal cup",
    ]),
    feature("Noise level", "Lower-noise blending.", "enum", ["Quiet", "Lower noise"]),
  ],
  carpet_cleaner: [
    feature("Cleaning type", "Cleaning method.", "enum", [
      "Wet extraction",
      "Spot cleaner",
      "Steam",
    ]),
    feature("Surface type", "Surface the cleaner should handle.", "enum", [
      "Carpet",
      "Upholstery",
      "High-pile carpet",
    ]),
    feature("Tank capacity", "Clean water tank capacity.", "number", [
      "At least 0.5 gal",
      "At least 1 gal",
    ], { unit: "gal" }),
    feature("Cordless", "Battery-powered cleaning.", "boolean", ["Cordless"]),
    feature("Pet tool", "Includes pet stain or hair tool.", "boolean", ["Pet tool"]),
    feature("Weight", "Machine weight.", "number", ["Under 15 lb", "Under 25 lb"], {
      unit: "lb",
    }),
  ],
  camera: [
    feature("Camera type", "Camera body or format.", "enum", [
      "Mirrorless",
      "DSLR",
      "Point-and-shoot",
    ]),
    feature("Sensor size", "Sensor format.", "enum", [
      "Full frame",
      "APS-C",
      "Micro Four Thirds",
    ]),
    feature("Video resolution", "Maximum video recording resolution.", "enum", [
      "4K",
      "6K",
      "8K",
    ]),
    feature("Stabilization", "In-body or optical stabilization.", "boolean", [
      "Stabilization",
    ]),
    feature("Lens mount", "Compatible lens mount.", "text", [
      "Sony E",
      "Canon RF",
    ]),
    feature("Weather sealing", "Dust or moisture resistance.", "boolean", [
      "Weather sealing",
    ]),
  ],
  cookware: [
    feature("Material", "Cookware construction.", "enum", [
      "Stainless steel",
      "Nonstick",
      "Cast iron",
    ]),
    feature("Piece count", "Number of included pieces.", "number", [
      "At least 10 pieces",
      "At least 12 pieces",
    ], { unit: "pieces" }),
    feature("Induction compatible", "Works on induction cooktops.", "boolean", [
      "Induction compatible",
    ]),
    feature("Oven safe temperature", "Maximum oven-safe temperature.", "number", [
      "At least 400 F",
      "At least 500 F",
    ], { unit: "F" }),
    feature("Dishwasher safe", "Can go in the dishwasher.", "boolean", [
      "Dishwasher safe",
    ]),
    feature("Lid material", "Lid construction.", "enum", ["Glass lids", "Metal lids"]),
  ],
  crib: [
    feature("Convertible", "Converts to toddler or full bed.", "boolean", [
      "Convertible",
    ]),
    feature("Mattress height positions", "Adjustable mattress support levels.", "number", [
      "At least 3 positions",
      "At least 4 positions",
    ], { unit: "positions" }),
    feature("Material", "Crib construction material.", "enum", [
      "Solid wood",
      "Metal",
    ]),
    feature("Certification", "Safety certification.", "enum", [
      "Greenguard Gold",
      "JPMA",
    ]),
    feature("Storage", "Built-in drawer or storage.", "boolean", ["Storage"]),
    feature("Finish", "Crib finish color.", "enum", ["White", "Natural", "Gray"]),
  ],
  dishwasher: [
    feature("Width", "Dishwasher width.", "number", [
      "18 in",
      "24 in",
    ], { unit: "in" }),
    feature("Noise level", "Operating loudness.", "number", [
      "Under 45 dB",
      "Under 50 dB",
    ], { unit: "dB" }),
    feature("Tub material", "Interior tub material.", "enum", [
      "Stainless steel",
      "Plastic",
    ]),
    feature("Third rack", "Has a third rack.", "boolean", ["Third rack"]),
    feature("Finish", "Exterior finish.", "enum", [
      "Stainless steel",
      "Black",
      "White",
    ]),
    feature("Energy Star", "Energy Star certification.", "boolean", ["Energy Star"]),
  ],
  display: [
    feature("Screen size", "Display size.", "number", ["27 in", "32 in", "65 in"], {
      unit: "in",
    }),
    feature("Resolution", "Native display resolution.", "enum", ["4K", "1440p", "1080p"]),
    feature("Refresh rate", "Maximum refresh rate.", "number", [
      "At least 60 Hz",
      "At least 120 Hz",
      "At least 144 Hz",
    ], { unit: "Hz" }),
    feature("Panel type", "Display panel technology.", "enum", [
      "OLED",
      "IPS",
      "Mini LED",
      "VA",
    ]),
    feature("HDR", "HDR format support.", "boolean", ["HDR"]),
    feature("Anti-glare", "Screen coating for bright rooms.", "boolean", ["Anti-glare"]),
  ],
  dog_crate: [
    feature("Size", "Crate size.", "enum", ["Small", "Medium", "Large", "XL"]),
    feature("Length", "Crate length.", "number", [
      "At least 36 in",
      "At least 42 in",
    ], { unit: "in" }),
    feature("Material", "Crate construction.", "enum", ["Wire", "Plastic", "Wood"]),
    feature("Foldable", "Folds flat for storage.", "boolean", ["Foldable"]),
    feature("Divider panel", "Includes divider panel.", "boolean", ["Divider panel"]),
    feature("Double door", "Two-door access.", "boolean", ["Double door"]),
  ],
  furniture_seating: [
    feature("Color", "Available color or upholstery color.", "enum", [
      "Beige",
      "Gray",
      "Black",
      "White",
    ]),
    feature("Width", "Overall width.", "number", [
      "Under 24 in",
      "Under 64 in",
      "Under 84 in",
    ], { unit: "in" }),
    feature("Material", "Main material or upholstery.", "enum", [
      "Fabric",
      "Leather",
      "Velvet",
      "Wood",
    ]),
    feature("Back support", "Backrest or support style.", "boolean", ["Has back"]),
    feature("Seat height", "Seat height from floor.", "number", [
      "Under 20 in",
      "At least 18 in",
    ], { unit: "in" }),
    feature("Weight capacity", "Maximum supported weight.", "number", [
      "At least 250 lb",
      "At least 300 lb",
    ], { unit: "lb" }),
  ],
  generator: [
    feature("Running watts", "Continuous power output.", "number", [
      "At least 3000 watts",
      "At least 7000 watts",
    ], { unit: "watts" }),
    feature("Fuel type", "Generator fuel source.", "enum", [
      "Gas",
      "Dual fuel",
      "Solar",
    ]),
    feature("Inverter", "Inverter power output.", "boolean", ["Inverter"]),
    feature("Noise level", "Operating loudness.", "number", [
      "Under 60 dB",
      "Under 70 dB",
    ], { unit: "dB" }),
    feature("Electric start", "Push-button or key start.", "boolean", [
      "Electric start",
    ]),
    feature("Transfer switch ready", "Home backup transfer switch support.", "boolean", [
      "Transfer switch ready",
    ]),
  ],
  grill: [
    feature("Fuel type", "Grill fuel source.", "enum", [
      "Gas",
      "Charcoal",
      "Pellet",
      "Electric",
    ]),
    feature("Cooking area", "Total cooking surface.", "number", [
      "At least 400 sq in",
      "At least 600 sq in",
    ], { unit: "sq in" }),
    feature("Burner count", "Number of burners.", "number", [
      "At least 3 burners",
      "At least 4 burners",
    ], { unit: "burners" }),
    feature("Side burner", "Includes side burner.", "boolean", ["Side burner"]),
    feature("Portable", "Portable or tabletop design.", "boolean", ["Portable"]),
    feature("Material", "Grill body or grate material.", "enum", [
      "Stainless steel",
      "Cast iron grates",
    ]),
  ],
  keyboard: [
    feature("Switch type", "Keyboard switch feel.", "enum", [
      "Mechanical",
      "Membrane",
      "Low-profile",
    ]),
    feature("Layout", "Keyboard layout size.", "enum", [
      "Full-size",
      "TKL",
      "75%",
      "60%",
    ]),
    feature("Connection type", "Wired or wireless connection.", "enum", [
      "Wired",
      "Bluetooth",
      "2.4 GHz wireless",
    ]),
    feature("Backlighting", "Key lighting support.", "boolean", ["Backlighting"]),
    feature("Hot-swappable", "Switches can be swapped.", "boolean", ["Hot-swappable"]),
    feature("Mac compatible", "Mac layout or compatibility.", "boolean", [
      "Mac compatible",
    ]),
  ],
  kitchen_small_appliance: [
    feature("Capacity", "Usable cooking or container capacity.", "number", [
      "At least 4 qt",
      "At least 6 qt",
    ]),
    feature("Power", "Motor or heating power.", "number", [
      "At least 800 watts",
      "At least 1500 watts",
    ], { unit: "watts" }),
    feature("Dishwasher-safe parts", "Removable parts are dishwasher safe.", "boolean", [
      "Dishwasher-safe parts",
    ]),
    feature("Preset programs", "Built-in cooking or blending presets.", "boolean", [
      "Preset programs",
    ]),
    feature("Footprint", "Countertop footprint.", "enum", ["Compact", "Full size"]),
    feature("Color", "Exterior color.", "enum", ["Black", "White", "Stainless steel"]),
  ],
  ladder: [
    feature("Height", "Maximum ladder height.", "number", [
      "At least 6 ft",
      "At least 12 ft",
    ], { unit: "ft" }),
    feature("Type", "Ladder style.", "enum", [
      "Step ladder",
      "Extension ladder",
      "Multi-position",
    ]),
    feature("Weight capacity", "Load rating.", "number", [
      "At least 250 lb",
      "At least 300 lb",
    ], { unit: "lb" }),
    feature("Material", "Ladder material.", "enum", ["Aluminum", "Fiberglass"]),
    feature("Foldable", "Folds for storage.", "boolean", ["Foldable"]),
    feature("Reach height", "Approximate maximum reach.", "number", [
      "At least 10 ft",
      "At least 16 ft",
    ], { unit: "ft" }),
  ],
  mini_fridge: [
    feature("Capacity", "Interior storage capacity.", "number", [
      "At least 3 cu ft",
      "At least 7 cu ft",
    ], { unit: "cu ft" }),
    feature("Width", "Overall width.", "number", ["Under 20 in", "Under 24 in"], {
      unit: "in",
    }),
    feature("Freezer", "Includes freezer compartment.", "boolean", ["Freezer"]),
    feature("Finish", "Exterior finish or color.", "enum", [
      "Red",
      "Black",
      "White",
      "Stainless steel",
    ]),
    feature("Door style", "Door layout.", "enum", ["Single door", "Two-door"]),
    feature("Energy Star", "Energy Star certification.", "boolean", ["Energy Star"]),
  ],
  mouse: [
    feature("Connection type", "Wired or wireless connection.", "enum", [
      "Wired",
      "Bluetooth",
      "2.4 GHz wireless",
    ]),
    feature("Use case", "Primary mouse use.", "enum", [
      "Gaming",
      "Office",
      "Travel",
      "Ergonomic",
    ]),
    feature("DPI", "Sensor sensitivity.", "number", [
      "At least 8000 DPI",
      "At least 16000 DPI",
    ], { unit: "DPI" }),
    feature("Handedness", "Mouse shape.", "enum", ["Right-handed", "Left-handed", "Ambidextrous"]),
    feature("Rechargeable", "Built-in rechargeable battery.", "boolean", ["Rechargeable"]),
    feature("Programmable buttons", "Extra programmable buttons.", "boolean", [
      "Programmable buttons",
    ]),
  ],
  outdoor_power: [
    feature("Power source", "Gas, corded, or battery power.", "enum", [
      "Battery",
      "Gas",
      "Corded electric",
    ]),
    feature("Runtime", "Battery runtime or work time.", "number", [
      "At least 30 minutes",
      "At least 60 minutes",
    ], { unit: "minutes" }),
    feature("Clearing width", "Cutting or clearing width.", "number", [
      "At least 20 in",
      "At least 24 in",
    ], { unit: "in" }),
    feature("Self-propelled", "Drive assistance.", "boolean", ["Self-propelled"]),
    feature("Brushless motor", "Brushless motor design.", "boolean", [
      "Brushless motor",
    ]),
    feature("Weight", "Tool weight.", "number", ["Under 40 lb", "Under 80 lb"], {
      unit: "lb",
    }),
  ],
  patio_furniture: [
    feature("Material", "Frame or surface material.", "enum", [
      "Aluminum",
      "Steel",
      "Wicker",
      "Wood",
    ]),
    feature("Seating capacity", "Number of seats.", "number", [
      "At least 2 seats",
      "At least 6 seats",
    ], { unit: "seats" }),
    feature("Cushions included", "Includes cushions.", "boolean", [
      "Cushions included",
    ]),
    feature("Weather resistant", "Outdoor weather resistance.", "boolean", [
      "Weather resistant",
    ]),
    feature("Table shape", "Patio table shape.", "enum", ["Round", "Rectangular", "Square"]),
    feature("Foldable", "Folds or stacks for storage.", "boolean", ["Foldable"]),
  ],
  pet_bed: [
    feature("Pet size", "Pet size compatibility.", "enum", [
      "Small",
      "Medium",
      "Large",
      "XL",
    ]),
    feature("Washable cover", "Cover can be removed and washed.", "boolean", [
      "Washable cover",
    ]),
    feature("Support type", "Bed support construction.", "enum", [
      "Orthopedic",
      "Bolster",
      "Cooling",
    ]),
    feature("Length", "Bed length.", "number", [
      "At least 30 in",
      "At least 40 in",
    ], { unit: "in" }),
    feature("Water resistant", "Water-resistant liner or cover.", "boolean", [
      "Water resistant",
    ]),
    feature("Chew resistant", "Designed to resist chewing.", "boolean", [
      "Chew resistant",
    ]),
  ],
  power_tool: [
    feature("Power source", "Corded or battery-powered design.", "enum", [
      "Cordless",
      "Corded",
    ]),
    feature("Voltage", "Battery platform voltage.", "number", [
      "At least 12 V",
      "At least 20 V",
    ], { unit: "V" }),
    feature("Brushless motor", "Brushless motor design.", "boolean", [
      "Brushless motor",
    ]),
    feature("Battery included", "Includes battery in the kit.", "boolean", [
      "Battery included",
    ]),
    feature("Chuck size", "Chuck or bit size.", "enum", ["1/4 in", "3/8 in", "1/2 in"]),
    feature("Tool only", "Bare tool without battery.", "boolean", ["Tool only"]),
  ],
  printer: [
    feature("Printer type", "Print technology.", "enum", [
      "Inkjet",
      "Laser",
      "Photo",
    ]),
    feature("Color printing", "Supports color printing.", "boolean", [
      "Color printing",
    ]),
    feature("Duplex printing", "Automatic two-sided printing.", "boolean", [
      "Duplex printing",
    ]),
    feature("Scanner", "Includes scanner.", "boolean", ["Scanner"]),
    feature("Connectivity", "Connection options.", "enum", ["Wi-Fi", "USB", "Ethernet"]),
    feature("Monthly page volume", "Recommended monthly print volume.", "number", [
      "At least 500 pages",
      "At least 2000 pages",
    ], { unit: "pages" }),
  ],
  projector: [
    feature("Resolution", "Native projector resolution.", "enum", ["1080p", "4K"]),
    feature("Brightness", "Light output.", "number", [
      "At least 1000 lumens",
      "At least 2500 lumens",
    ], { unit: "lumens" }),
    feature("Throw type", "Projection throw distance.", "enum", [
      "Short throw",
      "Ultra short throw",
      "Standard throw",
    ]),
    feature("Portable", "Easy to move or battery powered.", "boolean", ["Portable"]),
    feature("Input", "Video input support.", "enum", ["HDMI", "USB-C", "Wireless"]),
    feature("Built-in speakers", "Integrated speaker support.", "boolean", [
      "Built-in speakers",
    ]),
  ],
  router: [
    feature("Wi-Fi standard", "Wireless generation.", "enum", [
      "Wi-Fi 6",
      "Wi-Fi 6E",
      "Wi-Fi 7",
    ]),
    feature("Coverage", "Recommended coverage area.", "number", [
      "At least 1500 sq ft",
      "At least 3000 sq ft",
    ], { unit: "sq ft" }),
    feature("Mesh support", "Mesh network support.", "boolean", ["Mesh support"]),
    feature("Ethernet ports", "Number of Ethernet ports.", "number", [
      "At least 3 ports",
      "At least 4 ports",
    ], { unit: "ports" }),
    feature("Multi-gig port", "2.5Gbps or faster port.", "boolean", ["Multi-gig port"]),
    feature("Parental controls", "Built-in parental controls.", "boolean", [
      "Parental controls",
    ]),
  ],
  saw: [
    feature("Saw type", "Type of saw.", "enum", [
      "Circular saw",
      "Miter saw",
      "Table saw",
      "Reciprocating saw",
    ]),
    feature("Power source", "Corded or battery power.", "enum", [
      "Cordless",
      "Corded",
    ]),
    feature("Blade size", "Blade diameter.", "number", [
      "6.5 in",
      "7.25 in",
      "10 in",
    ], { unit: "in" }),
    feature("Brushless motor", "Brushless motor design.", "boolean", [
      "Brushless motor",
    ]),
    feature("Battery included", "Includes battery in kit.", "boolean", [
      "Battery included",
    ]),
    feature("Dust collection", "Dust port or collection support.", "boolean", [
      "Dust collection",
    ]),
  ],
  shelving: [
    feature("Width", "Overall width.", "number", ["Under 36 in", "At least 48 in"], {
      unit: "in",
    }),
    feature("Height", "Overall height.", "number", ["Under 72 in", "At least 72 in"], {
      unit: "in",
    }),
    feature("Material", "Shelf construction.", "enum", ["Wood", "Metal", "Glass"]),
    feature("Shelf count", "Number of shelves.", "number", [
      "At least 3 shelves",
      "At least 5 shelves",
    ], { unit: "shelves" }),
    feature("Weight capacity", "Supported shelf weight.", "number", [
      "At least 50 lb",
      "At least 200 lb",
    ], { unit: "lb" }),
    feature("Adjustable shelves", "Shelf positions can be adjusted.", "boolean", [
      "Adjustable shelves",
    ]),
  ],
  shoe_storage: [
    feature("Pair capacity", "Number of shoe pairs it holds.", "number", [
      "At least 12 pairs",
      "At least 24 pairs",
    ], { unit: "pairs" }),
    feature("Width", "Overall width.", "number", ["Under 36 in", "Under 48 in"], {
      unit: "in",
    }),
    feature("Material", "Storage material.", "enum", ["Wood", "Metal", "Fabric"]),
    feature("Closed storage", "Doors or covered storage.", "boolean", [
      "Closed storage",
    ]),
    feature("Bench", "Includes a sitting bench.", "boolean", ["Bench"]),
    feature("Stackable", "Can be stacked.", "boolean", ["Stackable"]),
  ],
  tablet: [
    feature("Screen size", "Display size.", "number", ["8 in", "10 in", "12.9 in"], {
      unit: "in",
    }),
    feature("Storage", "Internal storage.", "number", [
      "At least 64 GB",
      "At least 256 GB",
    ], { unit: "GB" }),
    feature("Cellular", "Cellular data support.", "boolean", ["Cellular"]),
    feature("Stylus support", "Pen or stylus support.", "boolean", ["Stylus support"]),
    feature("Keyboard support", "Keyboard case support.", "boolean", [
      "Keyboard support",
    ]),
    feature("Battery life", "Advertised battery life.", "number", [
      "At least 8 hours",
      "At least 10 hours",
    ], { unit: "hours" }),
  ],
  tool_storage: [
    feature("Drawer count", "Number of drawers.", "number", [
      "At least 5 drawers",
      "At least 10 drawers",
    ], { unit: "drawers" }),
    feature("Width", "Overall width.", "number", ["Under 42 in", "At least 52 in"], {
      unit: "in",
    }),
    feature("Material", "Cabinet material.", "enum", ["Steel", "Plastic"]),
    feature("Locking", "Lockable storage.", "boolean", ["Locking"]),
    feature("Wheels", "Casters or wheels.", "boolean", ["Wheels"]),
    feature("Weight capacity", "Total load capacity.", "number", [
      "At least 500 lb",
      "At least 1000 lb",
    ], { unit: "lb" }),
  ],
  trash_can: [
    feature("Capacity", "Trash can capacity.", "number", [
      "At least 10 gal",
      "At least 13 gal",
    ], { unit: "gal" }),
    feature("Opening type", "How the lid opens.", "enum", [
      "Step",
      "Touchless",
      "Swing top",
    ]),
    feature("Material", "Can material.", "enum", ["Stainless steel", "Plastic"]),
    feature("Slim design", "Narrow footprint.", "boolean", ["Slim design"]),
    feature("Dual compartment", "Separate trash and recycling bins.", "boolean", [
      "Dual compartment",
    ]),
    feature("Odor control", "Odor filter or sealed lid.", "boolean", ["Odor control"]),
  ],
  water_filter: [
    feature("Filter type", "Water filter format.", "enum", [
      "Pitcher",
      "Faucet-mounted",
      "Under-sink",
    ]),
    feature("Contaminant reduction", "Target contaminants.", "enum", [
      "Lead",
      "PFAS",
      "Chlorine",
    ]),
    feature("Capacity", "Filtered water capacity.", "number", [
      "At least 10 cups",
      "At least 2 gallons",
    ]),
    feature("Filter life", "Filter replacement interval.", "number", [
      "At least 2 months",
      "At least 6 months",
    ], { unit: "months" }),
    feature("NSF certified", "NSF or ANSI certification.", "boolean", [
      "NSF certified",
    ]),
    feature("Installation required", "Requires installation.", "boolean", [
      "Installation required",
    ]),
  ],
  wine_fridge: [
    feature("Bottle capacity", "Number of bottles it holds.", "number", [
      "At least 18 bottles",
      "At least 30 bottles",
    ], { unit: "bottles" }),
    feature("Width", "Overall width.", "number", ["Under 15 in", "Under 24 in"], {
      unit: "in",
    }),
    feature("Temperature zones", "Single or dual zone cooling.", "enum", [
      "Single zone",
      "Dual zone",
    ]),
    feature("Built-in capable", "Can be installed under counter.", "boolean", [
      "Built-in capable",
    ]),
    feature("Door style", "Door glass or frame style.", "enum", [
      "Glass door",
      "Stainless trim",
    ]),
    feature("Noise level", "Operating loudness.", "number", [
      "Under 40 dB",
      "Under 45 dB",
    ], { unit: "dB" }),
  ],
};

Object.assign(fallbackFeaturePacks, {
  "air conditioner": smartFeatureTemplates.air_conditioner,
  "air purifier": [
    feature("Room size", "Recommended room coverage.", "number", [
      "At least 300 sq ft",
      "At least 500 sq ft",
    ], { unit: "sq ft" }),
    feature("Filter type", "Primary filtration type.", "enum", [
      "HEPA",
      "Carbon filter",
      "Washable pre-filter",
    ]),
    feature("CADR", "Clean air delivery rate.", "number", [
      "At least 200 CADR",
      "At least 300 CADR",
    ], { unit: "CADR" }),
    feature("Noise level", "Operating loudness.", "number", [
      "Under 50 dB",
      "Under 60 dB",
    ], { unit: "dB" }),
    feature("Smart controls", "Wi-Fi or app control support.", "boolean", [
      "Smart controls",
    ]),
    feature("Pet odor", "Designed to help with pet odors.", "boolean", ["Pet odor"]),
  ],
  blender: smartFeatureTemplates.blender,
  bookcase: smartFeatureTemplates.shelving,
  camera: smartFeatureTemplates.camera,
  "car seat": smartFeatureTemplates.baby_car_seat,
  "carpet cleaner": smartFeatureTemplates.carpet_cleaner,
  "cat tree": [
    feature("Height", "Overall tower height.", "number", [
      "At least 48 in",
      "At least 60 in",
    ], { unit: "in" }),
    feature("Cat size", "Suitable cat size.", "enum", ["Kitten", "Adult", "Large cats"]),
    feature("Scratching posts", "Includes scratching posts.", "boolean", [
      "Scratching posts",
    ]),
    feature("Condo", "Enclosed hideaway condo.", "boolean", ["Condo"]),
    feature("Material", "Covering material.", "enum", ["Carpet", "Faux fur", "Sisal"]),
    feature("Stability", "Wall anchor or anti-tip support.", "boolean", ["Wall anchor"]),
  ],
  "coffee maker": [
    feature("Brew type", "Coffee maker style.", "enum", [
      "Drip",
      "Single serve",
      "Espresso",
      "Cold brew",
    ]),
    feature("Capacity", "Carafe or reservoir capacity.", "number", [
      "At least 10 cups",
      "At least 12 cups",
    ], { unit: "cups" }),
    feature("Programmable", "Programmable brew time.", "boolean", ["Programmable"]),
    feature("Built-in grinder", "Includes grinder.", "boolean", ["Built-in grinder"]),
    feature("Thermal carafe", "Insulated thermal carafe.", "boolean", [
      "Thermal carafe",
    ]),
    feature("Footprint", "Countertop footprint.", "enum", ["Compact", "Full size"]),
  ],
  cookware: smartFeatureTemplates.cookware,
  "cookware set": smartFeatureTemplates.cookware,
  crib: smartFeatureTemplates.crib,
  dehumidifier: [
    feature("Capacity", "Moisture removal capacity.", "number", [
      "At least 35 pints",
      "At least 50 pints",
    ], { unit: "pints" }),
    feature("Room size", "Recommended room coverage.", "number", [
      "At least 1500 sq ft",
      "At least 3000 sq ft",
    ], { unit: "sq ft" }),
    feature("Pump", "Built-in pump for drainage.", "boolean", ["Pump"]),
    feature("Drain hose", "Continuous drain support.", "boolean", ["Drain hose"]),
    feature("Noise level", "Operating loudness.", "number", [
      "Under 50 dB",
      "Under 55 dB",
    ], { unit: "dB" }),
    feature("Energy Star", "Energy Star certification.", "boolean", ["Energy Star"]),
  ],
  dishwasher: smartFeatureTemplates.dishwasher,
  "dog bed": smartFeatureTemplates.pet_bed,
  "dog crate": smartFeatureTemplates.dog_crate,
  drill: smartFeatureTemplates.power_tool,
  "espresso machine": [
    feature("Machine type", "Espresso machine style.", "enum", [
      "Manual",
      "Semi-automatic",
      "Super-automatic",
    ]),
    feature("Grinder", "Built-in grinder.", "boolean", ["Built-in grinder"]),
    feature("Milk frother", "Steam wand or frother.", "boolean", ["Milk frother"]),
    feature("Pressure", "Pump pressure.", "number", ["At least 9 bar", "At least 15 bar"], {
      unit: "bar",
    }),
    feature("Water reservoir", "Reservoir capacity.", "number", [
      "At least 40 oz",
      "At least 60 oz",
    ], { unit: "oz" }),
    feature("Footprint", "Countertop footprint.", "enum", ["Compact", "Full size"]),
  ],
  "food processor": [
    feature("Capacity", "Bowl capacity.", "number", [
      "At least 8 cups",
      "At least 12 cups",
    ], { unit: "cups" }),
    feature("Power", "Motor power.", "number", [
      "At least 500 watts",
      "At least 700 watts",
    ], { unit: "watts" }),
    feature("Blade attachments", "Included blade types.", "enum", [
      "Slicing disc",
      "Shredding disc",
      "Dough blade",
    ]),
    feature("Dishwasher-safe parts", "Removable parts are dishwasher safe.", "boolean", [
      "Dishwasher-safe parts",
    ]),
    feature("Feed tube", "Feed tube size.", "enum", ["Wide feed tube", "Standard feed tube"]),
    feature("Storage case", "Includes accessory storage.", "boolean", ["Storage case"]),
  ],
  generator: smartFeatureTemplates.generator,
  grill: smartFeatureTemplates.grill,
  headphones: smartFeatureTemplates.audio,
  "impact driver": smartFeatureTemplates.power_tool,
  keyboard: smartFeatureTemplates.keyboard,
  "knife set": [
    feature("Blade material", "Knife blade material.", "enum", [
      "German steel",
      "Japanese steel",
      "Ceramic",
    ]),
    feature("Piece count", "Number of knives or tools included.", "number", [
      "At least 6 pieces",
      "At least 15 pieces",
    ], { unit: "pieces" }),
    feature("Block included", "Storage block included.", "boolean", ["Block included"]),
    feature("Dishwasher safe", "Safe for dishwasher cleaning.", "boolean", [
      "Dishwasher safe",
    ]),
    feature("Knife types", "Included knife types.", "enum", [
      "Chef knife",
      "Santoku",
      "Steak knives",
    ]),
    feature("Handle material", "Handle construction.", "enum", ["Wood", "Composite", "Steel"]),
  ],
  ladder: smartFeatureTemplates.ladder,
  "lawn mower": smartFeatureTemplates.outdoor_power,
  "leaf blower": smartFeatureTemplates.outdoor_power,
  loveseat: fallbackFeaturePacks.couch,
  "mini fridge": smartFeatureTemplates.mini_fridge,
  microwave: [
    feature("Installation type", "Microwave installation format.", "enum", [
      "Countertop",
      "Over-the-range",
      "Built-in",
    ]),
    feature("Capacity", "Interior cooking capacity.", "number", [
      "At least 1.1 cu ft",
      "At least 1.7 cu ft",
    ], { unit: "cu ft" }),
    feature("Wattage", "Cooking power.", "number", [
      "At least 900 watts",
      "At least 1000 watts",
    ], { unit: "watts" }),
    feature("Finish", "Exterior finish.", "enum", [
      "Stainless steel",
      "Black",
      "White",
    ]),
    feature("Sensor cooking", "Automatic sensor cooking support.", "boolean", [
      "Sensor cooking",
    ]),
    feature("Width", "Overall microwave width.", "number", [
      "Under 24 in",
      "Under 30 in",
    ], { unit: "in" }),
  ],
  mouse: smartFeatureTemplates.mouse,
  nightstand: [
    feature("Width", "Overall width.", "number", ["Under 20 in", "Under 28 in"], {
      unit: "in",
    }),
    feature("Drawer count", "Number of drawers.", "number", [
      "At least 1 drawer",
      "At least 2 drawers",
    ], { unit: "drawers" }),
    feature("Material", "Nightstand material.", "enum", ["Wood", "Metal", "Rattan"]),
    feature("Color", "Finish color.", "enum", ["White", "Black", "Natural", "Gray"]),
    feature("Charging port", "Built-in USB or outlet.", "boolean", ["Charging port"]),
    feature("Open shelf", "Includes open shelf.", "boolean", ["Open shelf"]),
  ],
  oven: [
    feature("Fuel type", "Oven or range fuel source.", "enum", ["Electric", "Gas", "Dual fuel"]),
    feature("Width", "Appliance width.", "number", ["24 in", "30 in", "36 in"], {
      unit: "in",
    }),
    feature("Configuration", "Cooking appliance format.", "enum", [
      "Wall oven",
      "Range",
      "Double oven",
    ]),
    feature("Convection", "Convection cooking support.", "boolean", ["Convection"]),
    feature("Air fry", "Built-in air fry mode.", "boolean", ["Air fry"]),
    feature("Finish", "Exterior finish.", "enum", ["Stainless steel", "Black", "White"]),
  ],
  "office chair": [
    feature("Back support", "Lumbar or ergonomic back support.", "boolean", [
      "Lumbar support",
    ]),
    feature("Adjustability", "Adjustable chair settings.", "enum", [
      "Adjustable arms",
      "Adjustable lumbar",
      "Seat tilt",
    ]),
    feature("Seat material", "Seat upholstery or support material.", "enum", [
      "Mesh",
      "Fabric",
      "Leather",
    ]),
    feature("Seat height", "Seat height range.", "number", [
      "Under 20 in",
      "At least 20 in",
    ], { unit: "in" }),
    feature("Weight capacity", "Maximum supported user weight.", "number", [
      "At least 250 lb",
      "At least 300 lb",
    ], { unit: "lb" }),
    feature("Headrest", "Includes a headrest.", "boolean", ["Headrest"]),
  ],
  "patio chair": smartFeatureTemplates.patio_furniture,
  "patio table": smartFeatureTemplates.patio_furniture,
  pressure_washer: [
    feature("Pressure", "Water pressure.", "number", [
      "At least 2000 PSI",
      "At least 3000 PSI",
    ], { unit: "PSI" }),
    feature("Flow rate", "Water flow rate.", "number", [
      "At least 1.5 GPM",
      "At least 2.5 GPM",
    ], { unit: "GPM" }),
    feature("Power source", "Gas or electric power.", "enum", ["Electric", "Gas"]),
    feature("Hose length", "Included hose length.", "number", [
      "At least 20 ft",
      "At least 25 ft",
    ], { unit: "ft" }),
    feature("Wheeled", "Has wheels for moving.", "boolean", ["Wheeled"]),
    feature("Soap tank", "Built-in detergent tank.", "boolean", ["Soap tank"]),
  ],
  printer: smartFeatureTemplates.printer,
  projector: smartFeatureTemplates.projector,
  recliner: [
    feature("Upholstery", "Main upholstery material.", "enum", [
      "Fabric",
      "Leather",
      "Faux leather",
    ]),
    feature("Power recline", "Motorized reclining.", "boolean", ["Power recline"]),
    feature("Width", "Overall width.", "number", ["Under 32 in", "Under 40 in"], {
      unit: "in",
    }),
    feature("Weight capacity", "Maximum supported user weight.", "number", [
      "At least 250 lb",
      "At least 350 lb",
    ], { unit: "lb" }),
    feature("Massage and heat", "Massage or heating functions.", "boolean", [
      "Massage and heat",
    ]),
    feature("Wall hugger", "Requires less wall clearance.", "boolean", ["Wall hugger"]),
  ],
  router: smartFeatureTemplates.router,
  saw: smartFeatureTemplates.saw,
  sectional: [
    feature("Color", "Available upholstery color.", "enum", [
      "Beige",
      "Gray",
      "Black",
      "White",
    ]),
    feature("Width", "Overall sectional width.", "number", [
      "Under 84 in",
      "Under 100 in",
      "At least 100 in",
    ], { unit: "in" }),
    feature("Orientation", "Chaise or sectional orientation.", "enum", [
      "Left-facing",
      "Right-facing",
      "Reversible",
    ]),
    feature("Material", "Main upholstery material.", "enum", [
      "Fabric",
      "Leather",
      "Performance fabric",
    ]),
    feature("Storage", "Built-in storage chaise or console.", "boolean", ["Storage"]),
    feature("Sleeper", "Converts to a bed.", "boolean", ["Sleeper"]),
  ],
  shelves: smartFeatureTemplates.shelving,
  "shoe rack": smartFeatureTemplates.shoe_storage,
  "shop vac": [
    feature("Capacity", "Tank capacity.", "number", [
      "At least 6 gal",
      "At least 12 gal",
    ], { unit: "gal" }),
    feature("Peak horsepower", "Motor power rating.", "number", [
      "At least 4 HP",
      "At least 5 HP",
    ], { unit: "HP" }),
    feature("Wet/dry", "Wet and dry pickup support.", "boolean", ["Wet/dry"]),
    feature("Cordless", "Battery-powered design.", "boolean", ["Cordless"]),
    feature("Hose diameter", "Hose diameter.", "enum", ["1.25 in", "1.875 in", "2.5 in"]),
    feature("Blower port", "Can be used as blower.", "boolean", ["Blower port"]),
  ],
  "sleeper sofa": [
    feature("Color", "Available upholstery color.", "enum", [
      "Beige",
      "Gray",
      "Black",
      "White",
    ]),
    feature("Width", "Overall sofa width.", "number", [
      "Under 64 in",
      "Under 84 in",
    ], { unit: "in" }),
    feature("Bed size", "Pull-out or sleeper mattress size.", "enum", [
      "Twin",
      "Full",
      "Queen",
    ]),
    feature("Mattress type", "Sleeper mattress construction.", "enum", [
      "Memory foam",
      "Innerspring",
      "Foam",
    ]),
    feature("Material", "Main upholstery material.", "enum", [
      "Fabric",
      "Leather",
      "Performance fabric",
    ]),
    feature("Storage", "Built-in storage.", "boolean", ["Storage"]),
  ],
  "snow blower": smartFeatureTemplates.outdoor_power,
  soundbar: smartFeatureTemplates.audio,
  speaker: smartFeatureTemplates.audio,
  stroller: smartFeatureTemplates.baby_stroller,
  tablet: smartFeatureTemplates.tablet,
  tent: [
    feature("Capacity", "Number of people the tent sleeps.", "number", [
      "2 person",
      "4 person",
      "6 person",
    ], { unit: "person" }),
    feature("Season rating", "Tent season rating.", "enum", ["3-season", "4-season"]),
    feature("Weight", "Packed tent weight.", "number", [
      "Under 5 lb",
      "Under 10 lb",
    ], { unit: "lb" }),
    feature("Waterproof rating", "Rainfly or floor waterproof rating.", "number", [
      "At least 1500 mm",
      "At least 3000 mm",
    ], { unit: "mm" }),
    feature("Instant setup", "Fast pop-up or instant setup.", "boolean", [
      "Instant setup",
    ]),
    feature("Vestibule", "Covered gear storage vestibule.", "boolean", ["Vestibule"]),
  ],
  "toaster oven": [
    feature("Capacity", "Interior cooking capacity.", "enum", [
      "4 slices",
      "6 slices",
      "Fits 12 in pizza",
    ]),
    feature("Air fry", "Air fry function.", "boolean", ["Air fry"]),
    feature("Convection", "Convection fan support.", "boolean", ["Convection"]),
    feature("Power", "Heating power.", "number", [
      "At least 1500 watts",
      "At least 1800 watts",
    ], { unit: "watts" }),
    feature("Footprint", "Countertop footprint.", "enum", ["Compact", "Full size"]),
    feature("Temperature range", "Maximum cooking temperature.", "number", [
      "At least 450 F",
      "At least 500 F",
    ], { unit: "F" }),
  ],
  "tool chest": smartFeatureTemplates.tool_storage,
  "tv stand": [
    feature("TV size support", "Maximum supported TV size.", "number", [
      "At least 55 in",
      "At least 75 in",
    ], { unit: "in" }),
    feature("Width", "Overall stand width.", "number", ["Under 60 in", "At least 70 in"], {
      unit: "in",
    }),
    feature("Storage", "Cabinets, shelves, or drawers.", "boolean", ["Storage"]),
    feature("Fireplace", "Built-in electric fireplace.", "boolean", ["Fireplace"]),
    feature("Material", "Stand material.", "enum", ["Wood", "Metal", "Glass"]),
    feature("Cable management", "Built-in cable management.", "boolean", [
      "Cable management",
    ]),
  ],
  "bed frame": [
    feature("Size", "Compatible mattress size.", "enum", [
      "Twin",
      "Full",
      "Queen",
      "King",
    ]),
    feature("Material", "Frame material.", "enum", ["Wood", "Metal", "Upholstered"]),
    feature("Storage", "Built-in drawers or under-bed storage.", "boolean", [
      "Storage",
    ]),
    feature("Headboard", "Includes a headboard.", "boolean", ["Headboard"]),
    feature("Platform", "Does not require a box spring.", "boolean", ["Platform"]),
    feature("Weight capacity", "Maximum supported weight.", "number", [
      "At least 500 lb",
      "At least 800 lb",
    ], { unit: "lb" }),
  ],
  dresser: [
    feature("Width", "Overall dresser width.", "number", [
      "Under 36 in",
      "At least 50 in",
    ], { unit: "in" }),
    feature("Drawer count", "Number of drawers.", "number", [
      "At least 4 drawers",
      "At least 6 drawers",
    ], { unit: "drawers" }),
    feature("Material", "Dresser construction material.", "enum", [
      "Solid wood",
      "Engineered wood",
      "Metal",
    ]),
    feature("Color", "Finish color.", "enum", ["White", "Black", "Natural", "Gray"]),
    feature("Tip-over restraint", "Includes wall anchor or anti-tip hardware.", "boolean", [
      "Tip-over restraint",
    ]),
    feature("Mirror included", "Includes a matching mirror.", "boolean", [
      "Mirror included",
    ]),
  ],
  "vanity chair": [
    feature("Color", "Chair color.", "enum", ["White", "Black", "Beige", "Pink"]),
    feature("Back support", "Whether the chair has a back.", "boolean", ["Has back"]),
    feature("Seat height", "Seat height from the floor.", "number", [
      "Under 20 in",
      "At least 18 in",
    ], { unit: "in" }),
    feature("Upholstery", "Seat upholstery material.", "enum", [
      "Velvet",
      "Fabric",
      "Faux leather",
    ]),
    feature("Swivel", "Whether the chair can rotate.", "boolean", ["Swivel"]),
    feature("Width", "Overall chair width.", "number", ["Under 24 in", "Under 28 in"], {
      unit: "in",
    }),
  ],
  "water filter": smartFeatureTemplates.water_filter,
  "wine fridge": smartFeatureTemplates.wine_fridge,
});

export function getFallbackSmartFeatures(category: string): SmartFeatureResponse | null {
  const key = smartFeatureCategoryKey(category);
  const features = fallbackFeaturePacks[key];

  if (!features) {
    return null;
  }

  return {
    category: key,
    features,
  };
}

export const fallbackFeatures: SmartFeatureResponse =
  getFallbackSmartFeatures("refrigerator") as SmartFeatureResponse;

export const smartFeatureSchema = z
  .object({
    id: z.string().min(1).max(60),
    name: z.string().min(1).max(40),
    description: z.string().min(1).max(180),
    type: z.enum(smartFeatureTypes),
    possibleValues: z.array(z.string().min(1).max(40)).max(12).optional(),
    operators: z.array(z.enum(smartFeatureOperators)).min(1).max(4),
    unit: z.string().max(20).optional(),
    examples: z.array(z.string().min(1).max(40)).min(2).max(5),
    commonlyImportant: z.boolean(),
  })
  .strict();

export const smartFeatureResponseSchema = z
  .object({
    category: z.string().min(1),
    features: z.array(smartFeatureSchema).min(5).max(10),
  })
  .strict();

const featureJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
    },
    name: {
      type: "string",
    },
    description: {
      type: "string",
    },
    type: {
      type: "string",
      enum: smartFeatureTypes,
    },
    possibleValues: {
      type: "array",
      items: {
        type: "string",
      },
    },
    operators: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "string",
        enum: smartFeatureOperators,
      },
    },
    unit: {
      type: "string",
    },
    examples: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    commonlyImportant: {
      type: "boolean",
    },
  },
  required: [
    "id",
    "name",
    "description",
    "type",
    "possibleValues",
    "operators",
    "unit",
    "examples",
    "commonlyImportant",
  ],
} as const;

export const smartFeatureResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: {
      type: "string",
    },
    features: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: featureJsonSchema,
    },
  },
  required: ["category", "features"],
} as const;
