export function extractToolCallsFromText(text: string): { name: string; args: Record<string, any> }[] {
    const calls: { name: string; args: Record<string, any> }[] = [];
    const lines = text.split('\n');

    const regexFnStyle = /(?::|TOOL:)?\s*([a-zA-Z0-9_\-]+__?[a-zA-Z0-9_\-]+)\s*\(([^)]*)\)/;
    const regexBracketStyle = /^\[([^\]]+)\]\s+([a-zA-Z0-9_\-]+)\s*(?:\(([^)]*)\))?/;

    for (const line of lines.map(l => l.trim()).filter(Boolean)) {
        let name = '';
        let args: Record<string, any> = {};

        const matchFn = line.match(regexFnStyle);
        if (matchFn) {
            name = matchFn[1];
            args = parseArgsString(matchFn[2]);
        } else {
            const matchBracket = line.match(regexBracketStyle);
            if (matchBracket) {
                const server = matchBracket[1].trim();
                const func = matchBracket[2].trim();
                name = `${server}__${func}`;
                args = parseArgsString(matchBracket[3] || '');
            }
        }

        if (name) {
            calls.push({ name, args });
        }
    }

    return calls;
}

function parseArgsString(argsStr: string): Record<string, any> {
    const args: Record<string, any> = {};
    if (!argsStr?.trim()) return args;

    for (const pair of argsStr.split(',')) {
        const [key, val] = pair.split('=').map(s => s.trim());
        if (key) args[key] = safeJsonParse(val);
    }
    return args;
}

function safeJsonParse(value: string): any {
    if (!value) return '';
    try {
        return JSON.parse(value);
    } catch {
        return value.replace(/^['"]?(.*?)['"]?$/, '$1'); // 清理非标准引号
    }
}
