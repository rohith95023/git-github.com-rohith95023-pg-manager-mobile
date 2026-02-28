/**
 * Generates a random 4-digit confirmation code for destructive actions.
 * @returns A string in the format XXXX (e.g., 8421)
 */
export const generateDeleteCode = (length: number = 4) => {
    let randomStr = '';
    for (let i = 0; i < length; i++) {
        randomStr += Math.floor(Math.random() * 10).toString();
    }
    return randomStr;
};

/**
 * Generates a confirmation string combining a provided string (e.g., PG Name) and a 3-digit code
 * @param prefix The string to prepend to the code
 * @returns A string in the format "{Prefix}{XXX}" (e.g., "Skyline123")
 */
export const generatePgDeleteCode = (prefix: string) => {
    // Strip the archive suffix if present to avoid dates in validation
    const baseName = prefix.split(" (Archived - ")[0];
    const cleanedPrefix = baseName.replace(/\s+/g, '').trim();
    return `${cleanedPrefix}${generateDeleteCode(3)}`;
};
