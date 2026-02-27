const fs = require('fs');
const path = require('path');

const pgsPath = path.join(__dirname, '..', 'src', 'pages', 'PGs', 'PGs.jsx');
const listPath = path.join(__dirname, '..', 'src', 'pages', 'PGs', 'PGListComponents.jsx');

let code = fs.readFileSync(pgsPath, 'utf8');

const desktopStartMarker = `{/* Desktop Table View */}`;
const desktopEndMarker = `{/* Mobile View */}`;
const mobileEndMarker = `<PGFormModal`;

const desktopStartIndex = code.indexOf(desktopStartMarker);
const desktopEndIndex = code.indexOf(desktopEndMarker, desktopStartIndex);

const mobileStartIndex = desktopEndIndex; // Start where desktop ends
const mobileEndIndex = code.indexOf(mobileEndMarker, mobileStartIndex);

if (desktopStartIndex === -1 || desktopEndIndex === -1 || mobileEndIndex === -1) {
    console.error("Could not find boundaries!", {desktopStartIndex, desktopEndIndex, mobileEndIndex});
    console.log(code.substring(code.length - 500));
    process.exit(1);
}

const desktopLogicRaw = code.substring(desktopStartIndex, desktopEndIndex);
const mobileLogicRaw = code.substring(mobileStartIndex, mobileEndIndex);

const listImports = `import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, User, Layers, TrendingUp, CreditCard, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const PGDesktopTable = ({
  displayPgs, expandedPgId, setExpandedPgId, isDark, showArchived,
  handleRestore, handleEdit, handleDelete, handleStatusChange
}) => {
  return (
    <>
      ${desktopLogicRaw}
    </>
  );
};

export const PGMobileList = ({
  displayPgs, expandedPgId, setExpandedPgId, isDark, showArchived,
  handleRestore, handleEdit, handleDelete, handleStatusChange,
  resetForm, setCurrentStep, setShowModal
}) => {
  return (
    <>
      ${mobileLogicRaw}
    </>
  );
};
`;

fs.writeFileSync(listPath, listImports);
console.log("Lists written to", listPath);

// Replace the lists body in original file
const replacementCode = `<PGDesktopTable 
        displayPgs={displayPgs}
        expandedPgId={expandedPgId}
        setExpandedPgId={setExpandedPgId}
        isDark={isDark}
        showArchived={showArchived}
        handleRestore={handleRestore}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleStatusChange={handleStatusChange}
      />
      
      <PGMobileList 
        displayPgs={displayPgs}
        expandedPgId={expandedPgId}
        setExpandedPgId={setExpandedPgId}
        isDark={isDark}
        showArchived={showArchived}
        handleRestore={handleRestore}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleStatusChange={handleStatusChange}
        resetForm={resetForm}
        setCurrentStep={setCurrentStep}
        setShowModal={setShowModal}
      />\n\n      `;

let newCode = code.replace(desktopLogicRaw + mobileLogicRaw, replacementCode);

// Add import
const importStatement = `import { PGDesktopTable, PGMobileList } from "./PGListComponents";\n`;
if (!newCode.includes(importStatement)) {
    newCode = importStatement + newCode;
}

fs.writeFileSync(pgsPath, newCode);
console.log("PGs.jsx modified!");
