const fs = require('fs');

const code = fs.readFileSync('src/pages/Tenants/TenantFinder.jsx', 'utf8');

const startStr = '{createPortal(';
let startIdx = code.indexOf(startStr);
// Skip the first createPortal which might be the ConfirmationModal? Actually looking at the file earlier, the FIRST createPortal in the return is the Resident Details Modal, and the SECOND is for ConfirmationModal.
if (startIdx === -1) {
    console.error('Could not find createPortal');
    process.exit(1);
}

// Find the matching document.body )} for the first portal
const endStr = 'document.body\n      )}';
let endIdx = code.indexOf(endStr, startIdx);
if (endIdx === -1) {
    // try different spacing
    const endStrCRLF = 'document.body\r\n      )}';
    endIdx = code.indexOf(endStrCRLF, startIdx);
    if (endIdx > -1) endIdx += endStrCRLF.length;
} else {
    endIdx += endStr.length;
}

if (endIdx === -1 || (endIdx) <= startIdx) {
    console.log("fallback matching document.body");
    const endFall = code.indexOf('document.body', startIdx);
    const bracketFall = code.indexOf(')}', endFall);
    endIdx = bracketFall + 2;
}


const modalBodyRaw = code.substring(startIdx, endIdx);

const modalFile = `import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, MapPin, X, Calendar, Building2, ChevronRight, CheckCircle2, Briefcase, Shield } from 'lucide-react';
import { SectionHeader, InfoPill, DocCard, FinanceRow } from './TenantFinderComponents';
import { cn } from '../../lib/utils'; // Adjust if wrong path

export const TenantDetailsModal = ({ selectedTenant, setSelectedTenant, isDark, syncMonthlyBalance }) => {
  return ${modalBodyRaw.replace('{createPortal(', 'createPortal(')}
};
`;

fs.writeFileSync('src/pages/Tenants/TenantDetailsModal.jsx', modalFile);

// Replace it in TenantFinder.jsx
let newCode = code.replace(modalBodyRaw, `<TenantDetailsModal 
        selectedTenant={selectedTenant} 
        setSelectedTenant={setSelectedTenant} 
        isDark={isDark} 
        syncMonthlyBalance={syncMonthlyBalance} 
      />`);

newCode = `import { TenantDetailsModal } from "./TenantDetailsModal";\n` + newCode;

fs.writeFileSync('src/pages/Tenants/TenantFinder.jsx', newCode);
console.log('Modal extracted successfully');
