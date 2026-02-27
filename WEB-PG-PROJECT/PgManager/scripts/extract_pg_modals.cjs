const fs = require('fs');
const path = require('path');

const hookPath = path.join(__dirname, '..', 'src', 'hooks', 'usePGs.ts');
const newHookPath = path.join(__dirname, '..', 'src', 'hooks', 'usePGModals.ts');

let code = fs.readFileSync(hookPath, 'utf8');

const stateStartMarker = `const [statusConfirm, setStatusConfirm]`;
const stateEndMarker = `const [expandedPgId, setExpandedPgId]`;

const stateStartIndex = code.indexOf(stateStartMarker);
const stateEndIndex = code.indexOf(stateEndMarker, stateStartIndex);

const handlersStartMarker = `const handleDelete = async (id) => {`;
const handlersEndMarker = `const displayPgs = useMemo(() => {`;

const handlersStartIndex = code.indexOf(handlersStartMarker);
const handlersEndIndex = code.indexOf(handlersEndMarker, handlersStartIndex);

if (stateStartIndex === -1 || stateEndIndex === -1 || handlersStartIndex === -1 || handlersEndIndex === -1) {
    console.error("Could not find boundaries!");
    process.exit(1);
}

const stateRaw = code.substring(stateStartIndex, stateEndIndex);
const handlersRaw = code.substring(handlersStartIndex, handlersEndIndex);

const newHookCode = `import { useState } from "react";
import { pgAPI } from "../services/api";
import { supabase } from "../lib/supabaseClient";

export const usePGModals = (pgs: any[], rooms: any[], fetchData: () => void, showToast: (msg: string, type?: string) => void, setLoading: (b: boolean) => void) => {
  ${stateRaw}
  ${handlersRaw}
  return {
    statusConfirm, setStatusConfirm,
    archiveConfirm, setArchiveConfirm,
    restoreConfirm, setRestoreConfirm,
    hardDeleteConfirm, setHardDeleteConfirm,
    handleDelete, handleRestore, confirmRestore, confirmArchive,
    handlePermanentDelete, confirmHardDelete, handleStatusChange, confirmStatusChange
  };
};
`;

fs.writeFileSync(newHookPath, newHookCode);
console.log("Hook written to", newHookPath);

// Replace the states and handlers in original file
let newCode = code.replace(stateRaw, "");
newCode = newCode.replace(handlersRaw, "");

const importHook = `import { usePGModals } from "./usePGModals";\n`;
if (!newCode.includes(importHook)) {
    // Add import right after the first line
    newCode = importHook + newCode;
}

// Inject usePGModals inside usePGs
const injectionMarker = `const [expandedPgId, setExpandedPgId]`;
const injectionIndex = newCode.indexOf(injectionMarker);

const injectionCode = `
  const {
    statusConfirm, setStatusConfirm,
    archiveConfirm, setArchiveConfirm,
    restoreConfirm, setRestoreConfirm,
    hardDeleteConfirm, setHardDeleteConfirm,
    handleDelete, handleRestore, confirmRestore, confirmArchive,
    handlePermanentDelete, confirmHardDelete, handleStatusChange, confirmStatusChange
  } = usePGModals(pgs, rooms, fetchData, showToast, setLoading);
`;

newCode = newCode.substring(0, injectionIndex) + injectionCode + "\n  " + newCode.substring(injectionIndex);

fs.writeFileSync(hookPath, newCode);
console.log("usePGs.ts modified!");
