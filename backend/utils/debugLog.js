// backend/utils/debugLog.js

import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import stringWidth from 'string-width';

export function debugLog(title, dataObj = {}, options = {}) {
    const defaultWidth = 60;
    const entries = Object.entries(dataObj);

    // Calcular maior linha visual
    const maxContentWidth = entries.reduce((max, [key, valueObj]) => {
        const keyLabel = `${key}:`;
        const valueStr = typeof valueObj === 'object'
            ? JSON.stringify(valueObj)
            : String(valueObj);
        const visual = `${keyLabel} ${valueStr}`;
        return Math.max(max, stringWidth(visual));
    }, 0);

    const width = Math.max(defaultWidth, maxContentWidth + 4); // || + spaces + ||
    const line = '='.repeat(width);

    function formatLine(content = '') {
        const visualText = ` ${content}`;
        const visualLength = stringWidth(stripAnsi(visualText));
        const padLength = width - visualLength - 2;
        return chalk.gray(`||${visualText}${' '.repeat(padLength > 0 ? padLength : 0)}||`);
    }

    function formatCenteredTitle(text) {
        const raw = `:::::: ${text} ::::::`;
        const visibleLength = stringWidth(stripAnsi(raw));
        const totalPadding = width - visibleLength - 2;
        const left = Math.max(0, Math.floor(totalPadding / 2));
        const right = Math.max(0, totalPadding - left);
        const padded = `${' '.repeat(left)}${chalk.yellow(raw)}${' '.repeat(right)}`;
        return chalk.gray(`||`) + padded + chalk.gray(`||`);
    }

    function splitByVisualWidth(text, limit) {
        // divide por palavras para evitar corte feio
        const words = text.split(' ');
        let lines = [];
        let current = '';

        words.forEach(word => {
            const tentative = current ? current + ' ' + word : word;
            if (stringWidth(stripAnsi(tentative)) > limit) {
                if (current) lines.push(current);
                current = word;
            } else {
                current = tentative;
            }
        });
        if (current) lines.push(current);
        return lines;
    }

    console.log(chalk.greenBright(line));
    console.log(formatCenteredTitle(title));
    console.log(chalk.greenBright(line));

    entries.forEach(([key, valueObj], idx) => {
        const keyLabel = chalk.cyan(`${key}:`);
        const valueStr = typeof valueObj === 'object'
            ? JSON.stringify(valueObj)
            : String(valueObj);

        const maxWidth = width - 4;
        const keyWidth = stringWidth(stripAnsi(keyLabel)) + 1;
        const firstLineLimit = maxWidth - keyWidth;

        // Divide valueStr por palavras, respeitando largura visual
        const [firstLine, ...otherLines] = splitByVisualWidth(valueStr, firstLineLimit);
        console.log(formatLine(`${keyLabel} ${firstLine}`));
        for (const line of otherLines) {
            console.log(formatLine('  ' + line));
        }
        if (idx < entries.length - 1) {
            console.log(formatLine(''));
        }
    });

    console.log(chalk.greenBright(line));
}

export function debugSensorLog({ sensor, qtd_focos, url, origem }) {
    const data = { sensor, qtd_focos, url, origem };
    const padding = 4;
    const minWidth = 60;
    const maxWidth = 100; // ✅ LIMITE DE LARGURA VISUAL

    const lines = [];

    for (const [key, value] of Object.entries(data)) {
        const keyLabel = chalk.cyan(`${key}:`);
        const valueStr = String(value ?? '');
        const prefix = `${keyLabel} `;
        const maxContentWidth = maxWidth - padding - 2; // 2 = || ... ||

        let remaining = valueStr;
        let firstLine = true;

        while (remaining.length > 0) {
            let chunk = '';
            let width = 0;
            let i = 0;

            while (i < remaining.length && width < (firstLine ? maxContentWidth - stringWidth(stripAnsi(prefix)) : maxContentWidth)) {
                const nextChar = remaining[i];
                const testChunk = chunk + nextChar;
                width = stringWidth(testChunk);
                if (width >= (firstLine ? maxContentWidth : maxContentWidth)) break;
                chunk = testChunk;
                i++;
            }

            const lineContent = chunk;
            remaining = remaining.slice(i);

            lines.push(firstLine ? `${prefix}${lineContent}` : `  ${lineContent}`);
            firstLine = false;
        }

        lines.push('');
    }

    // Cálculo da largura real (limitado pelo maxWidth)
    const contentWidth = Math.min(
        Math.max(...lines.map(line => stringWidth(stripAnsi(line)))),
        maxWidth - padding
    );

    const boxWidth = Math.min(Math.max(minWidth, contentWidth + padding), maxWidth);
    const border = '='.repeat(boxWidth);

    function formatLine(content = '') {
        const visibleLength = stringWidth(stripAnsi(content));
        const visualText = ` ${content}`;
        const padLength = boxWidth - stringWidth(stripAnsi(visualText)) - 2;
        return chalk.gray(`||${visualText}${' '.repeat(Math.max(2, padLength))}||`);
    }

    function formatTitle(text) {
        const raw = `:::::: ${text} ::::::`;
        const visibleLength = stringWidth(stripAnsi(raw));
        const total = boxWidth - 2;
        const left = Math.floor((total - visibleLength) / 2);
        const right = total - visibleLength - left;
        return chalk.gray('||') + ' '.repeat(left) + chalk.yellow(raw) + ' '.repeat(right) + chalk.gray('||');
    }

    // Renderiza
    console.log(chalk.greenBright(border));
    console.log(formatTitle('🛰️  Sensor processado com sucesso'));
    console.log(chalk.greenBright(border));
    lines.forEach(line => console.log(formatLine(line)));
    console.log(chalk.greenBright(border));
}

export function debugJsonLog(title, dataObj = {}) {
    const padding = 4;
    const maxWidth = 100;
    const minWidth = 60;

    const lines = [];

    for (const [key, valueObj] of Object.entries(dataObj)) {
        const keyLabel = chalk.cyan(`${key}:`);

        if (
            typeof valueObj === 'object' &&
            valueObj !== null &&
            valueObj.value !== undefined
        ) {
            const arr = valueObj.value;
            const maxItems = valueObj.maxItems || arr.length;

            lines.push(`${keyLabel} (primeiros ${maxItems}):`);
            arr.slice(0, maxItems).forEach((item) => {
                const formatted = JSON.stringify(item);
                lines.push(`  ${formatted}`);
            });

            if (arr.length > maxItems) {
                lines.push(`  ...e mais ${arr.length - maxItems} itens`);
            }

        } else {
            const formatted =
                typeof valueObj === 'object'
                    ? JSON.stringify(valueObj)
                    : String(valueObj);
            lines.push(`${keyLabel} ${formatted}`);
        }

        lines.push('');
    }

    const contentWidth = Math.max(...lines.map(l => stringWidth(stripAnsi(l))));
    const boxWidth = Math.min(Math.max(minWidth, contentWidth + padding), maxWidth);
    const border = '='.repeat(boxWidth);

    function formatLine(content = '') {
        const visualText = ` ${content}`;
        const visualLength = stringWidth(stripAnsi(visualText));
        const padLength = boxWidth - visualLength - 2;
        return chalk.gray(`||${visualText}${' '.repeat(Math.max(2, padLength))}||`);
    }

    function formatTitle(text) {
        const raw = `:::::: ${text} ::::::`;
        const visibleLength = stringWidth(stripAnsi(raw));
        const totalPadding = boxWidth - visibleLength - 2;
        const left = Math.floor(totalPadding / 2);
        const right = totalPadding - left;
        const padded = `${' '.repeat(left)}${chalk.yellow(raw)}${' '.repeat(right)}`;
        return chalk.gray(`||`) + padded + chalk.gray(`||`);
    }

    console.log(chalk.greenBright(border));
    console.log(formatTitle(title));
    console.log(chalk.greenBright(border));
    lines.forEach(line => console.log(formatLine(line)));
    console.log(chalk.greenBright(border));
}

export function debugTestLog(title, dataObj = {}) {
    const rawLog = (...args) => process.stdout.write(args.join(' ') + '\n');

    const entries = Object.entries(dataObj);
    const width = 100;
    const line = '='.repeat(width);

    const formatLine = (text = '') => {
        const visualText = ` ${text}`;
        const visualLength = stringWidth(stripAnsi(visualText));
        const padLength = width - visualLength - 2;
        return chalk.gray(`||${visualText}${' '.repeat(Math.max(0, padLength))}||`);
    };

    const formatTitle = (text) => {
        const raw = `:::::: ${text} ::::::`;
        const visual = stringWidth(stripAnsi(raw));
        const pad = width - visual - 2;
        const left = Math.floor(pad / 2);
        const right = pad - left;
        return chalk.gray('||') + ' '.repeat(left) + chalk.yellow(raw) + ' '.repeat(right) + chalk.gray('||');
    };

    rawLog(chalk.greenBright(line));
    rawLog(formatTitle(title));
    rawLog(chalk.greenBright(line));

    for (const [key, val] of entries) {
        const jsonStr = JSON.stringify(val, null, 2); // <<< AQUI: EXPANDIDO
        const label = chalk.cyan(`${key}:`);

        const lines = jsonStr.split('\n');
        rawLog(formatLine(`${label} ${lines[0]}`));
        for (let i = 1; i < lines.length; i++) {
            rawLog(formatLine('  ' + lines[i]));
        }
        rawLog(formatLine(''));
    }

    rawLog(chalk.greenBright(line));
}


const rawLog = (...args) => process.env.NODE_ENV === 'test'
    ? process.stdout.write(args.join(' ') + '\n')
    : console.log(...args);
