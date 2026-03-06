const fs = require('fs');
const path = require('path');

const dbDir = 'd:\\PG PROJECT\\PG_MANAGER\\database';

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content;

    const fileName = path.basename(filePath);

    // Common SQL
    if (fileName.endsWith('.sql') || fileName.endsWith('.cql')) {
        // match: CREATE TABLE profiles ( ... role ... )
        // We want to insert gender, dob, created_at
        
        // Let's find "CREATE TABLE profiles ("
        // and find the closing ")" or the next table.
        // Or simply find `role VARCHAR(50) DEFAULT 'USER',` or something similar and replace it.

        newContent = newContent.replace(
            /(role\s+[A-Za-z0-9_-]+(?:\(\d+\))?\s*(?:DEFAULT\s*'[^']+')?(?:.*?)(?:,|(?=\n\s*\))))/im,
            `$1\n    gender VARCHAR(10),\n    dob DATE,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`
        );
        
        // Oracle might need different syntax for DATE/TIMESTAMP
        if (fileName.includes('oracle')) {
            newContent = newContent.replace(/created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            // No problem, it's pretty standard.
        }
        
        // Cassandra CQL might need different types
        if (fileName.includes('cassandra')) {
            newContent = newContent.replace(/gender VARCHAR\(10\),\n\s*dob DATE,\n\s*created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP/ig, "gender text,\n    dob date,\n    created_at timestamp");
        }

    } else if (fileName.includes('mongodb') || fileName.includes('firestore') || fileName.includes('dynamodb') || fileName.includes('couchbase')) {
        // NoSQL schema definitions usually in markdown or JS
        newContent = newContent.replace(
            /("role": ".*?"),?/ig,
            `$1,\n    "gender": "String",\n    "dob": "Date",\n    "created_at": "Timestamp"`
        );
        newContent = newContent.replace(
            /(role:\s*\{[^}]+\}),?/ig,
            `$1,\n      gender: { type: String },\n      dob: { type: Date },\n      created_at: { type: Date, default: Date.now }`
        );
    } else if (fileName.includes('neo4j') || fileName.includes('neptune')) {
        // Cypher
        newContent = newContent.replace(
            /role:\s*'USER'/ig,
            `role: 'USER', gender: 'String', dob: 'Date', created_at: 'datetime()'`
        );
    } else if (fileName.includes('elasticsearch')) {
        newContent = newContent.replace(
            /"role":\s*\{\s*"type":\s*"keyword"\s*\}/ig,
            `"role": { "type": "keyword" },
        "gender": { "type": "keyword" },
        "dob": { "type": "date" },
        "created_at": { "type": "date" }`
        );
    } else if (fileName.includes('redis') || fileName.includes('memcached')) {
        newContent = newContent.replace(
            /("role": ".*?"),?/ig,
            `$1,\n  "gender": "String",\n  "dob": "Date",\n  "created_at": "Timestamp"`
        );
    }

    // fallback for generic JSON / markdown formats
    if (newContent === content && !filePath.includes('README') && !fileName.includes('PG_MANAGER')) {
        console.log('No obvious match found in', filePath, '. Manual inspection might be needed.');
    }

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log('Updated:', filePath);
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else {
            // Ignore markdown files if needed, but some schemas are described in MD.
            // Let's process the main files.
            if(file !== 'DATABASE_SWITCH_GUIDE.md' && file !== 'README.md') {
                processFile(fullPath);
            }
        }
    }
}

traverse(dbDir);
console.log('Done!');
