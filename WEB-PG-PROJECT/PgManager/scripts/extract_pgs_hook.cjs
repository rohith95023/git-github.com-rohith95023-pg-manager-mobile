const fs = require('fs');
const path = require('path');

const pgsPath = path.join(__dirname, '..', 'src', 'pages', 'PGs', 'PGs.jsx');
const hookPath = path.join(__dirname, '..', 'src', 'hooks', 'usePGs.ts');

let code = fs.readFileSync(pgsPath, 'utf8');

const startMarker = `const PGs = () => {`;
const endMarker = `if (loading) {`;

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries!");
    process.exit(1);
}

// Extract the logic inside the component before the `if (loading)` return statement
const hookLogic = code.substring(startIndex + startMarker.length, endIndex);

const returnedVars = `
  return {
    isDark, pgs, rooms, loading, setLoading, showModal, setShowModal,
    editingPg, setEditingPg, currentStep, setCurrentStep,
    searchTerm, setSearchTerm, formErrors, setFormErrors,
    isSubmitting, toast, showArchived, setShowArchived,
    statusConfirm, setStatusConfirm, archiveConfirm, setArchiveConfirm,
    restoreConfirm, setRestoreConfirm, hardDeleteConfirm, setHardDeleteConfirm,
    expandedPgId, setExpandedPgId, hasAttemptedProceed, setHasAttemptedProceed,
    formData, setFormData,
    fetchData, fetchArchived, validateField, handleBlur, handleFocus,
    showToast, handleInputChange, handleAmenityToggle, validateStep1,
    handleNextStep, validateForm, handleSubmit, resetForm, handleEdit,
    handleDelete, handleRestore, confirmRestore, confirmArchive,
    handlePermanentDelete, confirmHardDelete, handleStatusChange, confirmStatusChange,
    displayPgs, stepErrors
  };
`;

const hookImports = `
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { pgAPI, roomAPI } from "../services/api";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export const usePGs = (pgSchema) => {
`;

// Build the complete hook code
const completeHookCode = hookImports + hookLogic + returnedVars + `\n};\n`;

fs.writeFileSync(hookPath, completeHookCode);
console.log("Hook written to", hookPath);

const replacementCode = `const PGs = () => {
  const {
    isDark, pgs, rooms, loading, setLoading, showModal, setShowModal,
    editingPg, setEditingPg, currentStep, setCurrentStep,
    searchTerm, setSearchTerm, formErrors, setFormErrors,
    isSubmitting, toast, showArchived, setShowArchived,
    statusConfirm, setStatusConfirm, archiveConfirm, setArchiveConfirm,
    restoreConfirm, setRestoreConfirm, hardDeleteConfirm, setHardDeleteConfirm,
    expandedPgId, setExpandedPgId, hasAttemptedProceed, setHasAttemptedProceed,
    formData, setFormData,
    fetchData, fetchArchived, validateField, handleBlur, handleFocus,
    showToast, handleInputChange, handleAmenityToggle, validateStep1,
    handleNextStep, validateForm, handleSubmit, resetForm, handleEdit,
    handleDelete, handleRestore, confirmRestore, confirmArchive,
    handlePermanentDelete, confirmHardDelete, handleStatusChange, confirmStatusChange,
    displayPgs, stepErrors
  } = usePGs(pgSchema);

  `;

const newCode = code.substring(0, startIndex) + replacementCode + code.substring(endIndex);

// Add the import to the top
const finalCode = `import { usePGs } from "../../hooks/usePGs";\n` + newCode;

fs.writeFileSync(pgsPath, finalCode);
console.log("PGs.jsx modified!");
