const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

// Read the original template
const templatePath = path.join(__dirname, '..', 'Pogodba Lindstrom_predpražniki 2025.docx');
const outputPath = path.join(__dirname, '..', 'public', 'pogodba-template.docx');

const content = fs.readFileSync(templatePath);
const zip = new PizZip(content);

// Get document.xml
let docXml = zip.file('word/document.xml').asText();

// Replace placeholders in the document
// The structure has table cells with labels followed by empty cells for values

// Company info section - find patterns and add placeholders
// Pattern: Label in one cell, empty/value cell next to it

// 1. Stranka field - after "Stranka" cell header
docXml = docXml.replace(
  /(<w:t>Stranka<\/w:t>)/g,
  '$1'
);

// Find the table structure and add placeholders
// First table row contains: Stranka | Št. stranke | Davčna številka stranke

// Replace empty cells after labels with placeholders
// This is tricky because the XML structure is complex

// Simpler approach: Add placeholders as text after specific labels
const replacements = [
  // Header info
  { find: /<w:t>Št\. stranke<\/w:t>/g, after: '{customer_number}' },
  { find: /<w:t>Davčna številka stranke:<\/w:t>/g, after: '{tax_number}' },

  // Find "Stranka" standalone (the label for company name) - need to add placeholder in adjacent cell
  // This requires finding the table cell structure
];

// Since the structure is complex with tables, let's use a different approach
// We'll look for specific patterns in the table cells

// Find table cells and insert placeholders
// Pattern: <w:tc>...<w:t>Label</w:t>...</w:tc><w:tc>...(empty or value)...</w:tc>

// For company name after "Stranka" label - find the cell and next sibling
// The first table has structure: Stranka | Št. stranke | Davčna številka
// We need to add values UNDER these headers

// Let's try a regex approach to find table rows and add placeholders

// First, let's add a simple placeholder after each known label
// This won't be perfect but will help identify the structure

// Add company_name placeholder - find first occurrence of just "Stranka" as table header
docXml = docXml.replace(
  /(<w:tc>[\s\S]*?<w:t>Stranka<\/w:t>[\s\S]*?<\/w:tc>[\s\S]*?<w:tc>[\s\S]*?<w:t>Št\. stranke<\/w:t>)/,
  (match) => {
    // This is the header row, we need to find the data row below
    return match;
  }
);

// Different approach: Find empty cells after labels and fill them
// Looking at the structure, after labels there should be cells for data

// Let's add placeholders directly where we see patterns like:
// "Naslov za dostavo:" followed by empty cells for street, postal, city

// For the address fields
docXml = docXml.replace(
  /<w:t>Naslov za dostavo:<\/w:t>([\s\S]*?)<w:t>Poštna št<\/w:t>/,
  '<w:t>Naslov za dostavo: {delivery_address}<\/w:t>$1<w:t>Poštna št {delivery_postal}<\/w:t>'
);

docXml = docXml.replace(
  /<w:t>Naslov za račun \(v kolikor ni isti kot za dostavo\):<\/w:t>([\s\S]*?)<w:t>Poštna št<\/w:t>\s*<\/w:t>/,
  '<w:t>Naslov za račun: {billing_address}<\/w:t>$1<w:t>Poštna št {billing_postal}<\/w:t>'
);

// Contact person for billing
docXml = docXml.replace(
  /<w:t>Kontaktna oseba za obračun:<\/w:t>([\s\S]*?)<w:t>Tel\.<\/w:t>([\s\S]*?)<w:t>e-mail<\/w:t>/,
  '<w:t>Kontaktna oseba za obračun: {billing_contact_name}<\/w:t>$1<w:t>Tel. {billing_contact_phone}<\/w:t>$2<w:t>e-mail {billing_contact_email}<\/w:t>'
);

// Service start date
docXml = docXml.replace(
  /<w:t>Pričetek opravljanja storitve<\/w:t>/,
  '<w:t>Pričetek opravljanja storitve {service_start_date}<\/w:t>'
);

// Delivery instructions
docXml = docXml.replace(
  /<w:t>Navodila za dostavo<\/w:t>/,
  '<w:t>Navodila za dostavo {delivery_instructions}<\/w:t>'
);

// Working hours - replace the existing value
docXml = docXml.replace(
  /<w:t>Delovni čas 10:00-23:00<\/w:t>/,
  '<w:t>Delovni čas {working_hours}<\/w:t>'
);

// Additional info
docXml = docXml.replace(
  /<w:t>Dodatne informacije<\/w:t>/,
  '<w:t>Dodatne informacije {additional_info}<\/w:t>'
);

// Save modified document
zip.file('word/document.xml', docXml);
const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(outputPath, output);

console.log('Template prepared with placeholders at:', outputPath);
console.log('\nNote: This is a basic transformation. The template may need manual adjustment for complex table structures.');
