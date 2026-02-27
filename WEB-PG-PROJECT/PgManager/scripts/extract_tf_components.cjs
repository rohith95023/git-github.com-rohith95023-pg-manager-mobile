const fs = require('fs');

const code = fs.readFileSync('src/pages/Tenants/TenantFinder.jsx', 'utf8');

// The small components
const compsStartStr = 'const SectionHeader = ({ title }) => (';
const compsStart = code.indexOf(compsStartStr);
if (compsStart > -1) {
    const compsCode = code.substring(compsStart).replace('export default TenantFinder;', '').trim();
    
    const newFile = `import React from 'react';\nimport { clsx } from 'clsx';\nimport { twMerge } from 'tailwind-merge';\n\nfunction cn(...inputs) { return twMerge(clsx(inputs)); }\n\n${compsCode}`;
    fs.writeFileSync('src/pages/Tenants/TenantFinderComponents.jsx', newFile);

    let newCode = code.substring(0, compsStart);
    // Remove cn duplication
    newCode = newCode.replace(/function cn\(\.\.\.inputs\) \{[\s\S]*?\}/, 'import { cn } from "../../lib/utils";');
    
    // add import to top
    newCode = `import { SectionHeader, InfoPill, DocCard, FinanceRow } from "./TenantFinderComponents";\n` + newCode;
    newCode += `\nexport default TenantFinder;\n`;
    
    fs.writeFileSync('src/pages/Tenants/TenantFinder.jsx', newCode);
    console.log("Small components extracted");
}
