const fs = require('fs');
const path = require('path');

const pgsPath = path.join(__dirname, '..', 'src', 'pages', 'PGs', 'PGs.jsx');
const modalPath = path.join(__dirname, '..', 'src', 'pages', 'PGs', 'PGFormModal.jsx');

let code = fs.readFileSync(pgsPath, 'utf8');

const startMarker = `{/* Modern Modal */}`;
const endMarker = `{/* Side Error Notification */}`;

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries!");
    process.exit(1);
}

const modalLogicRaw = code.substring(startIndex, endIndex);

// We need to pass the props down to PGFormModal
const propsNeeded = [
  "showModal", "setShowModal", "isDark", "editingPg", "currentStep", "setCurrentStep",
  "handleSubmit", "formData", "handleInputChange", "handleBlur", "handleFocus",
  "formErrors", "AMENITIES_LIST", "handleAmenityToggle", "handleNextStep",
  "isSubmitting", "hasAttemptedProceed", "stepErrors"
];

const modalImports = `import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, X, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const PGFormModal = ({
  showModal, setShowModal, isDark, editingPg, currentStep, setCurrentStep,
  handleSubmit, formData, handleInputChange, handleBlur, handleFocus,
  formErrors, AMENITIES_LIST, handleAmenityToggle, handleNextStep,
  isSubmitting
}) => {
  return (
    <>
      ${modalLogicRaw}
    </>
  );
};
`;

fs.writeFileSync(modalPath, modalImports);
console.log("Modal written to", modalPath);

// Replace the modal body in original file
const replacementCode = `<PGFormModal 
        showModal={showModal}
        setShowModal={setShowModal}
        isDark={isDark}
        editingPg={editingPg}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        handleSubmit={handleSubmit}
        formData={formData}
        handleInputChange={handleInputChange}
        handleBlur={handleBlur}
        handleFocus={handleFocus}
        formErrors={formErrors}
        AMENITIES_LIST={AMENITIES_LIST}
        handleAmenityToggle={handleAmenityToggle}
        handleNextStep={handleNextStep}
        isSubmitting={isSubmitting}
      />
      
      `;

let newCode = code.replace(modalLogicRaw, replacementCode);

// Add import
const importStatement = `import { PGFormModal } from "./PGFormModal";\n`;
if (!newCode.includes(importStatement)) {
    newCode = importStatement + newCode;
}

fs.writeFileSync(pgsPath, newCode);
console.log("PGs.jsx modified!");
