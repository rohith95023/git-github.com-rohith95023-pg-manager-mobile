const fs = require('fs');
const path = require('path');

const roomsPath = path.join(__dirname, '..', 'src', 'pages', 'Rooms', 'Rooms.jsx');
const listsPath = path.join(__dirname, '..', 'src', 'pages', 'Rooms', 'RoomListComponents.jsx');

let code = fs.readFileSync(roomsPath, 'utf8');

const listStartText = '<div className="hidden md:block overflow-x-auto">';

if (!code.includes(listStartText)) {
    console.error("Could not find List bounds in Rooms.jsx!");
    process.exit(1);
}

const startIndex = code.indexOf(listStartText);
let currentIdx = startIndex;

// we need to find the `</>\n      ) : (\n        <BedsManagement` marker
const marker1 = `      ) : (\n        <BedsManagement`;
const marker2 = `      ) : (\r\n        <BedsManagement`;
let markerIndex = code.indexOf(marker1, currentIdx);
if (markerIndex === -1) markerIndex = code.indexOf(marker2, currentIdx);

if (markerIndex === -1) {
    console.log("Could not find beds management marker");
    process.exit(1);
}

// walk back to find `</div>\n        </>`
const backStr1 = `</div>\n        </>`;
const backStr2 = `</div>\r\n        </>`;

let sliceEnd = markerIndex;
const testStr = code.substring(markerIndex - 50, markerIndex);
if (testStr.includes(backStr1)) {
    sliceEnd = markerIndex - 50 + testStr.indexOf(backStr1); // up to </div> without including it
} else if (testStr.includes(backStr2)) {
    sliceEnd = markerIndex - 50 + testStr.indexOf(backStr2); // up to </div> without including it
} else {
    // maybe there's extra spaces
    sliceEnd = code.lastIndexOf('</div>', markerIndex);
}

const listRaw = code.substring(startIndex, sliceEnd);

const listsContent = `import React from "react";
import { DoorOpen, Building2, Layers, IndianRupee, Pencil, Trash2, AlertCircle } from "lucide-react";

function cn(...inputs) {
    return inputs.filter(Boolean).join(' ');
}

export const RoomListComponents = ({
    filteredRooms,
    pgs,
    isDark,
    getRoomConfig,
    handleStatusChange,
    handleEdit,
    handleDelete,
    resetForm,
    setShowModal,
    setFilterPg
}) => {
    return (
        <>
            ${listRaw}
        </>
    );
};
`;

fs.writeFileSync(listsPath, listsContent);

const newCode = code.replace(listRaw, `
                <RoomListComponents 
                    filteredRooms={filteredRooms}
                    pgs={pgs}
                    isDark={isDark}
                    getRoomConfig={getRoomConfig}
                    handleStatusChange={handleStatusChange}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    resetForm={resetForm}
                    setShowModal={setShowModal}
                    setFilterPg={setFilterPg}
                />
`);

let finalCode = newCode;
if (!finalCode.includes("import { RoomListComponents }")) {
    finalCode = finalCode.replace('import RoomFormModal from "./RoomFormModal";', 'import RoomFormModal from "./RoomFormModal";\nimport { RoomListComponents } from "./RoomListComponents";');
}

fs.writeFileSync(roomsPath, finalCode);
console.log("Lists extracted cleanly!");
