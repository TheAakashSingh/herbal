const fs = require('fs');
const path = require('path');

// List of EJS files to update
const ejsFiles = [
    'views/public/Products.ejs',
    'views/public/Prize.ejs',
    'views/public/How-to-Win.ejs',
    'views/public/Terms.ejs',
    'views/public/Contact.ejs',
    'views/public/Status.ejs'
];

// Navigation replacements
const navigationReplacements = [
    { from: 'href="Products.html"', to: 'href="/Products"' },
    { from: 'href="Prize.html"', to: 'href="/Prize"' },
    { from: 'href="How-to-Win.html"', to: 'href="/How-to-Win"' },
    { from: 'href="Winner-List.html"', to: 'href="/Winner-List"' },
    { from: 'href="Status.html"', to: 'href="/Status"' },
    { from: 'href="Terms.html"', to: 'href="/Terms"' },
    { from: 'href="Contact.html"', to: 'href="/Contact"' },
    { from: 'href="index-2.html"', to: 'href="/"' },
    { from: 'href="index.html"', to: 'href="/"' }
];

function updateNavigationInFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // Apply all navigation replacements
        navigationReplacements.forEach(replacement => {
            if (content.includes(replacement.from)) {
                content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
                updated = true;
            }
        });

        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated navigation links in: ${filePath}`);
        } else {
            console.log(`ℹ️  No updates needed for: ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
    }
}

// Update all EJS files
console.log('🔄 Updating navigation links in EJS templates...\n');

ejsFiles.forEach(filePath => {
    updateNavigationInFile(filePath);
});

console.log('\n✨ Navigation update complete!');
console.log('\n📝 Next steps:');
console.log('1. Run: node update-navigation.js');
console.log('2. Start the server: npm start');
console.log('3. Test the search functionality at: http://localhost:3000');
