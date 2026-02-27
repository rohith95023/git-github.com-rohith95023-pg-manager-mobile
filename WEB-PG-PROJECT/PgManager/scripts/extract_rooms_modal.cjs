const fs = require('fs');
const path = require('path');

const roomsPath = path.join(__dirname, '..', 'src', 'pages', 'Rooms', 'Rooms.jsx');
const modalPath = path.join(__dirname, '..', 'src', 'pages', 'Rooms', 'RoomFormModal.jsx');

let code = fs.readFileSync(roomsPath, 'utf8');

const modalStart = `{showModal && (`;
const modalEndMarker = `      <AnimatePresence>`;

const startIndex = code.indexOf(modalStart);
const endIndex = code.indexOf(modalEndMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find Modal bounds!");
    process.exit(1);
}

const modalRaw = code.substring(startIndex, endIndex);

const modalContent = `import React from "react";
import { DoorOpen, AlertCircle, Building2, Bed as BedIcon, X, Check } from "lucide-react";
import { cn } from "../../lib/utils"; // or handle classes gracefully
import AmountInput from "../../components/AmountInput";
import HierarchySelector from "../../components/HierarchySelector";
import { motion, AnimatePresence } from "framer-motion";

function twMergeClsx(...inputs) {
    // Basic fallback classnames handling since cn is local in Rooms.jsx initially
    return inputs.filter(Boolean).join(' ');
}

const RoomFormModal = ({
    showModal,
    setShowModal,
    isDark,
    formData,
    formErrors,
    handleInputChange,
    handleSubmit,
    isSubmitting,
    editingRoom,
    pgs,
    floorOptions,
    setHighlightPg,
    setHighlightFloor,
    getRoomConfig
}) => {
    // The cn helper from local
    const cn = (...inputs) => inputs.filter(Boolean).join(' ');

    return (
        <>
            ${modalRaw}
        </>
    );
};

export default RoomFormModal;
`;

fs.writeFileSync(modalPath, modalContent);

const newCode = code.replace(modalRaw, `
      <RoomFormModal 
          showModal={showModal}
          setShowModal={setShowModal}
          isDark={isDark}
          formData={formData}
          formErrors={formErrors}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          editingRoom={editingRoom}
          pgs={pgs}
          floorOptions={floorOptions}
          setHighlightPg={setHighlightPg}
          setHighlightFloor={setHighlightFloor}
          getRoomConfig={getRoomConfig}
      />
`);

let finalCode = newCode;
if (!finalCode.includes("import RoomFormModal")) {
    finalCode = finalCode.replace('import BedsManagement', 'import BedsManagement from "./BedsManagement";\nimport RoomFormModal from "./RoomFormModal";');
}

fs.writeFileSync(roomsPath, finalCode);
console.log("Modal extracted!");
