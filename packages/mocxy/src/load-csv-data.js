import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
function findCsvFilesRecursively(dir, baseDir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return findCsvFilesRecursively(fullPath, baseDir);
        }
        if (entry.isFile() && entry.name.endsWith('.csv')) {
            const relative = path.relative(baseDir, fullPath);
            return [relative];
        }
        return [];
    });
}
function expandDottedKeys(record) {
    const result = {};
    for (const [key, value] of Object.entries(record)) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                // Laatste deel → waarde toewijzen
                if (typeof current[part] === 'object' &&
                    current[part] !== null &&
                    !Array.isArray(current[part])) {
                    console.warn(`[mocxy] Conflict: "${key}" overschrijft bestaand genest object`);
                }
                current[part] = value;
            }
            else {
                if (current[part] !== undefined &&
                    (typeof current[part] !== 'object' || current[part] === null || Array.isArray(current[part]))) {
                    console.warn(`[mocxy] Conflict: "${parts.slice(0, i + 1).join('.')}" is al als waarde toegewezen`);
                    break; // ⛔️ nesting overslaan
                }
                if (!(part in current)) {
                    current[part] = {};
                }
                current = current[part];
            }
        }
    }
    return result;
}
export function loadCsvDataAsMap(basePath) {
    const dataDir = path.join(basePath, 'data');
    const map = {};
    if (!fs.existsSync(dataDir)) {
        console.warn('[mocxy] data folder not found:', dataDir);
        return map;
    }
    const csvFiles = findCsvFilesRecursively(dataDir, dataDir);
    for (const relativePath of csvFiles) {
        const fullPath = path.join(dataDir, relativePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        try {
            const records = parse(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                cast: (value, context) => {
                    if (context.quoting) {
                        // Handle quoted JSON safely
                        const trimmed = value.trim();
                        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                            try {
                                return JSON.parse(trimmed);
                            }
                            catch {
                                return value; // fallback to raw string
                            }
                        }
                        return value; // keep as quoted string
                    }
                    // unquoted value handling
                    if (value === '')
                        return undefined;
                    if (value === 'null')
                        return null;
                    if (value === 'true')
                        return true;
                    if (value === 'false')
                        return false;
                    if (!isNaN(Number(value)))
                        return Number(value);
                    return value;
                }
            });
            // verwijder undefined-properties per record
            const cleaned = records.map((record) => {
                const result = {};
                for (const [key, value] of Object.entries(record)) {
                    if (value !== undefined) {
                        result[key] = value;
                    }
                }
                return expandDottedKeys(result);
            });
            const key = relativePath.replace(/\.csv$/, '').replace(/\\/g, '/');
            map[key] = cleaned;
        }
        catch (err) {
            console.error(`[mocxy] Error parsing ${relativePath}:`, err);
        }
    }
    return map;
}
