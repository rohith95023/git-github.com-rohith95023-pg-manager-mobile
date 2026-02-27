const fs = require('fs');

const code = fs.readFileSync('src/pages/Tenants/TenantFinder.jsx', 'utf8');

const startStr = 'const { theme, toggleTheme } = useTheme();';
const endStr = 'fetchPGs();\n   }, []);';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr) + endStr.length;

if (startIdx === -1 || endIdx === -1) {
    console.error("Boundaries not found");
    process.exit(1);
}

const hookBody = code.substring(startIdx, endIdx);

const states = Array.from(hookBody.matchAll(/const \[([^,]+),\s*([^\]]+)\] = useState/g)).map(m => m[1]);
const setters = Array.from(hookBody.matchAll(/const \[([^,]+),\s*([^\]]+)\] = useState/g)).map(m => m[2]);

let hookFile = `import { useState, useEffect, useRef } from "react";
import { pgAPI, tenantAPI, paymentAPI } from "../../services/api";
import { supabase } from "../../lib/supabaseClient";
import { useTheme } from "../../context/ThemeContext";

export const useTenantFinder = () => {
  ${hookBody}

  return {
    theme, toggleTheme, isDark,
    ${states.join(', ')},
    ${setters.join(', ')},
    showToast,
    getMonthlyDuesInfo,
    syncMonthlyBalance,
    confirmBalanceSync,
    fetchData,
    filterSelectRef,
    PROFESSION_OPTIONS
  };
};
`;

fs.writeFileSync('src/hooks/useTenantFinder.ts', hookFile);

let newCode = code.replace(hookBody, `const {
  theme, toggleTheme, isDark,
  ${states.join(', ')},
  ${setters.join(', ')},
  showToast, getMonthlyDuesInfo, syncMonthlyBalance, confirmBalanceSync,
  fetchData, filterSelectRef, PROFESSION_OPTIONS
} = useTenantFinder();\n`);

newCode = newCode.replace('import { useTheme }', 'import { useTenantFinder } from "../../hooks/useTenantFinder";\n// useTheme is now inside hook');

fs.writeFileSync('src/pages/Tenants/TenantFinder.jsx', newCode);
console.log('useTenantFinder extracted correctly.');
